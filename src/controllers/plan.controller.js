const asyncHandler = require("../utils/asyncHandler");
const Plan = require("../models/Plan");
const Task = require("../models/Task");
const Material = require("../models/Material");
const User = require("../models/User");
const OpenAI = require("openai");
const { assignDifficulties, extractTopics, detectDifficulty } = require("../services/difficulty.service");
const { scheduleByEnergy } = require("../services/scheduling.service");
const { awardTaskXP } = require("../services/gamification.service");
const { generateMotivation } = require("../services/motivation.service");
const { createIfNew } = require("../services/notification.service");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_RECOMMENDED_HOURS_PER_DAY = 8;

/** Priority score from difficulty */
function getPriorityScore(difficulty) {
  const map = { hard: 3, medium: 2, easy: 1 };
  return map[difficulty] || 2;
}

/** Energy level from difficulty */
function getEnergyLevel(difficulty) {
  const map = { hard: "high", medium: "medium", easy: "low" };
  return map[difficulty] || "medium";
}

/** Assign time slot based on energy level: high → morning, medium → afternoon, low → evening */
function assignTimeSlot(energyLevel) {
  const map = { high: "morning", medium: "afternoon", low: "evening" };
  return map[energyLevel] || "afternoon";
}

/**
 * Helper: build date string offset from a start date
 */
