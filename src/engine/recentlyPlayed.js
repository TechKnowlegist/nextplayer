// Per-browser "continue playing" history — plain localStorage, no account
// needed, so guests get this too (unlike the leaderboard/chat features,
// which need sign-in). Most-recent-first, deduped, capped at MAX entries.
const KEY = 'np-recently-played';
const MAX = 6;

export function getRecentlyPlayed() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function recordPlayed(gameId) {
  try {
    const list = getRecentlyPlayed().filter((id) => id !== gameId);
    list.unshift(gameId);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — the
    // "Continue Playing" row just won't show up, nothing else depends on it.
  }
}
