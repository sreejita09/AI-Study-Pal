const LAST_MATERIAL_KEY = "sp_last_material";

/**
 * @typedef {{ id: string, title: string, subject?: string, lastView: string, lastAccessed: number }} LastMaterial
 */

/**
 * Save the last opened material and view to localStorage.
 * Safe to call with incomplete data — missing fields are preserved from the
 * existing stored value so partial updates (e.g. tab change only) work.
 *
 * @param {Partial<LastMaterial>} update
 */
export function saveLastMaterial(update) {
  if (!update?.id) return;
  try {
    const existing = loadLastMaterial() || {};
    const merged = {
      ...existing,
      ...update,
      lastAccessed: Date.now(),
    };
    localStorage.setItem(LAST_MATERIAL_KEY, JSON.stringify(merged));
  } catch { /* ignore */ }
}

/**
 * Load the last material from localStorage.
 * Returns null if missing or corrupt — never throws.
 *
 * @returns {LastMaterial | null}
 */
export function loadLastMaterial() {
  try {
    const raw = localStorage.getItem(LAST_MATERIAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Require at minimum an id to be considered valid
    return parsed && typeof parsed.id === "string" ? parsed : null;
  } catch {
    return null;
  }
}

/** Clear the stored last material. */
export function clearLastMaterial() {
  try { localStorage.removeItem(LAST_MATERIAL_KEY); } catch { /* ignore */ }
}