function addDaysStr(startStr, n) {
  const d = new Date(startStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * POST /api/plans/create
 * Body: { materialIds, mode, totalHours, days?, dailyHours?, startDate? }
 */
const createPlan = asyncHandler(async (req, res) => {
  const { materialIds, mode, totalHours, days, dailyHours, startDate } = req.body;

  console.log("[createPlan] body:", JSON.stringify({ materialIds, mode, totalHours, days, startDate }));

  if (!materialIds || !materialIds.length) {
    return res.status(400).json({ error: "Select at least one material." });
  }
  if (!totalHours || totalHours <= 0) {
    return res.status(400).json({ error: "Total hours must be positive." });
  }
  if (!["auto", "custom", "finish_today"].includes(mode)) {
    return res.status(400).json({ error: "Mode must be auto, custom, or finish_today." });
  }

  // Fetch materials with topics
  const materials = await Material.find({
    _id: { $in: materialIds },
    user: req.user._id,
  });

  console.log("[createPlan] Materials fetched:", materials.length, "| requested:", materialIds.length);

  if (!materials.length) {
    return res.status(404).json({ error: "No valid materials found. Upload and process materials first." });
  }

  // Auto-reprocess materials with stale/generic topics before plan creation
  for (const mat of materials) {
    const topics = mat.extractedTopics || [];
    const titleLower = mat.title.toLowerCase().replace(/\.[^.]+$/, ""); // strip extension
    const isStale = topics.length === 0 || topics.every((t) => {
      const n = (t.name || "").toLowerCase();
      return n.includes(titleLower) || n.startsWith("study:") || n.startsWith("study ") || n === mat.title.toLowerCase();
    });
    if (isStale && (mat.extractedText || "").trim().length >= 20) {
      console.log(`[createPlan] Stale topics detected for "${mat.title}" — auto-reprocessing`);
      try {
        const text = mat.extractedText.trim();
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
        let newTopics = JSON.parse(cleaned);
        if (!Array.isArray(newTopics)) newTopics = [];
        const VALID_DIFF = new Set(["easy", "medium", "hard"]);
        newTopics = newTopics.map((t) => ({
          name: String(t.name || "Unnamed Topic").trim(),
          estimatedMinutes: Math.max(10, Math.min(120, Number(t.estimatedMinutes) || 30)),
          difficulty: VALID_DIFF.has(t.difficulty) ? t.difficulty : detectDifficulty(t.name, t.estimatedMinutes),
        }));
        if (newTopics.length > 0) {
          mat.extractedTopics = assignDifficulties(newTopics);
          mat.totalEstimatedMinutes = newTopics.reduce((s, t) => s + t.estimatedMinutes, 0);
          await mat.save();
          console.log(`[createPlan] Re-extracted ${newTopics.length} topics for "${mat.title}"`);
        }
      } catch (err) {
        console.warn(`[createPlan] Auto-reprocess AI failed for "${mat.title}":`, err.message);
        // Try local fallback
        const localTopics = extractTopics(mat.extractedText.trim(), mat.title);
        if (localTopics.length > 0) {
          mat.extractedTopics = assignDifficulties(localTopics);
          mat.totalEstimatedMinutes = localTopics.reduce((s, t) => s + t.estimatedMinutes, 0);
          await mat.save();
          console.log(`[createPlan] Local fallback: ${localTopics.length} topics for "${mat.title}"`);
        }
      }
    }
  }

  // Collect all topics from extracted material topics — NEVER use generic material-level tasks
  console.log("[createPlan] Materials:", materials.length);
  let allTopics = [];
  for (const mat of materials) {
    if (mat.extractedTopics && mat.extractedTopics.length > 0) {
      console.log(`[createPlan] "${mat.title}" → ${mat.extractedTopics.length} extracted topics`);
      for (const topic of mat.extractedTopics) {
        allTopics.push({
          name: topic.name,
          estimatedMinutes: Math.max(15, Math.min(topic.estimatedMinutes || 30, 90)),
          difficulty: topic.difficulty || undefined,
          materialId: mat._id,
          materialTitle: mat.title,
        });
      }
    } else {
      console.warn(`[createPlan] No topics found for: "${mat.title}" — skipping`);
    }
  }

  console.log("[createPlan] Total topics:", allTopics.length);

  if (allTopics.length === 0) {
    return res.status(400).json({
      error: "No topics found in the selected materials. Please re-upload or reprocess your materials.",
    });
  }

  // Assign difficulty to topics
  allTopics = assignDifficulties(allTopics);

  // Get user energy preference for scheduling
  const user = await User.findById(req.user._id).select("preferences");
  const peakEnergy = user?.preferences?.peakEnergyTime || "morning";

  // Scale topic times to fit totalHours
  const totalEstMins = allTopics.reduce((s, t) => s + t.estimatedMinutes, 0);
  const totalMins = totalHours * 60;
  const scale = totalMins / totalEstMins;
  allTopics = allTopics.map((t) => ({
    ...t,
    allocatedMinutes: Math.max(10, Math.round(t.estimatedMinutes * scale)),
  }));

  // Determine start date
  const start = startDate || new Date().toISOString().slice(0, 10);
  const planTitle = materials.map((m) => m.title).join(", ");

  let planDays = days || 1;
  let planDailyHours = dailyHours || [];
  const warnings = [];

  // Create the plan
  const plan = await Plan.create({
    user: req.user._id,
    title: planTitle.length > 80 ? planTitle.slice(0, 77) + "..." : planTitle,
    mode,
    totalHours,
    days: mode === "finish_today" ? 1 : planDays,
    startDate: start,
    materials: materialIds,
    dailyHours: planDailyHours,
  });

  // ── Build tasks based on mode ──
  let tasks = [];

  if (mode === "finish_today") {
    // Sort by energy preference, then assign all to today
    const sorted = scheduleByEnergy(allTopics, peakEnergy);
    let order = 0;
    for (const topic of sorted) {
      const diff = topic.difficulty || "medium";
      const energy = getEnergyLevel(diff);
      tasks.push({
        user: req.user._id,
        plan: plan._id,
        material: topic.materialId,
        topic: topic.name,
        allocatedMinutes: topic.allocatedMinutes,
        difficulty: diff,
        priorityScore: getPriorityScore(diff),
        energyLevel: energy,
        timeSlot: assignTimeSlot(energy),
        assignedDate: start,
        dayIndex: order++,
      });
    }
  } else {
    // ══════════════════════════════════════════════════════════
    // INTELLIGENT TOPIC-BASED BALANCED SCHEDULER (auto & custom)
    // ══════════════════════════════════════════════════════════

    const PRIORITY = { hard: 3, medium: 2, easy: 1 };
    const FATIGUE_BUFFER = 0.9;   // only fill 90% of each day
    const MAX_HARD_PER_DAY = 2;

    // ── Step 0: Build day capacities ──
    let dayCapacities;
    if (mode === "custom" && planDailyHours.length) {
      dayCapacities = planDailyHours.map((h) => h * 60);
    } else {
      const minutesPerDay = totalMins / planDays;
      dayCapacities = Array(planDays).fill(minutesPerDay);
    }
    const maxDayCap = Math.max(...dayCapacities);

    // ── Step 1: Micro-splitting — break oversized topics ──
    const splitTopics = [];
    for (const topic of allTopics) {
      if (topic.allocatedMinutes > maxDayCap && maxDayCap > 0) {
        let remaining = topic.allocatedMinutes;
        let part = 1;
        while (remaining > 0) {
          const chunk = Math.min(remaining, Math.floor(maxDayCap * FATIGUE_BUFFER));
          splitTopics.push({
            ...topic,
            name: `${topic.name} (Part ${part})`,
            allocatedMinutes: chunk,
          });
          remaining -= chunk;
          part++;
        }
      } else {
        splitTopics.push(topic);
      }
    }

    // ── Step 2: Sort by difficulty (hard first) then by material for mixing ──
    splitTopics.sort((a, b) => {
      const dp = PRIORITY[b.difficulty || "medium"] - PRIORITY[a.difficulty || "medium"];
      if (dp !== 0) return dp;
      // Secondary: group by material so we can interleave later
      const ma = String(a.materialId);
      const mb = String(b.materialId);
      return ma.localeCompare(mb);
    });

    // Separate by difficulty tier
    const hardQueue = splitTopics.filter((t) => (t.difficulty || "medium") === "hard");
    const mediumQueue = splitTopics.filter((t) => (t.difficulty || "medium") === "medium");
    const easyQueue = splitTopics.filter((t) => (t.difficulty || "medium") === "easy");

    // ── Step 3: Build daily capacity buckets ──
    const daysArr = dayCapacities.map((cap, i) => ({
      dayIndex: i,
      dateStr: addDaysStr(start, i),
      capacity: cap,
      effectiveCap: Math.floor(cap * FATIGUE_BUFFER),
      usedTime: 0,
      hardCount: 0,
      tasks: [],
      materialSet: new Set(), // track materials placed in this day
    }));

    // Warn about overloaded days
    daysArr.forEach((d) => {
      const hrs = d.capacity / 60;
      if (hrs > MAX_RECOMMENDED_HOURS_PER_DAY) {
        warnings.push({
          day: d.dayIndex + 1,
          date: d.dateStr,
          hours: hrs,
          message: `Day ${d.dayIndex + 1} has ${hrs.toFixed(1)}h — exceeds recommended ${MAX_RECOMMENDED_HOURS_PER_DAY}h. Consider adding more days.`,
        });
      }
    });

    // Helpers
    const canPlace = (day, topic) => {
      if (day.usedTime + topic.allocatedMinutes > day.effectiveCap) return false;
      if ((topic.difficulty || "medium") === "hard" && day.hardCount >= MAX_HARD_PER_DAY) return false;
      return true;
    };
    const placeTask = (day, topic) => {
      day.tasks.push(topic);
      day.usedTime += topic.allocatedMinutes;
      if ((topic.difficulty || "medium") === "hard") day.hardCount++;
      if (topic.materialId) day.materialSet.add(String(topic.materialId));
    };

    // Helper: pick topic that maximizes material diversity for a day
    const pickDiverse = (queue, day) => {
      if (queue.length === 0) return null;
      // Prefer a topic from a material NOT yet in this day
      const diverseIdx = queue.findIndex((t) => !day.materialSet.has(String(t.materialId)));
      if (diverseIdx >= 0) return queue.splice(diverseIdx, 1)[0];
      // Fallback: first available
      return queue.shift();
    };

    // ── Step 4: Round-robin difficulty-mixed assignment ──
    // Distribute one hard, one medium, one easy per day in round-robin
    // This ensures each day gets a mix of difficulties + material variety

    // Edge case: topics < days → spread 1 per day
    const totalTopics = splitTopics.length;
    if (totalTopics <= planDays) {
      // Simple spread: one topic per day
      let topicIdx = 0;
      const allSorted = [...hardQueue, ...mediumQueue, ...easyQueue];
      for (let i = 0; i < daysArr.length && topicIdx < allSorted.length; i++) {
        placeTask(daysArr[i], allSorted[topicIdx]);
        topicIdx++;
      }
    } else {
      // Round-robin: cycle through days, placing 1 hard + 1 medium + 1 easy per round
      let dayIdx = 0;
      const totalDays = daysArr.length;

      // Pass 1: Distribute hard topics (1 per day, spread across all days)
      while (hardQueue.length > 0) {
        const day = daysArr[dayIdx % totalDays];
        const topic = pickDiverse(hardQueue, day);
        if (topic) {
          if (canPlace(day, topic)) {
            placeTask(day, topic);
          } else {
            // Find least loaded day that can take it
            const sorted = [...daysArr].sort((a, b) => a.usedTime - b.usedTime);
            const target = sorted.find((d) => canPlace(d, topic));
            if (target) placeTask(target, topic);
            else placeTask(sorted[0], topic); // last resort
          }
        }
        dayIdx++;
      }

      // Pass 2: Distribute medium topics (round-robin across days)
      dayIdx = 0;
      while (mediumQueue.length > 0) {
        const day = daysArr[dayIdx % totalDays];
        const topic = pickDiverse(mediumQueue, day);
        if (topic) {
          if (canPlace(day, topic)) {
            placeTask(day, topic);
          } else {
            const sorted = [...daysArr].sort((a, b) => a.usedTime - b.usedTime);
            const target = sorted.find((d) => canPlace(d, topic));
            if (target) placeTask(target, topic);
            else placeTask(sorted[0], topic);
          }
        }
        dayIdx++;
      }

      // Pass 3: Distribute easy topics (round-robin across days)
      dayIdx = 0;
      while (easyQueue.length > 0) {
        const day = daysArr[dayIdx % totalDays];
        const topic = pickDiverse(easyQueue, day);
        if (topic) {
          if (canPlace(day, topic)) {
            placeTask(day, topic);
          } else {
            const sorted = [...daysArr].sort((a, b) => a.usedTime - b.usedTime);
            const target = sorted.find((d) => canPlace(d, topic));
            if (target) placeTask(target, topic);
            else placeTask(sorted[0], topic);
          }
        }
        dayIdx++;
      }
    }

    // ── Step 5: Load balancing — reduce variance between days ──
    const avgLoad = daysArr.reduce((s, d) => s + d.usedTime, 0) / daysArr.length;
    const OVERLOAD_RATIO = 1.3;

    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < daysArr.length; i++) {
        const day = daysArr[i];
        if (day.usedTime <= avgLoad * OVERLOAD_RATIO) continue;
        if (day.tasks.length <= 1) continue;

        const sortedBySize = [...day.tasks].sort((a, b) => a.allocatedMinutes - b.allocatedMinutes);
        const candidate = sortedBySize[0];

        let target = null;
        for (const offset of [1, -1, 2, -2]) {
          const ni = i + offset;
          if (ni < 0 || ni >= daysArr.length) continue;
          if (canPlace(daysArr[ni], candidate)) {
            target = daysArr[ni];
            break;
          }
        }
        if (target) {
          day.tasks = day.tasks.filter((t) => t !== candidate);
          day.usedTime -= candidate.allocatedMinutes;
          if ((candidate.difficulty || "medium") === "hard") day.hardCount--;
          placeTask(target, candidate);
        }
      }
    }

    // ── Step 6: Empty day guarantee + Revision slots ──
    const emptyDays = daysArr.filter((d) => d.tasks.length === 0);
    const loadedDays = daysArr.filter((d) => d.tasks.length > 1);

    for (const empty of emptyDays) {
      if (loadedDays.length === 0) break;
      loadedDays.sort((a, b) => b.tasks.length - a.tasks.length);
      const donor = loadedDays[0];
      if (donor.tasks.length <= 1) break;

      const stolen = donor.tasks.pop();
      donor.usedTime -= stolen.allocatedMinutes;
      if ((stolen.difficulty || "medium") === "hard") donor.hardCount--;
      placeTask(empty, stolen);
      if (donor.tasks.length <= 1) loadedDays.splice(0, 1);
    }

    // Add revision tasks to any still-empty days — use actual topic names
    const stillEmpty = daysArr.filter((d) => d.tasks.length === 0);
    if (stillEmpty.length > 0) {
      for (const empty of stillEmpty) {
        const revTopic = splitTopics[empty.dayIndex % splitTopics.length] || splitTopics[0];
        const revisionMins = Math.min(30, empty.effectiveCap || 30);
        placeTask(empty, {
          name: `Review: ${revTopic.name}`,
          allocatedMinutes: revisionMins,
          difficulty: "easy",
          materialId: revTopic.materialId,
          materialTitle: revTopic.materialTitle,
        });
      }
    }

    // ── Step 7: Consistency smoothing ──
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 1; i < daysArr.length - 1; i++) {
        const prev = daysArr[i - 1];
        const curr = daysArr[i];
        const next = daysArr[i + 1];

        if (curr.usedTime > prev.usedTime * 2 && curr.usedTime > next.usedTime * 2 && curr.tasks.length > 1) {
          const sortedBySize = [...curr.tasks].sort((a, b) => a.allocatedMinutes - b.allocatedMinutes);
          const mover = sortedBySize[0];
          const target = prev.usedTime <= next.usedTime ? prev : next;
          if (canPlace(target, mover)) {
            curr.tasks = curr.tasks.filter((t) => t !== mover);
            curr.usedTime -= mover.allocatedMinutes;
            if ((mover.difficulty || "medium") === "hard") curr.hardCount--;
            placeTask(target, mover);
          }
        }
      }
    }

    // ── Step 8: Flatten into tasks array ──
    for (const day of daysArr) {
      // Within each day: hard first (morning focus), then medium, then easy
      day.tasks.sort((a, b) => PRIORITY[b.difficulty || "medium"] - PRIORITY[a.difficulty || "medium"]);
      let order = 0;
      for (const topic of day.tasks) {
        const diff = topic.difficulty || "medium";
        const energy = getEnergyLevel(diff);
        tasks.push({
          user: req.user._id,
          plan: plan._id,
          material: topic.materialId,
          topic: topic.name,
          allocatedMinutes: topic.allocatedMinutes,
          difficulty: diff,
          priorityScore: getPriorityScore(diff),
          energyLevel: energy,
          timeSlot: assignTimeSlot(energy),
          assignedDate: day.dateStr,
          dayIndex: order++,
        });
      }
    }
  }

  // ── Step 9: Debug — balanced schedule log ──
  const minutesPerDay = totalMins / (mode === "finish_today" ? 1 : planDays);
  console.log("[createPlan] Balanced schedule:");
  console.log(`  Tasks: ${tasks.length} | Days: ${mode === "finish_today" ? 1 : planDays} | Minutes/day: ${Math.round(minutesPerDay)}`);
  const tasksByDay = {};
  tasks.forEach((t) => {
    const k = t.assignedDate || "today";
    if (!tasksByDay[k]) tasksByDay[k] = [];
    tasksByDay[k].push({ topic: t.topic, mins: t.allocatedMinutes, diff: t.difficulty, slot: t.timeSlot });
  });
  const dayKeys = Object.keys(tasksByDay).sort();
  dayKeys.forEach((day) => {
    const items = tasksByDay[day];
    const totalMinsDay = items.reduce((s, t) => s + t.mins, 0);
    const hardCount = items.filter((t) => t.diff === "hard").length;
    const medCount = items.filter((t) => t.diff === "medium").length;
    const easyCount = items.filter((t) => t.diff === "easy").length;
    const mornCount = items.filter((t) => t.slot === "morning").length;
    const aftCount = items.filter((t) => t.slot === "afternoon").length;
    const eveCount = items.filter((t) => t.slot === "evening").length;
    console.log(`  ${day}: ${items.length} task(s), ${totalMinsDay}min [H:${hardCount} M:${medCount} E:${easyCount}] slots[AM:${mornCount} PM:${aftCount} EVE:${eveCount}] — ${items.slice(0, 3).map((t) => t.topic).join(", ")}${items.length > 3 ? ", ..." : ""}`);
  });
  if (dayKeys.length > 0) {
    const minLoad = Math.min(...dayKeys.map((k) => tasksByDay[k].reduce((s, t) => s + t.mins, 0)));
    const maxLoad = Math.max(...dayKeys.map((k) => tasksByDay[k].reduce((s, t) => s + t.mins, 0)));
    console.log(`  Load range: ${minLoad}min — ${maxLoad}min (variance: ${maxLoad - minLoad}min)`);
  }

  // Bulk insert tasks
  const createdTasks = await Task.insertMany(tasks);
  console.log("[createPlan] Tasks created:", createdTasks.length, "| plan:", plan._id);

  // Populate for response
  const populated = await Task.find({ plan: plan._id })
    .populate("material", "title fileType subject")
    .sort({ assignedDate: 1, dayIndex: 1 });

  // Build groupedTasks (date-keyed) and tasksGroupedByDay ("Day N"-keyed)
  const groupedTasks = {};
  populated.forEach((t) => {
    const dateKey = t.assignedDate || "unscheduled";
    if (!groupedTasks[dateKey]) groupedTasks[dateKey] = [];
    groupedTasks[dateKey].push(t);
  });

  // Relabel to "Day 1", "Day 2", etc.
  const groupedByDayLabel = {};
  const sortedDateKeys = Object.keys(groupedTasks).filter((k) => k !== "unscheduled").sort();
  sortedDateKeys.forEach((dk, i) => {
    groupedByDayLabel[`Day ${i + 1}`] = groupedTasks[dk];
  });
  if (groupedTasks["unscheduled"]) {
    groupedByDayLabel["Unscheduled"] = groupedTasks["unscheduled"];
  }

  res.status(201).json({ plan, tasks: populated, groupedTasks, tasksGroupedByDay: groupedByDayLabel, warnings });
});

