import PptxGenJS from "pptxgenjs";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bgQuestion: "1a1a2e",
  bgAnswer:   "16213e",
  accent:     "6366f1",
  white:      "ffffff",
  muted:      "a5b4fc",
};

// ── Internal pptx builder (no download — used by exportZip) ──────────────────
/**
 * Build and return a PptxGenJS instance loaded with all flashcard slides.
 * Call `.writeFile()` to download or `.write({ outputType: "blob" })` for ZIP.
 *
 * @param {Array<{ front: string, back: string }>} cards
 * @returns {PptxGenJS}
 */
export function buildPptx(cards) {
  const pptx  = new PptxGenJS();
  pptx.layout  = "LAYOUT_WIDE"; // 13.33" × 7.5"
  pptx.author  = "AI Study Pal";
  pptx.subject = "Flashcards";

  const total = cards.length;

  cards.forEach((card, i) => {
    const addSlide = (bg, label, body) => {
      const slide = pptx.addSlide();
      slide.background = { color: bg };

      // Top accent bar
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: "100%", h: 0.06,
        fill: { color: C.accent },
        line: { color: C.accent },
      });

      // Label (QUESTION / ANSWER)
      slide.addText(label, {
        x: 0.5, y: 0.22, w: "90%", h: 0.45,
        fontSize:    12,
        bold:        true,
        color:       C.muted,
        align:       "center",
        charSpacing: 3,
      });

      // Main body — centered vertically
      slide.addText(body || "", {
        x: 0.5, y: 1.1, w: 12.33, h: 5.2,
        fontSize:  24,
        bold:      true,
        color:     C.white,
        align:     "center",
        valign:    "middle",
        wrap:      true,
        isTextBox: true,
      });

      // Card counter
      slide.addText(`${i + 1} / ${total}`, {
        x: 0.5, y: 7.05, w: "90%", h: 0.3,
        fontSize: 10,
        color:    C.accent,
        align:    "center",
      });

      // Bottom accent bar
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 7.44, w: "100%", h: 0.06,
        fill: { color: C.accent },
        line: { color: C.accent },
      });
    };

    addSlide(C.bgQuestion, "QUESTION", card.front);
    addSlide(C.bgAnswer,   "ANSWER",   card.back);
  });

  return pptx;
}

// ── Public export function ────────────────────────────────────────────────────
/**
 * Export flashcards as a PowerPoint (.pptx) file.
 * Each card produces 2 slides: Question then Answer.
 *
 * @param {Array<{ front: string, back: string }>} cards
 * @returns {Promise<void>}
 */
export async function exportPpt(cards) {
  if (!cards || cards.length === 0) {
    alert("No data to export");
    return;
  }

  try {
    const pptx = buildPptx(cards);
    await pptx.writeFile({ fileName: "flashcards.pptx" });
  } catch (err) {
    console.error("[exportPpt]", err);
    alert("Export failed. Try again.");
  }
}
