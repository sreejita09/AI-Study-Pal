import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  convertInchesToTwip,
} from "docx";
import { saveAs } from "file-saver";

// ── Markdown → structured data ────────────────────────────────────────────────
// Converts AI-generated markdown into the {title, sections} shape expected
// by buildDocxBlob. Strips ** bold markers so they don't pollute the text.
export function markdownToStructured(title, markdown) {
  const sections = [];
  let current = null;

  for (const raw of (markdown || "").split("\n")) {
    const line = raw.trimEnd();
    const headingMatch = line.match(/^#{1,3}\s+(.+)/);
    const bulletMatch  = line.match(/^[-*]\s+(.+)/);

    if (headingMatch) {
      current = { heading: headingMatch[1].replace(/\*\*/g, "").trim(), points: [] };
      sections.push(current);
    } else if (bulletMatch) {
      if (!current) { current = { heading: "", points: [] }; sections.push(current); }
      current.points.push(bulletMatch[1].replace(/\*\*/g, "").trim());
    } else if (line.trim() && !line.startsWith("#")) {
      if (!current) { current = { heading: "", points: [] }; sections.push(current); }
      current.points.push(line.trim().replace(/\*\*/g, ""));
    }
  }

  return {
    title,
    sections: sections.filter((s) => s.heading || s.points.length > 0),
  };
}

// ── Internal blob builder (no download — used by exportZip) ──────────────────
export async function buildDocxBlob(data) {
  const { title = "Notes", sections = [] } = data;
  const children = [];

  // Document title
  children.push(
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 48, color: "1a1a2e" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Separator line
  children.push(
    new Paragraph({
      border: { bottom: { style: "single", size: 6, color: "4f46e5", space: 1 } },
      spacing: { after: 300 },
    })
  );

  for (const section of sections) {
    // Section heading
    if (section.heading) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: section.heading, bold: true, size: 32 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 320, after: 140 },
        })
      );
    }

    // Bullet points
    for (const point of section.points || []) {
      if (!point || !String(point).trim()) continue;
      children.push(
        new Paragraph({
          children: [new TextRun({ text: String(point).trim() })],
          bullet: { level: 0 },
          spacing: { after: 80 },
        })
      );
    }

    // Spacing between sections
    children.push(new Paragraph({ spacing: { after: 200 } }));
  }

  // Fallback when no real content exists
  if (children.length <= 2) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "No content available.", italics: true, color: "888888" }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top:    convertInchesToTwip(1),
              right:  convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left:   convertInchesToTwip(1),
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

// ── Public export function ────────────────────────────────────────────────────
/**
 * Export structured notes as a Word (.docx) file.
 *
 * @param {{ title: string, sections: Array<{ heading: string, points: string[] }> }} data
 * @returns {Promise<Blob|null>}
 */
export async function exportDocx(data) {
  if (!data || !data.sections || data.sections.length === 0) {
    alert("No data to export");
    return null;
  }

  try {
    const blob = await buildDocxBlob(data);
    const safeName = (data.title || "notes").replace(/[^\w\s\-]/gi, "_");
    saveAs(blob, `${safeName}.docx`);
    return blob;
  } catch (err) {
    console.error("[exportDocx]", err);
    alert("Export failed. Try again.");
    return null;
  }
}