/**
 * GET /api/plans
 * List all plans for current user.
 */
const listPlans = asyncHandler(async (req, res) => {
  const plans = await Plan.find({ user: req.user._id })
    .populate("materials", "title fileType subject")
    .sort({ createdAt: -1 });

  // For each plan, get task completion stats
  const plansWithStats = await Promise.all(
    plans.map(async (p) => {
      const total = await Task.countDocuments({ plan: p._id });
      const done = await Task.countDocuments({ plan: p._id, status: "done" });
      return { ...p.toObject(), taskStats: { total, done } };
    })
  );

  res.json({ plans: plansWithStats });
});

/**
 * GET /api/plans/:id
 * Get a single plan with all its tasks.
 */
const getPlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findOne({ _id: req.params.id, user: req.user._id })
    .populate("materials", "title fileType subject");
  if (!plan) return res.status(404).json({ error: "Plan not found" });

  const tasks = await Task.find({ plan: plan._id })
    .populate("material", "title fileType subject")
    .sort({ assignedDate: 1, dayIndex: 1 });

  // Build date-keyed groupedTasks
  const groupedTasks = {};
  tasks.forEach((t) => {
    const dateKey = t.assignedDate || "unscheduled";
    if (!groupedTasks[dateKey]) groupedTasks[dateKey] = [];
    groupedTasks[dateKey].push(t);
  });

  res.json({ plan, tasks, groupedTasks });
});

