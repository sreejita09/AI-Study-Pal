const mongoose = require("mongoose");

const supportSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true },
    subject: {
      type: String,
      required: true,
      enum: ["Bug", "Feature Request", "Account Issue", "Other"],
    },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    status: { type: String, enum: ["open", "resolved"], default: "open" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Support", supportSchema);
