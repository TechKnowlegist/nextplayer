import { Link } from 'react-router-dom';
import { useControllerStatus } from '../engine/useController';
import { GAMES } from '../gamesData';

export default function Home() {
  const { connected } = useControllerStatus();

  return (
    <main className="np-page">
      <section className="np-hero">
        <div className="np-hero-stripes" aria-hidden="true">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <span key={n} className={`np-hero-stripe np-hero-stripe-${n}`} />
          ))}
        </div>
        <h1 className="np-hero-title">
          Grab a controller.
          <br />
          <span className="np-accent">Pick a game.</span>
        </h1>
        <p className="np-hero-sub">
          Free arcade games that play right in your browser, built controller-first for DualSense, Xbox, and keyboard.
        </p>
        <div className="np-hero-buttons">
          <a href="#games" className="np-btn np-btn-primary">Browse games</a>
          <Link to="/help" className="np-btn np-btn-secondary">How to play</Link>
          <Link to="/controller" className="np-btn np-btn-secondary">Test your controller</Link>
        </div>
        {connected && (
          <div className="np-hero-hint">D-pad to move · ✕ to select · ○ to go back</div>
        )}
      </section>

      <section id="games" className="np-games">
        <h2>Games</h2>
        <div className="np-game-grid">
          {GAMES.map((game) => {
            const Card = game.path ? Link : 'div';
            const cardProps = game.path
              ? { to: game.path }
              : { tabIndex: 0, 'data-nav': true };
            return (
              <Card key={game.id} className="np-game-card" {...cardProps}>
                <div className="np-game-art" aria-hidden="true">{game.emoji}</div>
                <div className="np-game-info">
                  <div className="np-game-top">
                    <h3>{game.title}</h3>
                    <span className={`np-tag ${game.tag === 'Play now' ? 'hot' : ''}`}>{game.tag}</span>
                  </div>
                  <p>{game.blurb}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </main>
  );
}