/**
 * PATCH /api/tasks/:id
 * Toggle task status + gamification + motivation.
 */
const toggleTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
  if (!task) return res.status(404).json({ error: "Task not found" });

  const wasDone = task.status === "done";
  task.status = wasDone ? "pending" : "done";
  task.completedAt = wasDone ? null : new Date();
  await task.save();

  let gamificationResult = null;
  let motivation = null;

  // Award XP when completing (not un-completing)
  if (!wasDone) {
    const user = await User.findById(req.user._id);
    if (user) {
      // Check if all today's tasks are now done
      const today = new Date().toISOString().slice(0, 10);
      const todayTasks = await Task.find({ user: req.user._id, assignedDate: today });
      const dayComplete = todayTasks.length > 0 && todayTasks.every((t) => t.status === "done");

      gamificationResult = awardTaskXP(user, { dayComplete });
      user.learningStats.totalStudyMinutes += task.allocatedMinutes || 0;
      await user.save();

      // Get motivation message
      const overdueTasks = await Task.countDocuments({
        user: req.user._id, status: "pending",
        assignedDate: { $lt: today, $ne: null },
      });
      motivation = generateMotivation({
        streak: user.learningStats.currentStreak,
        todayDone: todayTasks.filter((t) => t.status === "done").length,
        todayTotal: todayTasks.length,
        overdueTasks,
        dayComplete,
        taskJustCompleted: true,
        daysSinceActive: 0,
      });

      // Real-time notifications
      if (dayComplete) {
        createIfNew(req.user._id, "achievement", "Great job finishing today's plan! Keep the momentum going.").catch(() => {});
      }
      if (gamificationResult?.streakUpdated && gamificationResult?.streak > 1) {
        createIfNew(req.user._id, "streak", `You're on a ${gamificationResult.streak}-day learning streak 🔥`).catch(() => {});
      }
    }
  }

  res.json({ task, gamification: gamificationResult, motivation });
});

