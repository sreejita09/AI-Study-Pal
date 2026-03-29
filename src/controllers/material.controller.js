const asyncHandler = require("../utils/asyncHandler");
const Material = require("../models/Material");
const Plan = require("../models/Plan");
const Task = require("../models/Task");
const OpenAI = require("openai");
const { assignDifficulties, chunkTextIntoTopics, detectDifficulty, extractTopics } = require("../services/difficulty.service");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/materials/process
 * Takes { title, fileType, subject, extractedText } and runs AI topic extraction.
 * Called after upload or paste — the frontend sends the already-extracted text.
 */
const processMaterial = asyncHandler(async (req, res) => {
  const { title, fileType, subject, extractedText, uploadId } = req.body;

  console.log("[processMaterial] title:", title, "| textLen:", (extractedText || "").trim().length);

  if (!title) {
    return res.status(400).json({ error: "Title is required." });
  }

  const text = (extractedText || "").trim();
  const hasContent = text.length >= 20;

  // AI topic extraction
  let extractedTopics = [];
  let totalEstimatedMinutes = 0;

  if (!hasContent) {
    // No text available — create structured placeholder topics
    console.log("[processMaterial] No content — creating placeholder topics for:", title);
    extractedTopics = [
      { name: `Introduction: ${title}`, estimatedMinutes: 20 },
      { name: `Core Concepts: ${title}`, estimatedMinutes: 30 },
      { name: `Review & Practice: ${title}`, estimatedMinutes: 25 },
    ];
    totalEstimatedMinutes = 75;
  } else {
  // Local topic extraction (used as fallback if AI fails)
  const localTopics = extractTopics(text, title);
  console.log("[processMaterial] Local extractTopics found:", localTopics.length, "topics");
  try {
    const prompt = `Analyze this study material and extract the main topics/sections.
For each topic, estimate study time and assign a difficulty level.

Return ONLY a valid JSON array:
[{ "name": "Topic Name", "estimatedMinutes": 30, "difficulty": "medium" }, ...]

Rules:
- Extract 3-10 topics depending on content length
- Minimum 10 minutes, maximum 120 minutes per topic
- difficulty must be exactly one of: "easy", "medium", "hard"
- easy = introductory/definitional; hard = dense/technical/mathematical
- Be specific with topic names (not generic like "Introduction")
- Base time estimates on content density and complexity

Content (first 8000 chars):
${text.slice(0, 8000)}`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.choices[0].message.content;
    const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    extractedTopics = JSON.parse(cleaned);

    if (!Array.isArray(extractedTopics)) extractedTopics = [];

    // Normalize: clamp values and fill any missing difficulty
    const VALID_DIFF = new Set(["easy", "medium", "hard"]);
    extractedTopics = extractedTopics.map((t) => ({
      name: String(t.name || "Unnamed Topic").trim(),
      estimatedMinutes: Math.max(10, Math.min(120, Number(t.estimatedMinutes) || 30)),
      difficulty: VALID_DIFF.has(t.difficulty) ? t.difficulty : detectDifficulty(t.name, t.estimatedMinutes),
    }));

    totalEstimatedMinutes = extractedTopics.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  } catch (err) {
    console.error("AI topic extraction failed, using local extractTopics fallback:", err.message);
    // Fallback: use local topic extraction
    extractedTopics = localTopics;
    totalEstimatedMinutes = extractedTopics.reduce((sum, t) => sum + t.estimatedMinutes, 0);
    console.log("[processMaterial] Fallback extractedTopics:", extractedTopics.length);
  }
  }

  // Ensure all topics have difficulty (catches any missed by AI or fallback)
  extractedTopics = assignDifficulties(extractedTopics);

  // Enforce minimum: never store an empty topics array
  if (extractedTopics.length === 0) {
    extractedTopics = extractTopics(text || title, title);
    totalEstimatedMinutes = extractedTopics.reduce((s, t) => s + t.estimatedMinutes, 0);
    console.log("[processMaterial] Final safety fallback — extractTopics produced:", extractedTopics.length);
  }

  console.log("Topics created:", extractedTopics.length);
  console.log(extractedTopics);

  const material = await Material.create({
    user: req.user._id,
    upload: uploadId || undefined,
    title: title.trim(),
    fileType: fileType || "pdf",
    subject: (subject || "").trim(),
    extractedText: text,
    extractedTopics,
    totalEstimatedMinutes,
  });

  console.log("[processMaterial] Created material:", material._id, "| topics:", material.extractedTopics.length, "| totalMins:", material.totalEstimatedMinutes);

  res.status(201).json({
    material: {
      _id: material._id,
      title: material.title,
      fileType: material.fileType,
      subject: material.subject,
      extractedTopics: material.extractedTopics,
      totalEstimatedMinutes: material.totalEstimatedMinutes,
      createdAt: material.createdAt,
    },
  });
});

/**
 * GET /api/materials
 * List all materials for the current user (without full text).
 */
const listMaterials = asyncHandler(async (req, res) => {
  const materials = await Material.find({ user: req.user._id })
    .select("-extractedText")
    .sort({ createdAt: -1 });
  res.json({ materials });
});

/**
 * GET /api/materials/:id
 * Get single material with topics.
 */
