const { z } = require("zod");

const SUBJECTS = ["Bug", "Feature Request", "Account Issue", "Other"];

const supportSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer")
    .trim(),
  email: z
    .string()
    .email("Enter a valid email address")
    .trim()
    .toLowerCase(),
  subject: z.enum(SUBJECTS, {
    errorMap: () => ({ message: `Subject must be one of: ${SUBJECTS.join(", ")}` }),
  }),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message must be 5000 characters or fewer")
    .trim(),
});

module.exports = { supportSchema };
