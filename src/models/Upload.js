const mongoose = require("mongoose");

const UploadSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    path: { type: String, required: true },
    size: { type: Number, required: true },
    category: {
      type: String,
      enum: ["pdf", "text"],
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Upload", UploadSchema);
