const { z } = require("zod");

const summarizeSchema = z.object({
  content: z
    .string()
    .min(20, "Provide at least 20 characters for summarization")
    .max(12000, "Summary input is too large")
});

const topicSchema = z.object({
  topic: z
    .string()
    .min(2, "Topic must be at least 2 characters")
    .max(120, "Topic must be at most 120 characters")
});

module.exports = {
  summarizeSchema,
  topicSchema
};
