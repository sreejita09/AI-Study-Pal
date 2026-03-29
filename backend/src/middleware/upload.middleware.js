const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "../../uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-").toLowerCase();
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB to handle presentations
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "text/plain",
      // Word
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      // PowerPoint
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];
    // Also allow by extension in case browser sends generic MIME
    const ext = file.originalname.split(".").pop()?.toLowerCase();
    const allowedExts = ["pdf", "txt", "doc", "docx", "ppt", "pptx"];
    if (!allowedTypes.includes(file.mimetype) && !allowedExts.includes(ext)) {
      cb(new Error("Only PDF, Word (.doc/.docx), PowerPoint (.ppt/.pptx), and text files are allowed"));
      return;
    }
    cb(null, true);
  }
});

module.exports = upload;
