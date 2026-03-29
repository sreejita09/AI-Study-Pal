/**
 * History controller — history is stored client-side (localStorage).
 * These endpoints provide server-side hooks for future persistence needs
 * and return success so the client can proceed with its optimistic update.
 */

/**
 * DELETE /api/history/:id
 * Acknowledges deletion of a history item.
 * The item is identified by the client-generated id (hist_<timestamp>_<rand>).
 */
const deleteHistoryItem = async (req, res) => {
  const { id } = req.params;

  if (!id || typeof id !== "string" || id.trim() === "") {
    return res.status(400).json({ error: "Invalid history item id" });
  }

  // History is currently stored in client localStorage; nothing to remove server-side.
  // Return success so the frontend can complete the optimistic update immediately.
  return res.json({ success: true, deletedId: id });
};

module.exports = { deleteHistoryItem };