/**
 * POST /api/plans/:id/rebalance
 * Smart redistribution: moves ALL pending tasks to future dates starting today.
 * - Completed tasks are never touched
 * - Max ~3 tasks per day, load-balanced by allocated minutes
 * - Difficulty mixing: no more than 2 hard tasks on the same day
 * - Preserves original day ordering where possible
 */
const rebalancePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findOne({ _id: req.params.id, user: req.user._id });
  if (!plan) return res.status(404).json({ error: "Plan not found" });

  const today = new Date().toISOString().slice(0, 10);

  const allTasks = await Task.find({ plan: plan._id }).sort({ assignedDate: 1, dayIndex: 1 });
  const pendingTasks = allTasks.filter((t) => t.status !== "done");
  const doneTasks = allTasks.filter((t) => t.status === "done");

  if (pendingTasks.length === 0) {
    const populated = await Task.find({ plan: plan._id })
      .populate("material", "title fileType subject")
      .sort({ assignedDate: 1, dayIndex: 1 });
    return res.json({ message: "All tasks are already completed!", tasks: populated });
  }

  // Determine date range: keep original plan span or extend as needed
  const MAX_TASKS_PER_DAY = 3;
  const MAX_HARD_PER_DAY = 2;
  const MAX_MINS_PER_DAY = plan.totalHours
    ? Math.round((plan.totalHours * 60) / Math.max(plan.days || 1, 1))
    : 120;

  const daysNeeded = Math.max(
    Math.ceil(pendingTasks.length / MAX_TASKS_PER_DAY),
    plan.days || 7
  );

  // Build day slots starting from today
  const daySlots = [];
  for (let i = 0; i < daysNeeded; i++) {
    daySlots.push({
      dateStr: addDaysStr(today, i),
      tasks: [],
      usedMins: 0,
      hardCount: 0,
    });
  }

  // Place done tasks on their existing dates (frozen, just track load)
  for (const dt of doneTasks) {
    const slot = daySlots.find((d) => d.dateStr === dt.assignedDate);
    if (slot) {
      slot.tasks.push(dt);
      slot.usedMins += dt.allocatedMinutes || 0;
      if (dt.difficulty === "hard") slot.hardCount++;
    }
  }

  // Sort pending: hard first (morning focus), then medium, then easy
  const PRIO = { hard: 3, medium: 2, easy: 1 };
  pendingTasks.sort((a, b) => (PRIO[b.difficulty || "medium"] || 2) - (PRIO[a.difficulty || "medium"] || 2));

  // Distribute pending tasks using load balancing
  for (const task of pendingTasks) {
    const isHard = (task.difficulty || "medium") === "hard";
    const mins = task.allocatedMinutes || 30;

    // Find best day: fewest tasks, respecting caps
    let bestSlot = null;
    let bestScore = Infinity;

    for (const slot of daySlots) {
      const taskCount = slot.tasks.filter((t) => t.status !== "done").length;
      if (taskCount >= MAX_TASKS_PER_DAY) continue;
      if (slot.usedMins + mins > MAX_MINS_PER_DAY * 1.3) continue; // allow 30% overflow
      if (isHard && slot.hardCount >= MAX_HARD_PER_DAY) continue;

      // Score: prefer lower load, fewer tasks
      const score = slot.usedMins * 2 + taskCount * 50;
      if (score < bestScore) {
        bestScore = score;
        bestSlot = slot;
      }
    }

    // If no slot fits, pick the least loaded one (ignore caps)
    if (!bestSlot) {
      bestSlot = daySlots.reduce((a, b) => (a.usedMins <= b.usedMins ? a : b));
    }

    bestSlot.tasks.push(task);
    bestSlot.usedMins += mins;
    if (isHard) bestSlot.hardCount++;
  }

  // Apply new dates and ordering
  const updates = [];
  for (const slot of daySlots) {
    // Sort within day: hard → medium → easy
    const slotPending = slot.tasks.filter((t) => t.status !== "done");
    slotPending.sort((a, b) => (PRIO[b.difficulty || "medium"] || 2) - (PRIO[a.difficulty || "medium"] || 2));

    let order = 0;
    for (const task of slotPending) {
      task.assignedDate = slot.dateStr;
      task.dayIndex = order++;
      // Refresh time slot based on difficulty
      const energy = task.difficulty === "hard" ? "high" : task.difficulty === "easy" ? "low" : "medium";
      task.timeSlot = energy === "high" ? "morning" : energy === "low" ? "evening" : "afternoon";
      updates.push(task.save());
    }
  }

  await Promise.all(updates);

  console.log(`[rebalance] Redistributed ${pendingTasks.length} pending tasks across ${daySlots.filter((d) => d.tasks.some((t) => t.status !== "done")).length} days`);

  const updatedTasks = await Task.find({ plan: plan._id })
    .populate("material", "title fileType subject")
    .sort({ assignedDate: 1, dayIndex: 1 });

  res.json({
    message: `${pendingTasks.length} pending task${pendingTasks.length !== 1 ? "s" : ""} redistributed starting from today.`,
    tasks: updatedTasks,
    stats: {
      pending: pendingTasks.length,
      done: doneTasks.length,
      days: daySlots.filter((d) => d.tasks.some((t) => t.status !== "done")).length,
    },
  });
});

