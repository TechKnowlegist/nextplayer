import { useEffect, useState } from 'react';
import { listTopScores } from '../engine/arcadeApi';

// `refreshKey` lets a parent force a re-fetch (e.g. bump a counter after
// the player's own score was just submitted) without a full page reload.
// `ascending` + `format` are for time-based games like Drift Racer, where a
// LOWER stored value is the better result and it should render as a lap
// time (e.g. "1:23.45") instead of a raw number. `limit` shrinks the list
// (the Leaderboards hub page shows a top-5 per game); `showHeading` hides
// the built-in "Leaderboard" title when a parent already labels the card.
export default function Leaderboard({
  gameId,
  refreshKey,
  ascending = false,
  format,
  limit = 10,
  showHeading = true,
}) {
  // A single status field instead of separate scores/failed booleans — every
  // update happens from inside the fetch's own callbacks (never
  // synchronously in the effect body), so a stale result never overwrites a
  // newer one and refetching after a score submit doesn't flash "Loading...".
  const [result, setResult] = useState({ status: 'loading', scores: null });

  useEffect(() => {
    let cancelled = false;
    listTopScores(gameId, limit, ascending)
      .then((items) => {
        if (!cancelled) setResult({ status: 'ok', scores: items });
      })
      .catch((err) => {
        console.log('Nextplayer — leaderboard load failed:', err);
        if (!cancelled) setResult({ status: 'error', scores: null });
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, refreshKey, ascending, limit]);

  const { status, scores } = result;
  const failed = status === 'error';

  return (
    <div className="np-leaderboard">
      {showHeading && <h3>Leaderboard</h3>}
      {failed && <p className="np-leaderboard-empty">Couldn't load the leaderboard right now.</p>}
      {status === 'loading' && <p className="np-leaderboard-empty">Loading...</p>}
      {!failed && scores && scores.length === 0 && (
        <p className="np-leaderboard-empty">No scores yet — be the first!</p>
      )}
      {scores && scores.length > 0 && (
        <ol className="np-leaderboard-list">
          {scores.map((s, i) => (
            <li key={s.id}>
              <span className="np-leaderboard-rank">#{i + 1}</span>
              <span className="np-leaderboard-name">{s.playerName}</span>
              <span className="np-leaderboard-score">{format ? format(s.score) : s.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
