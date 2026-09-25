import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useControllerStatus } from '../engine/useController';
import { GAMES } from '../gamesData';
import { getRecentlyPlayed } from '../engine/recentlyPlayed';

export default function Home() {
  const { connected } = useControllerStatus();
  // Lazy-init reads localStorage fresh on every mount, which is exactly
  // when this matters — coming back to Home after playing something.
  const [recent] = useState(() =>
    getRecentlyPlayed()
      .map((id) => GAMES.find((g) => g.id === id))
      .filter(Boolean)
  );

  return (
    <main className="np-page">
      <section className="np-hero">
        <div className="np-hero-stripes" aria-hidden="true">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <span key={n} className={`np-hero-stripe np-hero-stripe-${n}`} />
          ))}
        </div>
        <h1 className="np-hero-title">
          Grab a controller            <br />
          <span className="np-accent">Pick a game.</span>
        </h1>
        <p className="np-hero-sub">
          Free arcade games that play right in your browser, optimized for DualSense, Xbox, keyboard and mobile.
          
        </p>
        <div className="np-hero-buttons">
          <a href="#games" className="np-btn np-btn-primary">Browse games</a>
          <Link to="/help" className="np-btn np-btn-secondary">How to play</Link>
          <Link to="/controller" className="np-btn np-btn-secondary">Test your controller</Link>
        </div>
        {connected && (
          <div className="np-hero-other">you can also play on you're Nintendo switch on the dns browser But it is not reliable.</div>
        )}
      </section>

      {recent.length > 0 && (
        <section className="np-games np-continue">
          <h2>Continue Playing</h2>
          <div className="np-game-grid np-continue-grid">
            {recent.map((game) => (
              <Link key={game.id} to={game.path} className="np-game-card np-continue-card">
                <div className="np-game-art" aria-hidden="true">{game.emoji}</div>
                <div className="np-game-info">
                  <h3>{game.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

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
