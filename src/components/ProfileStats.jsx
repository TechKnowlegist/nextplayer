import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyScores, listTopScores } from '../engine/arcadeApi';
import { gameBySlug, GAMES } from '../gamesData';

// Your best score in every game you've played, your rank on each of those
// leaderboards (if you're in the top 10), and a few badges derived from
// that — all from the same ArcadeScore rows the leaderboards already use,
// no separate achievements model needed.
export default function ProfileStats({ email }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'error'
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const myScores = await listMyScores(email);

        const bestByGame = new Map();
        for (const s of myScores) {
          const game = gameBySlug(s.gameId);
          if (!game) continue;
          const current = bestByGame.get(s.gameId);
          const better = !current || (game.rankAscending ? s.score < current.score : s.score > current.score);
          if (better) bestByGame.set(s.gameId, s);
        }

        const gameIds = [...bestByGame.keys()];
        const ranks = await Promise.all(
          gameIds.map(async (gameId) => {
            const game = gameBySlug(gameId);
            const top = await listTopScores(gameId, 10, game.rankAscending);
            const idx = top.findIndex((t) => t.authorEmail === email);
            return [gameId, idx === -1 ? null : idx + 1];
          })
        );
        const rankByGame = new Map(ranks);

        const built = gameIds.map((gameId) => {
          const game = gameBySlug(gameId);
          const best = bestByGame.get(gameId);
          return { game, gameId, score: best.score, rank: rankByGame.get(gameId) };
        });
        built.sort((a, b) => {
          if (a.rank && b.rank) return a.rank - b.rank;
          if (a.rank) return -1;
          if (b.rank) return 1;
          return a.game.title.localeCompare(b.game.title);
        });

        if (!cancelled) {
          setRows(built);
          setStatus('ok');
        }
      } catch (err) {
        console.log('Nextplayer — profile stats load failed:', err);
        if (!cancelled) setStatus('error');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [email]);

  if (status === 'loading') return <p className="np-profile-empty">Loading your stats...</p>;
  if (status === 'error') return <p className="np-profile-empty">Couldn't load your stats right now.</p>;
  if (rows.length === 0) return <p className="np-profile-empty">No scores yet — go play something!</p>;

  const gamesPlayed = rows.length;
  const firsts = rows.filter((r) => r.rank === 1).length;
  const podiums = rows.filter((r) => r.rank && r.rank <= 3).length;

  const badges = [];
  if (gamesPlayed > 0) badges.push({ label: 'First Steps', detail: 'Submitted your first score' });
  if (gamesPlayed >= 5) badges.push({ label: 'Well Rounded', detail: 'Scored in 5+ different games' });
  if (gamesPlayed >= GAMES.length) badges.push({ label: 'Arcade Regular', detail: 'Scored in every game' });
  if (podiums > 0) {
    badges.push({ label: 'Podium Finish', detail: `Top 3 on ${podiums} leaderboard${podiums === 1 ? '' : 's'}` });
  }
  if (firsts > 0) {
    badges.push({ label: 'Champion', detail: `#1 on ${firsts} leaderboard${firsts === 1 ? '' : 's'}` });
  }

  return (
    <div className="np-profile-stats">
      <div className="np-profile-summary">
        <div className="np-profile-stat">
          <strong>{gamesPlayed}</strong>
          <span>games played</span>
        </div>
        <div className="np-profile-stat">
          <strong>{firsts}</strong>
          <span>#1 finishes</span>
        </div>
        <div className="np-profile-stat">
          <strong>{podiums}</strong>
          <span>top 3 finishes</span>
        </div>
      </div>

      {badges.length > 0 && (
        <div className="np-profile-badges">
          {badges.map((b) => (
            <div key={b.label} className="np-profile-badge" title={b.detail}>
              🏅 {b.label}
            </div>
          ))}
        </div>
      )}

      <ol className="np-profile-games">
        {rows.map(({ game, gameId, score, rank }) => (
          <li key={gameId}>
            <Link to={game.path} className="np-profile-game-link">
              <span className="np-profile-game-emoji">{game.emoji}</span>
              <span className="np-profile-game-title">{game.title}</span>
            </Link>
            <span className="np-profile-game-score">{game.format ? game.format(score) : score}</span>
            <span className="np-profile-game-rank">{rank ? `#${rank}` : 'Unranked'}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
