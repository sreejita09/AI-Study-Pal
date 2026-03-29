import PptxGenJS from "pptxgenjs";

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG_DARK      = "1a1a2e";   // slide background
const BG_ANSWER    = "16213e";   // slightly different for answer slides
const ACCENT       = "6366f1";   // indigo accent line
const TEXT_PRIMARY = "ffffff";
const TEXT_MUTED   = "a5b4fc";   // muted indigo for labels

const FONT_FACE    = "Calibri";

// ─── Shared helpers ───────────────────────────────────────────────────────────
function addSlide(pptx, { bg, label, labelColor, body }) {
  const slide = pptx.addSlide();

  // Background fill
  slide.background = { color: bg };

  // Top accent bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: "100%", h: 0.06,
    fill: { color: ACCENT },
    line: { color: ACCENT },
  });

  // Card label (e.g. "QUESTION" / "ANSWER") — top-left badge
  slide.addText(label, {
    x: 0.4, y: 0.18, w: 2, h: 0.38,
    fontSize: 10,
    bold: true,
    color: labelColor,
    fontFace: FONT_FACE,
    align: "left",
    charSpacing: 3,
  });

  // Main body text — centered vertically and horizontally
  slide.addText(body, {
    x: 0.6, y: 1.2, w: 8.8, h: 4.5,
    fontSize: 32,
    bold: true,
    color: TEXT_PRIMARY,
    fontFace: FONT_FACE,
    align: "center",
    valign: "middle",
    wrap: true,
    isTextBox: true,
  });

  // Bottom accent bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 7.44, w: "100%", h: 0.06,
    fill: { color: ACCENT },
    line: { color: ACCENT },
  });

  return slide;
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Export an array of flashcards to a .pptx file.
 * Each card produces 2 slides: Question → Answer.
 *
 * @param {Array<{ front: string, back: string }>} cards
 * @param {string} [filename]  defaults to "flashcards.pptx"
 */
export async function exportFlashcardsPptx(cards, filename = "flashcards.pptx") {
  if (!cards || cards.length === 0) throw new Error("No flashcards to export.");

  const pptx = new PptxGenJS();

  // Presentation metadata
  pptx.layout  = "LAYOUT_WIDE";   // 13.33" × 7.5"
  pptx.author  = "AI Study Pal";
  pptx.subject = "Flashcards";

  cards.forEach((card, i) => {
    // ── Question slide ──────────────────────────────
    addSlide(pptx, {
      bg: BG_DARK,
      label: `CARD ${i + 1} OF ${cards.length}  ·  QUESTION`,
      labelColor: TEXT_MUTED,
      body: card.front || "",
    });

    // ── Answer slide ────────────────────────────────
    addSlide(pptx, {
      bg: BG_ANSWER,
      label: `CARD ${i + 1} OF ${cards.length}  ·  ANSWER`,
      labelColor: ACCENT,
      body: card.back || "",
    });
  });

  await pptx.writeFile({ fileName: filename });
}

/**
 * Return a Blob of flashcards as .pptx (no download side-effect).
 * @param {Array<{ front: string, back: string }>} cards
 * @returns {Promise<Blob>}
 */
export async function flashcardsToPptxBlob(cards) {
  if (!cards || cards.length === 0) throw new Error("No flashcards to export.");

  const pptx = new PptxGenJS();
  pptx.layout  = "LAYOUT_WIDE";
  pptx.author  = "AI Study Pal";
  pptx.subject = "Flashcards";

  cards.forEach((card, i) => {
    addSlide(pptx, {
      bg: BG_DARK,
      label: `CARD ${i + 1} OF ${cards.length}  ·  QUESTION`,
      labelColor: TEXT_MUTED,
      body: card.front || "",
    });
    addSlide(pptx, {
      bg: BG_ANSWER,
      label: `CARD ${i + 1} OF ${cards.length}  ·  ANSWER`,
      labelColor: ACCENT,
      body: card.back || "",
    });
  });

  return pptx.write({ outputType: "blob" });
}
