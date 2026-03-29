const OpenAI = require("openai");

// Lazy-initialized so the client is created only when first used,
// after dotenv has loaded env vars.
let _client = null;
function getClient() {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

const PROMPTS = {
  summary: (text) => `Summarize the following content into a clean, structured study format:

- Use short bullet points
- Add clear section headings
- Keep points concise (1 line each)
- Highlight keywords in **bold**
- Avoid long paragraphs
- Make it easy to revise quickly

Format like:

## Overview
- ...

## Key Concepts
- ...

## Important Points
- ...

## Quick Revision
- ...

Content:
${text}`,

  notes: (text, detailLevel) => detailLevel === "detailed"
    ? `Create highly detailed and comprehensive study notes from the following content:

- Explain each concept clearly and thoroughly
- Include real-world examples for every major point
- Expand explanations to be approximately 5x longer than a summary
- Use clear section headings and sub-headings
- Highlight key terms in **bold**
- Include diagrams described in text where helpful
- Add 'Why it matters' context for important concepts
- Add 'Tip' or 'Memory Trick' sections

Format:

## Concept Name
### What is it?
Detailed explanation...

### Example
In-depth example with context...

### Why It Matters
Real-world relevance...

> 💡 **Tip**: Memory trick or shortcut...

Make it thorough, student-friendly, and easy to review.

Content:
${text}`
    : `Create engaging and well-structured study notes:

- Use clear section headings
- Add short explanations (2–3 lines each)
- Include examples where possible
- Highlight key terms in **bold**
- Add a small 'Tip' or 'Memory Trick' if possible
- Keep it interesting and easy to remember

Format like:

## Concept
Explanation...

## Example
...

## Key Point
...

> 💡 **Tip**: Memory trick or shortcut...

Make it student-friendly and not boring.

Content:
${text}`,

  quiz: (text) => `You are a quiz generator for students. Generate exactly 5 multiple-choice questions from the content below.

CRITICAL RULES:
1. Each option must be a REAL, meaningful answer — NEVER use generic placeholders like "A", "B", "C", "D" or "Option 1", "Option 2"
2. All 4 options must be plausible and related to the question topic
3. Only ONE option should be correct
4. The "answer" field must be the EXACT text of the correct option
5. Each question must test a different concept from the content
6. Questions must be clear and unambiguous
7. Explanations should highlight the key concept in 1-2 sentences

Return ONLY this JSON array, no other text:

[
  {
    "question": "A clear, specific question about the content",
    "options": ["Real answer 1", "Real answer 2", "Real answer 3", "Real answer 4"],
    "answer": "The exact text of the correct option",
    "explanation": "Why this is correct — mention the key concept"
  }
]

Content:
${text}`,

  improve: (text, previous) => `The following study material was generated but needs improvement.

Make it:
- Clearer and better structured
- More concise where verbose
- Better organized for quick revision
- Add any missing key points
- Highlight important terms in **bold**

Original output:
${previous}

Source content:
${text.slice(0, 6000)}`,

  studyplan: (subject, days, difficulty) => `You are an expert study planner. Create a ${days}-day study plan for the subject: "${subject}"
Difficulty level: ${difficulty}

Rules:
- Return ONLY a valid JSON array, no extra text
- Each element: { "day": <number>, "tasks": ["task1", "task2", ...] }
- Each day should have 2-4 specific, actionable study tasks
- Tasks should progressively build knowledge
- Include review/practice tasks, not just reading
- For "hard" difficulty, include advanced exercises
- For "easy", keep tasks shorter and simpler

Example format:
[{"day":1,"tasks":["Read Chapter 1: Introduction to ${subject}","Summarize key definitions","Complete 5 practice problems"]}]

Return the JSON array ONLY:`,

  microtasks: (topic) => `Break down this study task into 2-3 specific, actionable micro-tasks (sub-steps):

Task: "${topic}"

Rules:
- Return ONLY a valid JSON array of strings
- Each string is a concise sub-task (one sentence)
- Make them specific and immediately actionable
- Example: ["Read section 3.1 on TCP handshake","Draw a diagram of the 3-way handshake","Write a short summary of when TCP is used"]

Return the JSON array ONLY:`,

  topic: (topic) => `You are an expert tutor. Generate comprehensive study material on the following topic:

**${topic}**

Structure the output as:

## Overview
A brief introduction to the topic (2-3 sentences).

## Key Concepts
- Concept 1: short explanation
- Concept 2: short explanation
- (cover 5-8 key concepts)

## Detailed Notes
Expand on each concept with clear explanations, examples, and diagrams described in text.

## Important Formulas / Rules
- List any relevant formulas, laws, or rules (if applicable)

## Common Mistakes
- Things students often get wrong

## Quick Revision
- Bullet-point summary for last-minute revision

> 💡 **Tip**: Include a memory trick or mnemonic if possible.

Make the content student-friendly, engaging, and easy to revise.`,
};

const generate = async (req, res) => {
  const { text, mode = "summary" } = req.body;

  console.log("MODE:", mode);

  const freeTextModes = ["topic", "studyplan", "microtasks"];
  if (!text || typeof text !== "string" || (!freeTextModes.includes(mode) && text.trim().length < 20)) {
    return res.status(400).json({
      error: freeTextModes.includes(mode) ? "Provide a subject/topic." : "Provide at least 20 characters of text.",
    });
  }

  if (!["summary", "notes", "quiz", "improve", "topic", "studyplan", "microtasks"].includes(mode)) {
    return res.status(400).json({
      error: "Mode must be one of: summary, notes, quiz, improve, topic, studyplan, microtasks.",
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("AI ERROR: OPENAI_API_KEY is not set in environment");
    return res.status(500).json({
      error: "OpenAI API key is not configured.",
    });
  }

  try {
    console.log(`Calling OpenAI [${mode}] with text length:`, text.length);

    let promptContent;
    if (mode === "improve") {
      const previous = req.body.previous || "";
      promptContent = PROMPTS.improve(text.slice(0, 6000), previous.slice(0, 6000));
    } else if (mode === "topic") {
      promptContent = PROMPTS.topic(text.trim());
    } else if (mode === "studyplan") {
      const days = req.body.days || 7;
      const difficulty = req.body.difficulty || "medium";
      promptContent = PROMPTS.studyplan(text.trim(), days, difficulty);
    } else if (mode === "microtasks") {
      promptContent = PROMPTS.microtasks(text.trim());
    } else if (mode === "notes") {
      const detailLevel = req.body.detailLevel || "quick";
      promptContent = PROMPTS.notes(text.slice(0, 12000), detailLevel);
    } else {
      promptContent = PROMPTS[mode](text.slice(0, 12000));
    }

    const response = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: promptContent,
        },
      ],
    });

    const result = response.choices[0].message.content;
    console.log(`OpenAI [${mode}] success, response length:`, result.length);

    // For studyplan and microtasks, parse JSON
    if (mode === "studyplan" || mode === "microtasks") {
      try {
        const cleaned = result.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        return res.json({ result: parsed, mode });
      } catch (parseErr) {
        console.error(`${mode} JSON parse failed:`, parseErr.message);
        return res.status(500).json({ error: "AI returned invalid format. Please try again." });
      }
    }

    // For quiz, try to parse as JSON + validate quality
    if (mode === "quiz") {
      try {
        const cleaned = result.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        const quiz = JSON.parse(cleaned);
        // Normalize: support both "answer" and "correctAnswer" fields
        const normalized = quiz.map((q) => ({
          question: q.question,
          options: q.options,
          answer: q.answer || q.correctAnswer,
          explanation: q.explanation || "",
        }));

        // Validate: reject placeholder options like ["A","B","C","D"]
        const hasPlaceholders = normalized.some((q) => {
          const opts = (q.options || []).map((o) => o.trim());
          const placeholders = ["A", "B", "C", "D"];
          return opts.length === 4 && opts.every((o, i) => o === placeholders[i]);
        });

        if (hasPlaceholders) {
          console.warn("Quiz had placeholder options, regenerating...");
          // Retry once
          const retry = await getClient().chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "user", content: PROMPTS.quiz(text.slice(0, 12000)) },
              { role: "assistant", content: result },
              { role: "user", content: "The options you provided are generic placeholders (A, B, C, D). Please regenerate with REAL, meaningful answer options that are actual content-related answers." },
            ],
          });
          const retryResult = retry.choices[0].message.content;
          const retryCleaned = retryResult.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
          const retryQuiz = JSON.parse(retryCleaned);
          const retryNorm = retryQuiz.map((q) => ({
            question: q.question,
            options: q.options,
            answer: q.answer || q.correctAnswer,
            explanation: q.explanation || "",
          }));
          return res.json({ result: retryNorm, mode: "quiz" });
        }

        return res.json({ result: normalized, mode: "quiz" });
      } catch (parseErr) {
        console.error("Quiz JSON parse failed, returning raw text");
        return res.json({ result, mode: "quiz" });
      }
    }

    res.json({ result, mode });
  } catch (error) {
    console.error("AI ERROR:", error.response?.data || error.message);
    console.error("Full error:", error);
    res.status(500).json({
      error: "AI failed",
      details: error.message,
    });
  }
};

// Keep backward compat
const summary = generate;

module.exports = { generate, summary };
