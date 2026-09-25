import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import input from '../../engine/input';
import { useControllerFrame, useMenuNav } from '../../engine/useController';
import { useSubmitScore } from '../../engine/useSubmitScore';
import { play } from '../../engine/sound';
import Leaderboard from '../../components/Leaderboard';
import ChatFeed from '../../components/ChatFeed';

const GRID = 3;
const ROUND_MS = 30000;
const BEST_KEY = 'np-whack-best';

function randomCell(exclude) {
  let cell;
  do {
    cell = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (exclude && cell.x === exclude.x && cell.y === exclude.y);
  return cell;
}

function freshState() {
  return {
    moleTimer: 1400,
    score: 0,
    timeLeft: ROUND_MS,
    lastTime: null,
    alive: true,
  };
}

export default function WhackAMole() {
  useMenuNav(false);
  const navigate = useNavigate();
  const stateRef = useRef(freshState());
  const [cursor, setCursor] = useState({ x: 1, y: 1 });
  const [mole, setMole] = useState(() => randomCell(null));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY)) || 0);
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);
  const [gameOver, setGameOver] = useState(false);
  const [boardVersion, setBoardVersion] = useState(0);
  const submitScore = useSubmitScore('whack-a-mole');

  useEffect(() => {
    input.captureKeyboard(true);
    return () => input.captureKeyboard(false);
  }, []);

  function reset() {
    stateRef.current = freshState();
    setCursor({ x: 1, y: 1 });
    setMole(randomCell(null));
    setScore(0);
    setTimeLeft(ROUND_MS);
    setGameOver(false);
  }

  useControllerFrame((state, time) => {
    const s = stateRef.current;
    if (s.lastTime == null) s.lastTime = time;
    const delta = Math.min(time - s.lastTime, 100);
    s.lastTime = time;

    const b = state.buttons;
    const { lx, ly } = state.sticks;

    if (!s.alive) {
      if (b.cross.justPressed) reset();
      if (b.circle.justPressed) navigate('/');
      return;
    }

    let cx = cursor.x;
    let cy = cursor.y;
    if (b.up.justPressed || ly < -0.5) cy = Math.max(0, cy - 1);
    else if (b.down.justPressed || ly > 0.5) cy = Math.min(GRID - 1, cy + 1);
    if (b.left.justPressed || lx < -0.5) cx = Math.max(0, cx - 1);
    else if (b.right.justPressed || lx > 0.5) cx = Math.min(GRID - 1, cx + 1);
    if (cx !== cursor.x || cy !== cursor.y) setCursor({ x: cx, y: cy });

    if (b.cross.justPressed) {
      if (cx === mole.x && cy === mole.y) {
        s.score += 1;
        setScore(s.score);
        play('hit');
        input.rumble({ strong: 0, weak: 0.3, duration: 60 });
        setMole(randomCell(mole));
        s.moleTimer = Math.max(500, 1400 - s.score * 30);
      }
    }

    s.moleTimer -= delta;
    if (s.moleTimer <= 0) {
      setMole((prev) => randomCell(prev));
      s.moleTimer = Math.max(500, 1400 - s.score * 30);
    }

    s.timeLeft -= delta;
    if (s.timeLeft <= 0) {
      s.timeLeft = 0;
      s.alive = false;
      setGameOver(true);
      setBest((prev) => {
        const next = Math.max(prev, s.score);
        localStorage.setItem(BEST_KEY, String(next));
        return next;
      });
      play('gameOver');
      submitScore(s.score);
      setBoardVersion((v) => v + 1);
    }
    setTimeLeft(Math.ceil(s.timeLeft / 100) * 100);
  });

  return (
    <main className="np-page np-snake">
      <div className="np-snake-hud">
        <h1>Whack-a-Mole</h1>
        <div className="np-snake-scores">
          <span>Score: {score}</span>
          <span>Time: {(timeLeft / 1000).toFixed(1)}s</span>
          <span>Best: {best}</span>
        </div>
      </div>

      <div className="np-snake-wrap np-whack-wrap">
        <div className="np-whack-grid">
          {Array.from({ length: GRID * GRID }).map((_, i) => {
            const x = i % GRID;
            const y = Math.floor(i / GRID);
            const isMole = mole.x === x && mole.y === y && !gameOver;
            const isCursor = cursor.x === x && cursor.y === y;
            return (
              <div key={i} className={`np-whack-hole ${isCursor ? 'cursor' : ''}`}>
                {isMole && <div className="np-whack-mole" />}
              </div>
            );
          })}
        </div>
        {gameOver && (
          <div className="np-snake-overlay">
            <h2>Time's Up!</h2>
            <p>Score: {score}{score >= best && score > 0 ? ' — new best!' : ''}</p>
            <div className="np-snake-overlay-actions">
              <button className="np-btn np-btn-primary" onClick={reset}>Play Again</button>
              <Link to="/" className="np-btn np-btn-secondary">Back to Games</Link>
            </div>
            <span className="np-snake-hint">✕ to play again · ○ to go back</span>
          </div>
        )}
      </div>

      <p className="np-snake-controls">D-pad / stick to move the cursor · ✕ to whack</p>

      <Leaderboard gameId="whack-a-mole" refreshKey={boardVersion} />
      <ChatFeed channel="leaderboard:whack-a-mole" title="Leaderboard Chat" placeholder="Talk trash, give tips..." />
    </main>
  );
}
