import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  convertInchesToTwip,
  TableOfContents,
  LevelFormat,
  NumberFormat,
} from "docx";
import { saveAs } from "file-saver";

// ─── Inline bold parser ────────────────────────────────────────────────────
function parseInlineRuns(text) {
  const runs = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
    } else if (part) {
      runs.push(new TextRun({ text: part }));
    }
  }
  return runs.length > 0 ? runs : [new TextRun({ text: text })];
}

// ─── Markdown → structured paragraphs ─────────────────────────────────────
function markdownToParagraphs(title, markdownText) {
  const lines = markdownText.split("\n");
  const paragraphs = [];

  // Document title
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 52, color: "1a1a2e" })],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Horizontal rule after title (thin border paragraph)
  paragraphs.push(
    new Paragraph({
      border: { bottom: { style: "single", size: 6, color: "4f46e5", space: 1 } },
      spacing: { after: 300 },
    })
  );

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      // Empty spacer
      paragraphs.push(new Paragraph({ spacing: { after: 80 } }));
      continue;
    }

    if (trimmed.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed.slice(2), bold: true, size: 36, color: "1e1b4b" })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 360, after: 160 },
        })
      );
    } else if (trimmed.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed.slice(3), bold: true, size: 28, color: "312e81" })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 120 },
          border: { bottom: { style: "single", size: 2, color: "c7d2fe", space: 1 } },
        })
      );
    } else if (trimmed.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed.slice(4), bold: true, size: 24, color: "4338ca" })],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 80 },
        })
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      paragraphs.push(
        new Paragraph({
          children: parseInlineRuns(trimmed.slice(2)),
          bullet: { level: 0 },
          spacing: { after: 80 },
          indent: { left: convertInchesToTwip(0.25) },
        })
      );
    } else if (trimmed.match(/^\d+\.\s/)) {
      paragraphs.push(
        new Paragraph({
          children: parseInlineRuns(trimmed.replace(/^\d+\.\s/, "")),
          numbering: { reference: "default-numbering", level: 0 },
          spacing: { after: 80 },
          indent: { left: convertInchesToTwip(0.25) },
        })
      );
    } else if (trimmed.startsWith("> ")) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed.slice(2), italics: true, color: "6b7280" })],
          spacing: { after: 100, before: 100 },
          indent: { left: convertInchesToTwip(0.4) },
          border: { left: { style: "single", size: 12, color: "6366f1", space: 8 } },
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          children: parseInlineRuns(trimmed),
          spacing: { after: 120 },
        })
      );
    }
  }

  return paragraphs;
}

// ─── Structured data → paragraphs ─────────────────────────────────────────
function structuredToParagraphs(data) {
  const { title, sections } = data;
  const paragraphs = [];

  // Title
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 52, color: "1a1a2e" })],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  paragraphs.push(
    new Paragraph({
      border: { bottom: { style: "single", size: 6, color: "4f46e5", space: 1 } },
      spacing: { after: 300 },
    })
  );

  for (const section of sections) {
    if (section.heading) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: section.heading, bold: true, size: 28, color: "312e81" })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 120 },
          border: { bottom: { style: "single", size: 2, color: "c7d2fe", space: 1 } },
        })
      );
    }

    for (const point of section.points || []) {
      paragraphs.push(
        new Paragraph({
          children: parseInlineRuns(point),
          bullet: { level: 0 },
          spacing: { after: 80 },
          indent: { left: convertInchesToTwip(0.25) },
        })
      );
    }

    // Section spacer
    paragraphs.push(new Paragraph({ spacing: { after: 160 } }));
  }

  return paragraphs;
}

// ─── Build and save DOCX ──────────────────────────────────────────────────
function buildDocument(paragraphs) {
  return new Document({
    numbering: {
      config: [
        {
          reference: "default-numbering",
          levels: [
            {
              level: 0,
              format: NumberFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: convertInchesToTwip(0.25), hanging: convertInchesToTwip(0.25) } },
              },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22, color: "1f2937" },
          paragraph: { spacing: { line: 276 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
            },
          },
        },
        children: paragraphs,
      },
    ],
  });
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Export structured data to .docx
 * @param {{ title: string, sections: Array<{ heading: string, points: string[] }> }} data
 * @param {string} [filename]
 */
export async function exportToDocx(data, filename) {
  const paragraphs = structuredToParagraphs(data);
  const doc = buildDocument(paragraphs);
  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename || `${data.title || "document"}.docx`);
}

/**
 * Return a Blob of a markdown string exported as .docx (no download side‑effect).
 * @param {string} title
 * @param {string} markdown
 * @returns {Promise<Blob>}
 */
export async function markdownToDocxBlob(title, markdown) {
  const paragraphs = markdownToParagraphs(title, markdown);
  const doc = buildDocument(paragraphs);
  return Packer.toBlob(doc);
}

/**
 * Export raw markdown string to .docx
 * @param {string} title  Document title shown at top
 * @param {string} markdown  Raw markdown content
 * @param {string} [filename]
 */
export async function exportMarkdownAsDocx(title, markdown, filename) {
  const paragraphs = markdownToParagraphs(title, markdown);
  const doc = buildDocument(paragraphs);
  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename || `${title || "document"}.docx`);
}
