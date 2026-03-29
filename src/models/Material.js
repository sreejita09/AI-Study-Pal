const mongoose = require("mongoose");

const TopicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    estimatedMinutes: { type: Number, default: 30 },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
  },
  { _id: false }
);

const GeneratedContentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["summary", "notes", "flashcards", "quiz"], required: true },
    content: { type: String, default: "" },
    generatedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const MaterialSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    upload: { type: mongoose.Schema.Types.ObjectId, ref: "Upload" },
    title: { type: String, required: true, trim: true },
    fileType: {
      type: String,
      enum: ["pdf", "doc", "ppt", "txt", "paste"],
      default: "pdf",
    },
    subject: { type: String, default: "", trim: true },
    extractedText: { type: String, default: "" },
    extractedTopics: { type: [TopicSchema], default: [] },
    totalEstimatedMinutes: { type: Number, default: 0 },
    generatedContent: { type: [GeneratedContentSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Material", MaterialSchema);
