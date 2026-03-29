import JSZip from "jszip";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { markdownToDocxBlob } from "./exportDocx";
import { flashcardsToPptxBlob } from "./exportPptx";

// ─── study_plan.xlsx blob ─────────────────────────────────────────────────────
function planTasksToXlsxBlob(planTasks) {
  const allDates = [...new Set(
    planTasks.map((t) => t.assignedDate).filter(Boolean).sort()
  )];
  const dateToDay = {};
  allDates.forEach((d, i) => { dateToDay[d] = i + 1; });

  const rows = planTasks.map((t) => ({
    Day: t.assignedDate ? (dateToDay[t.assignedDate] ?? "") : "",
    Date: t.assignedDate || "Unscheduled",
    Topic: t.topic || "",
    Material: t.material?.title || "",
    "Time (min)": t.estimatedTime || "",
    Difficulty: t.difficulty
      ? t.difficulty.charAt(0).toUpperCase() + t.difficulty.slice(1)
      : "Medium",
    Status: t.status === "done" ? "Done" : "Pending",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto column widths
  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String(r[key] ?? "").length)) + 2,
  }));
  ws["!cols"] = colWidths;

  // Header bold
  const headers = Object.keys(rows[0] || {});
  headers.forEach((_, ci) => {
    const ref = XLSX.utils.encode_cell({ r: 0, c: ci });
    if (ws[ref]) ws[ref].s = { font: { bold: true }, alignment: { horizontal: "center" } };
  });

  // Difficulty colours
  const diffIdx = headers.indexOf("Difficulty");
  const DIFF_COLORS = { Easy: "C6EFCE", Medium: "FFEB9C", Hard: "FFC7CE" };
  rows.forEach((row, ri) => {
    const ref = XLSX.utils.encode_cell({ r: ri + 1, c: diffIdx });
    if (ws[ref]) ws[ref].s = { fill: { fgColor: { rgb: DIFF_COLORS[row.Difficulty] || "FFFFFF" } }, font: { bold: true } };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Study Plan");

  const raw = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
  return new Blob([raw], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Bundle notes, flashcards, and study plan into a single ZIP and download it.
 *
 * All parameters are optional — files are skipped if the data is missing/empty.
 *
 * @param {{
 *   materialTitle?: string,
 *   notesMarkdown?: string,          // raw markdown for notes.docx
 *   flashcardCards?: Array<{front, back}>,  // for flashcards.pptx
 *   planTasks?: Array<object>,        // for study_plan.xlsx
 * }} options
 */
export async function downloadAllAsZip({
  materialTitle = "Study Materials",
  notesMarkdown,
  flashcardCards,
  planTasks,
} = {}) {
  const zip = new JSZip();
  const folder = zip.folder("study_materials");
  let fileCount = 0;

  // ── notes.docx ──────────────────────────────────────────────────────────────
  if (notesMarkdown && notesMarkdown.trim()) {
    try {
      const blob = await markdownToDocxBlob(`${materialTitle} — Notes`, notesMarkdown);
      folder.file("notes.docx", blob);
      fileCount++;
    } catch { /* skip silently */ }
  }

  // ── study_plan.xlsx ─────────────────────────────────────────────────────────
  if (planTasks && planTasks.length > 0) {
    try {
      const blob = planTasksToXlsxBlob(planTasks);
      folder.file("study_plan.xlsx", blob);
      fileCount++;
    } catch { /* skip silently */ }
  }

  // ── flashcards.pptx ─────────────────────────────────────────────────────────
  if (flashcardCards && flashcardCards.length > 0) {
    try {
      const blob = await flashcardsToPptxBlob(flashcardCards);
      folder.file("flashcards.pptx", blob);
      fileCount++;
    } catch { /* skip silently */ }
  }

  if (fileCount === 0) throw new Error("No content available to download.");

  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, "study_materials.zip");
}