/* ── GENERATE CSV ────────────────────────────────── */
function generateCSV(tasks) {
  const escape = (val) => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  let csv = "Day,Date,Topic,Material,Time (min),Difficulty,Status\n";

  tasks.forEach((task) => {
    const date = task.assignedDate
      ? new Date(task.assignedDate + "T12:00:00").toDateString()
      : "Unscheduled";
    const dayIdx = task.dayIndex != null ? task.dayIndex + 1 : "";
    const matName = task.material?.title || "";
    const status = task.status === "done" ? "Completed" : "Pending";

    csv += [
      escape(dayIdx),
      escape(date),
      escape(task.topic),
      escape(matName),
      task.allocatedMinutes || 0,
      task.difficulty || "medium",
      status,
    ].join(",") + "\n";
  });

  return csv;
}

/* ── DOWNLOAD PLAN CSV ──────────────────────────── */
const downloadPlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findOne({ _id: req.params.id, user: req.user._id });
  if (!plan) return res.status(404).json({ error: "Plan not found" });

  const tasks = await Task.find({ plan: plan._id })
    .populate("material", "title")
    .sort({ assignedDate: 1, dayIndex: 1 });

  const csv = generateCSV(tasks);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=study_plan.csv");
  res.send(csv);
});

/* ── DELETE PLAN ─────────────────────────────────── */
const deletePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findOne({ _id: req.params.id, user: req.user._id });
  if (!plan) return res.status(404).json({ message: "Plan not found" });

  await Task.deleteMany({ plan: plan._id });
  await Plan.deleteOne({ _id: plan._id });

  res.json({ message: "Plan deleted" });
});

module.exports = { createPlan, listPlans, getPlan, toggleTask, rebalancePlan, downloadPlan, deletePlan };
