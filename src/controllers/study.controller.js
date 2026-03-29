const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const asyncHandler = require("../utils/asyncHandler");
const Material = require("../models/Material");
const Upload = require("../models/Upload");
const OpenAI = require("openai");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const STUDY_PROMPTS = {
  summary: (text) => `Summarize this study material concisely:
- Short bullet points with section headings
- Bold key terms
- Keep it exam-revision friendly

Content (first 10000 chars):
${text.slice(0, 10000)}`,

  notes: (text) => `Create detailed study notes from this material:
- Clear headings and sub-headings
- Short explanations (2-3 lines each)
- Highlight key terms in **bold**
- Include examples and tips

Content (first 10000 chars):
${text.slice(0, 10000)}`,

  flashcards: (text) => `Generate 10 flashcards from this study material. Return ONLY a valid JSON array:
[{"front": "Question or term", "back": "Answer or definition"}, ...]

Rules:
- Cover key concepts, definitions, and important facts
- Front should be a question or key term
- Back should be a concise answer or definition
- Make them useful for quick revision

Content (first 8000 chars):
${text.slice(0, 8000)}`,

  quiz: (text) => `Generate 5 MCQ questions from this study material. Return ONLY a valid JSON array:
[{"question": "...", "options": ["A", "B", "C", "D"], "answer": "Exact correct option text", "explanation": "Short why"}, ...]

Rules:
- All 4 options must be plausible
- Only 1 correct answer
- "answer" must exactly match one option
- Test different concepts

Content (first 8000 chars):
${text.slice(0, 8000)}`,
};

/**
 * POST /api/study/generate
 * Body: { materialId, type: "summary"|"notes"|"flashcards"|"quiz" }
 * Generates content for a material, caches in material.generatedContent
 */
const generateStudyContent = asyncHandler(async (req, res) => {
  const { materialId, type } = req.body;

  if (!materialId || !type) {
    return res.status(400).json({ error: "materialId and type are required." });
  }
  if (!["summary", "notes", "flashcards", "quiz"].includes(type)) {
    return res.status(400).json({ error: "Type must be summary, notes, flashcards, or quiz." });
  }

  const material = await Material.findOne({ _id: materialId, user: req.user._id });
  if (!material) return res.status(404).json({ error: "Material not found." });

  // Check cache
  const cached = material.generatedContent.find((c) => c.type === type);
  if (cached) {
    return res.json({ type, content: cached.content, cached: true, materialId });
  }

  if (!material.extractedText || material.extractedText.trim().length < 20) {
    // Try to re-extract from the stored upload file (fixes materials uploaded with broken pdf-parse)
    let reExtracted = "";
    if (material.upload) {
      try {
        const upload = await Upload.findById(material.upload);
        if (upload && upload.path && fs.existsSync(upload.path)) {
          if (upload.mimeType === "application/pdf") {
            const buf = fs.readFileSync(upload.path);
            const result = await pdfParse(buf);
            reExtracted = (result.text || "").replace(/\s{3,}/g, "\n").trim();
          } else {
            reExtracted = fs.readFileSync(upload.path, "utf-8").trim();
          }
          if (reExtracted.length >= 20) {
            material.extractedText = reExtracted;
            await material.save();
            console.log(`[study] Re-extracted text for material ${material._id}, length: ${reExtracted.length}`);
          }
        }
      } catch (reErr) {
        console.error("[study] Re-extraction failed:", reErr.message);
      }
    }
    if (reExtracted.length < 20) {
      return res.status(400).json({ error: "This material has no text content. Please delete it and re-upload the file." });
    }
  }

  try {
    const prompt = STUDY_PROMPTS[type](material.extractedText);
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    let content = response.choices[0].message.content;

    // Parse JSON for flashcards and quiz
    if (type === "flashcards" || type === "quiz") {
      try {
        const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        content = cleaned; // Store as string, parse on frontend
      } catch { /* keep raw */ }
    }

    // Cache in material
    material.generatedContent.push({ type, content });
    await material.save();

    res.json({ type, content, cached: false, materialId });
  } catch (err) {
    console.error(`Study content generation [${type}] failed:`, err.message);
    res.status(500).json({ error: "Failed to generate content. Try again." });
  }
});

/**
 * GET /api/study/content/:materialId
 * Get all generated content for a material.
 */
const getStudyContent = asyncHandler(async (req, res) => {
  const material = await Material.findOne({
    _id: req.params.materialId,
    user: req.user._id,
  }).select("title generatedContent");

  if (!material) return res.status(404).json({ error: "Material not found." });

  const contentMap = {};
  for (const c of material.generatedContent) {
    contentMap[c.type] = c.content;
  }

  res.json({ materialId: material._id, title: material.title, content: contentMap });
});

/**
 * DELETE /api/study/content/:materialId/:type
 * Regenerate: delete cached content so next generate call is fresh.
 */
const clearStudyContent = asyncHandler(async (req, res) => {
  const { materialId, type } = req.params;
  const material = await Material.findOne({ _id: materialId, user: req.user._id });
  if (!material) return res.status(404).json({ error: "Material not found." });

  material.generatedContent = material.generatedContent.filter((c) => c.type !== type);
  await material.save();

  res.json({ message: `${type} content cleared.` });
});

module.exports = { generateStudyContent, getStudyContent, clearStudyContent };
