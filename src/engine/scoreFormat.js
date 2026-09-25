// Shared with gamesData.js (per-game `format`), the games themselves, and
// ProfileStats — one definition so a leaderboard entry and a game's own HUD
// always show a time/move-count the same way.
export function formatLapTime(ms) {
  if (ms == null) return '--:--.--';
  const totalSeconds = ms / 1000;
  const m = Math.floor(totalSeconds / 60);
  const sec = (totalSeconds % 60).toFixed(2).padStart(5, '0');
  return `${m}:${sec}`;
}

export function formatMoves(n) {
  return `${n} move${n === 1 ? '' : 's'}`;
}
