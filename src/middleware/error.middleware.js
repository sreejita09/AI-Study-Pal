function notFound(req, res) {
  res.status(404).json({ error: "Resource not found", status: 404, success: false });
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const message    = err.message || "Internal server error";

  // Always log server errors; suppress in test env to keep output clean
  if (process.env.NODE_ENV !== "test") {
    console.error(`[${statusCode}] ${message}`, err.stack || "");
  }

  res.status(statusCode).json({
    error:   message,
    status:  statusCode,
    success: false,
    // Include stack trace only in development
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
}

module.exports = {
  notFound,
  errorHandler
};
