import * as XLSX from "xlsx";

// ── Internal blob builder (no download — used by exportZip) ──────────────────
/**
 * Convert plan rows to an xlsx Blob without triggering a download.
 *
 * @param {Array<{ day, date, topic, material, time, difficulty, status }>} data
 * @returns {{ wb: object, blob: Blob }}
 */
export function buildExcelBlob(data) {
  const rows = data.map((row) => ({
    Day:          row.day        ?? "",
    Date:         row.date       ?? "Unscheduled",
    Topic:        row.topic      ?? "",
    Material:     row.material   ?? "",
    "Time (min)": row.time       ?? "",
    Difficulty:   row.difficulty
      ? String(row.difficulty).charAt(0).toUpperCase() + String(row.difficulty).slice(1)
      : "Medium",
    Status:       row.status === "done" ? "Done" : "Pending",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto column widths
  const headers = Object.keys(rows[0] || {});
  ws["!cols"] = headers.map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String(r[key] ?? "").length)) + 2,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Study Plan");

  const buf  = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  return { wb, blob };
}

// ── Public export function ────────────────────────────────────────────────────
/**
 * Export study plan rows as an Excel (.xlsx) file.
 *
 * @param {Array<{ day, date, topic, material, time, difficulty, status }>} data
 * @returns {Promise<Blob|null>}
 */
export async function exportExcel(data) {
  if (!data || data.length === 0) {
    alert("No data to export");
    return null;
  }

  try {
    const { wb, blob } = buildExcelBlob(data);
    XLSX.writeFile(wb, "study_plan.xlsx");
    return blob;
  } catch (err) {
    console.error("[exportExcel]", err);
    alert("Export failed. Try again.");
    return null;
  }
}
