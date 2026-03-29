import JSZip from "jszip";
import { saveAs } from "file-saver";
import { buildDocxBlob } from "./exportDocx";
import { buildExcelBlob } from "./exportExcel";
import { buildPptx } from "./exportPpt";

// ── Public export function ────────────────────────────────────────────────────
/**
 * Bundle notes, study plan, and flashcards into a single ZIP file and
 * download it. Each file is only included when data is present.
 *
 * @param {{
 *   notes?:  { title: string, sections: Array<{ heading: string, points: string[] }> },
 *   plan?:   Array<{ day, date, topic, material, time, difficulty, status }>,
 *   cards?:  Array<{ front: string, back: string }>,
 * }} options
 * @returns {Promise<void>}
 */
export async function exportZip({ notes, plan, cards } = {}) {
  const hasNotes = notes && notes.sections && notes.sections.length > 0;
  const hasPlan  = plan  && plan.length > 0;
  const hasCards = cards && cards.length > 0;

  if (!hasNotes && !hasPlan && !hasCards) {
    alert("No data to export");
    return;
  }

  try {
    const zip = new JSZip();

    // ── notes.docx ──────────────────────────────────────────────────────────
    if (hasNotes) {
      const docBlob = await buildDocxBlob(notes);
      zip.file("notes.docx", docBlob);
    }

    // ── study_plan.xlsx ─────────────────────────────────────────────────────
    if (hasPlan) {
      const { blob: excelBlob } = buildExcelBlob(plan);
      zip.file("study_plan.xlsx", excelBlob);
    }

    // ── flashcards.pptx ─────────────────────────────────────────────────────
    if (hasCards) {
      const pptx    = buildPptx(cards);
      const pptBlob = await pptx.write({ outputType: "blob" });
      zip.file("flashcards.pptx", pptBlob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "study_materials.zip");
  } catch (err) {
    console.error("[exportZip]", err);
    alert("Export failed. Try again.");
  }
}
