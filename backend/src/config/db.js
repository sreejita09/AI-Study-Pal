const mongoose = require("mongoose");

async function connectDb() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGO_URI environment variable is not set. " +
      "Add it in Render → Environment settings."
    );
  }

  if (uri.includes("127.0.0.1") || uri.includes("localhost")) {
    throw new Error("MONGO_URI points to localhost — use a MongoDB Atlas URI (mongodb+srv://...)");
  }

  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("[db] MongoDB connection failed:", err.message);
    throw err;
  }
}

module.exports = connectDb;