const getMaterial = asyncHandler(async (req, res) => {
  const material = await Material.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).select("-extractedText");
  if (!material) return res.status(404).json({ error: "Material not found" });
  res.json({ material });
});

/**
 * POST /api/materials/:id/reprocess
 * Re-run AI topic extraction on an existing material's stored text.
 */
const reprocessMaterial = asyncHandler(async (req, res) => {
  const material = await Material.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!material) return res.status(404).json({ error: "Material not found" });

  const text = (material.extractedText || "").trim();
  const hasContent = text.length >= 20;

  let extractedTopics = [];
  let totalEstimatedMinutes = 0;

  if (!hasContent) {
    extractedTopics = [
      { name: `Introduction: ${material.title}`, estimatedMinutes: 20, difficulty: "easy" },
      { name: `Core Concepts: ${material.title}`, estimatedMinutes: 30, difficulty: "medium" },
      { name: `Review & Practice: ${material.title}`, estimatedMinutes: 25, difficulty: "easy" },
    ];
    totalEstimatedMinutes = 75;
  } else {
    const localTopics = extractTopics(text, material.title);
    try {
      const prompt = `Analyze this study material and extract the main topics/sections.
For each topic, estimate study time and assign a difficulty level.

Return ONLY a valid JSON array:
[{ "name": "Topic Name", "estimatedMinutes": 30, "difficulty": "medium" }, ...]

Rules:
- Extract 3-10 topics depending on content length
- Minimum 10 minutes, maximum 120 minutes per topic
- difficulty must be exactly one of: "easy", "medium", "hard"
- easy = introductory/definitional; hard = dense/technical/mathematical
- Be specific with topic names (not generic like "Introduction")
- Base time estimates on content density and complexity

Content (first 8000 chars):
${text.slice(0, 8000)}`;

      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      const raw = response.choices[0].message.content;
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      extractedTopics = JSON.parse(cleaned);
      if (!Array.isArray(extractedTopics)) extractedTopics = [];

      const VALID_DIFF = new Set(["easy", "medium", "hard"]);
      extractedTopics = extractedTopics.map((t) => ({
        name: String(t.name || "Unnamed Topic").trim(),
        estimatedMinutes: Math.max(10, Math.min(120, Number(t.estimatedMinutes) || 30)),
        difficulty: VALID_DIFF.has(t.difficulty) ? t.difficulty : detectDifficulty(t.name, t.estimatedMinutes),
      }));
      totalEstimatedMinutes = extractedTopics.reduce((sum, t) => sum + t.estimatedMinutes, 0);
    } catch (err) {
      console.error("[reprocess] AI failed, using local fallback:", err.message);
      extractedTopics = localTopics;
      totalEstimatedMinutes = extractedTopics.reduce((sum, t) => sum + t.estimatedMinutes, 0);
    }
  }

  extractedTopics = assignDifficulties(extractedTopics);

  if (extractedTopics.length === 0) {
    extractedTopics = extractTopics(text || material.title, material.title);
    totalEstimatedMinutes = extractedTopics.reduce((s, t) => s + t.estimatedMinutes, 0);
  }

  material.extractedTopics = extractedTopics;
  material.totalEstimatedMinutes = totalEstimatedMinutes;
  await material.save();

  console.log("[reprocess] Updated material:", material._id, "| topics:", extractedTopics.length);

  res.json({
    material: {
      _id: material._id,
      title: material.title,
      fileType: material.fileType,
      subject: material.subject,
      extractedTopics: material.extractedTopics,
      totalEstimatedMinutes: material.totalEstimatedMinutes,
      createdAt: material.createdAt,
    },
  });
});

/**
 * DELETE /api/materials/:id
 * Deletes material + cleans up related plans and tasks.
 */
const deleteMaterial = asyncHandler(async (req, res) => {
  const materialId = req.params.id;
  const material = await Material.findOneAndDelete({
    _id: materialId,
    user: req.user._id,
  });
  if (!material) return res.status(404).json({ error: "Material not found" });

  // Remove tasks that reference this material
  const taskResult = await Task.deleteMany({ material: materialId, user: req.user._id });
  console.log("[deleteMaterial] Deleted", taskResult.deletedCount, "tasks for material:", materialId);

  // Pull material from any plans that reference it
  await Plan.updateMany(
    { materials: materialId, user: req.user._id },
    { $pull: { materials: materialId } }
  );

  // Delete plans that now have 0 materials
  const emptyPlans = await Plan.find({ user: req.user._id, materials: { $size: 0 } });
  if (emptyPlans.length > 0) {
    const emptyPlanIds = emptyPlans.map((p) => p._id);
    await Task.deleteMany({ plan: { $in: emptyPlanIds } });
    await Plan.deleteMany({ _id: { $in: emptyPlanIds } });
    console.log("[deleteMaterial] Deleted", emptyPlans.length, "empty plans");
  }

  const affectedPlans = emptyPlans.length;
  console.log("[deleteMaterial] Deleted material:", materialId, "| affectedPlans:", affectedPlans);

  res.json({
    message: "Material deleted",
    affectedPlans,
    deletedTasks: taskResult.deletedCount,
  });
});

module.exports = { processMaterial, listMaterials, getMaterial, deleteMaterial, reprocessMaterial };
