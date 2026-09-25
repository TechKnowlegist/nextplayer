import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import input from '../../engine/input';
import { useControllerFrame, useMenuNav } from '../../engine/useController';
import { useSubmitScore } from '../../engine/useSubmitScore';
import { formatMoves } from '../../engine/scoreFormat';
import { play } from '../../engine/sound';
import Leaderboard from '../../components/Leaderboard';
import ChatFeed from '../../components/ChatFeed';

const SYMBOLS = ['🐍', '🏎️', '👾', '🚀', '🎮', '⭐', '🔥', '💎'];
const COLS = 4;
const BEST_KEY = 'np-memory-best';

function shuffledDeck() {
  const deck = [...SYMBOLS, ...SYMBOLS].map((sym, i) => ({ id: i, sym }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export default function MemoryMatch() {
  useMenuNav(false);
  const navigate = useNavigate();
  const [deck, setDeck] = useState(shuffledDeck);
  const [matched, setMatched] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const locked = flipped.length === 2;
  const [cursor, setCursor] = useState(0);
  const [moves, setMoves] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY)) || null);
  const [won, setWon] = useState(false);
  const [boardVersion, setBoardVersion] = useState(0);
  const submitScore = useSubmitScore('memory-match');

  useEffect(() => {
    input.captureKeyboard(true);
    return () => input.captureKeyboard(false);
  }, []);

  function reset() {
    setDeck(shuffledDeck());
    setMatched([]);
    setFlipped([]);
    setCursor(0);
    setMoves(0);
    setWon(false);
  }

  useEffect(() => {
    if (flipped.length !== 2) return;
    const [a, b] = flipped;
    const t = setTimeout(() => {
      if (deck[a].sym === deck[b].sym) {
        setMatched((prev) => {
          const next = [...prev, a, b];
          if (next.length === deck.length) {
            setWon(true);
            play('waveClear');
            setBest((prevBest) => {
              const nextBest = prevBest == null ? moves + 1 : Math.min(prevBest, moves + 1);
              localStorage.setItem(BEST_KEY, String(nextBest));
              return nextBest;
            });
            submitScore(moves + 1);
            setBoardVersion((v) => v + 1);
          } else {
            play('eat');
          }
          return next;
        });
      }
      setFlipped([]);
    }, 700);
    return () => clearTimeout(t);
  }, [flipped, deck, moves, submitScore]);

  useControllerFrame((state) => {
    const b = state.buttons;
    if (won) {
      if (b.cross.justPressed) reset();
      if (b.circle.justPressed) navigate('/');
      return;
    }
    if (locked) return;

    if (b.up.justPressed) setCursor((c) => (c - COLS + deck.length) % deck.length);
    else if (b.down.justPressed) setCursor((c) => (c + COLS) % deck.length);
    else if (b.left.justPressed) setCursor((c) => (c - 1 + deck.length) % deck.length);
    else if (b.right.justPressed) setCursor((c) => (c + 1) % deck.length);

    if (b.cross.justPressed) {
      if (matched.includes(cursor) || flipped.includes(cursor) || flipped.length >= 2) return;
      const next = [...flipped, cursor];
      setFlipped(next);
      if (next.length === 2) setMoves((m) => m + 1);
    }
  });

  return (
    <main className="np-page np-snake">
      <div className="np-snake-hud">
        <h1>Memory Match</h1>
        <div className="np-snake-scores">
          <span>Moves: {moves}</span>
          <span>Best: {best ?? '--'}</span>
        </div>
      </div>

      <div className="np-snake-wrap np-memory-wrap">
        <div className="np-memory-grid">
          {deck.map((card, i) => {
            const isUp = matched.includes(i) || flipped.includes(i);
            return (
              <div
                key={card.id}
                className={`np-memory-card ${isUp ? 'up' : ''} ${matched.includes(i) ? 'matched' : ''} ${cursor === i ? 'cursor' : ''}`}
              >
                {isUp ? card.sym : ''}
              </div>
            );
          })}
        </div>
        {won && (
          <div className="np-snake-overlay">
            <h2>Solved!</h2>
            <p>Moves: {moves}{best === moves ? ' — new best!' : ''}</p>
            <div className="np-snake-overlay-actions">
              <button className="np-btn np-btn-primary" onClick={reset}>Play Again</button>
              <Link to="/" className="np-btn np-btn-secondary">Back to Games</Link>
            </div>
            <span className="np-snake-hint">✕ to play again · ○ to go back</span>
          </div>
        )}
      </div>

      <p className="np-snake-controls">D-pad to move the cursor · ✕ to flip a card</p>

      <Leaderboard gameId="memory-match" refreshKey={boardVersion} ascending format={formatMoves} />
      <ChatFeed channel="leaderboard:memory-match" title="Leaderboard Chat" placeholder="Talk trash, give tips..." />
    </main>
  );
}
