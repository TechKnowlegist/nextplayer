import { Link } from 'react-router-dom';
import { useControllerStatus } from '../engine/useController';

const GAMES = [
  { id: 'snake', title: 'Snake', emoji: '🐍', tag: 'Play now', path: '/games/snake', blurb: "The classic. Eat, grow, and don't bite yourself." },
  { id: 'racer', title: 'Drift Racer', emoji: '🏎️', tag: 'Play now', path: '/games/drift-racer', blurb: 'Top-down laps, drifting, and boost. Built for triggers.' },
  { id: 'chomper', title: 'Maze Chomper', emoji: '👾', tag: 'Play now', path: '/games/maze-chomper', blurb: 'Eat every dot. Dodge every ghost.' },
  { id: 'shooter', title: 'Star Blaster', emoji: '🚀', tag: 'Play now', path: '/games/star-blaster', blurb: 'Wave after wave of arcade space combat.' },
  { id: 'pong', title: 'Pong', emoji: '🏓', tag: 'Play now', path: '/games/pong', blurb: 'The original. First to seven against the CPU.' },
  { id: 'breakout', title: 'Breakout', emoji: '🧱', tag: 'Play now', path: '/games/breakout', blurb: 'Bounce, break every brick, don’t drop the ball.' },
  { id: 'asteroids', title: 'Asteroids', emoji: '☄️', tag: 'Play now', path: '/games/asteroids', blurb: 'Rotate, thrust, blast rocks into smaller rocks.' },
  { id: 'flappy', title: 'Flappy', emoji: '🐤', tag: 'Play now', path: '/games/flappy', blurb: 'One button. Infinite regret. How far can you get?' },
  { id: 'simon', title: 'Simon', emoji: '🧠', tag: 'Play now', path: '/games/simon', blurb: 'Watch the pattern, repeat it, and hope your memory holds.' },
  { id: 'frogger', title: 'Frogger', emoji: '🐸', tag: 'Play now', path: '/games/frogger', blurb: 'Cross the traffic. Don’t become a hood ornament.' },
  { id: 'whack', title: 'Whack-a-Mole', emoji: '🔨', tag: 'Play now', path: '/games/whack-a-mole', blurb: '30 seconds. Fast hands only.' },
  { id: 'ttt', title: 'Tic-Tac-Toe', emoji: '⭕', tag: 'Play now', path: '/games/tic-tac-toe', blurb: 'Simple, fast, and the CPU actually tries to win.' },
  { id: '2048', title: '2048', emoji: '🔢', tag: 'Play now', path: '/games/2048', blurb: 'Slide, merge, chase the big tile.' },
  { id: 'memory', title: 'Memory Match', emoji: '🃏', tag: 'Play now', path: '/games/memory-match', blurb: 'Flip two, find the pairs, beat your best move count.' },
];

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
