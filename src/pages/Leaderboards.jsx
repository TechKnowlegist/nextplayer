import { Link } from 'react-router-dom';
import { GAMES } from '../gamesData';
import Leaderboard from '../components/Leaderboard';

export default function Leaderboards() {
  return (
    <main className="np-page np-leaderboards-page">
      <h1>Leaderboards</h1>
      <p className="np-leaderboards-sub">
        Top 5 in every game. Sign in and play to get your name on one — each game also has its full
        top-10 and a comment thread on its own page.
      </p>

      <div className="np-leaderboards-grid">
        {GAMES.map((game) => {
          const gameId = game.path.slice('/games/'.length);
          return (
            <div key={game.id} className="np-leaderboards-card">
              <div className="np-leaderboards-card-top">
                <span className="np-help-emoji" aria-hidden="true">{game.emoji}</span>
                <h3>{game.title}</h3>
                <Link to={game.path} className="np-btn np-btn-secondary np-leaderboards-play">Play</Link>
              </div>
              <Leaderboard
                gameId={gameId}
                limit={5}
                ascending={game.rankAscending}
                format={game.format}
                showHeading={false}
              />
            </div>
          );
        })}
      </div>
    </main>
  );
}
