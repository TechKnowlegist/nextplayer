import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import input from '../../engine/input';
import { useControllerFrame, useMenuNav } from '../../engine/useController';
import { useSubmitScore } from '../../engine/useSubmitScore';
import { play } from '../../engine/sound';
import Leaderboard from '../../components/Leaderboard';
import ChatFeed from '../../components/ChatFeed';

const COLS = 11;
const ROWS = 11;
const CELL = 36;
const W = COLS * CELL;
const H = ROWS * CELL;
const TICK_MS = 130;
const BEST_KEY = 'np-frogger-best';

// Row 0 = top (goal), row ROWS-1 = start. Lanes 1..ROWS-2 carry traffic.
function makeLanes() {
  const lanes = [];
  for (let r = 1; r < ROWS - 1; r++) {
    const dir = r % 2 === 0 ? 1 : -1;
    const speed = 0.02 + (r % 4) * 0.012;
    const gap = 3 + (r % 3);
    const cars = [];
    for (let i = 0; i < gap; i++) {
      cars.push({ pos: (i / gap) * COLS + Math.random() * 2 });
    }
    lanes.push({ row: r, dir, speed, cars });
  }
  return lanes;
}

function freshState() {
  return {
    player: { x: Math.floor(COLS / 2), y: ROWS - 1 },
    lanes: makeLanes(),
    dir: { x: 0, y: 0 },
    nextDir: { x: 0, y: 0 },
    score: 0,
    crossings: 0,
    acc: 0,
    lastTime: null,
    alive: true,
  };
}

export default function Frogger() {
  useMenuNav(false);
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const stateRef = useRef(freshState());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY)) || 0);
  const [gameOver, setGameOver] = useState(false);
  const [boardVersion, setBoardVersion] = useState(0);
  const submitScore = useSubmitScore('frogger');

  useEffect(() => {
    input.captureKeyboard(true);
    return () => input.captureKeyboard(false);
  }, []);

  function reset() {
    stateRef.current = freshState();
    setScore(0);
    setGameOver(false);
  }

  function endGame(s) {
    s.alive = false;
    setGameOver(true);
    setBest((prev) => {
      const next = Math.max(prev, s.score);
      localStorage.setItem(BEST_KEY, String(next));
      return next;
    });
    play('gameOver');
    input.rumble({ strong: 0.6, weak: 0.6, duration: 200 });
    submitScore(s.score);
    setBoardVersion((v) => v + 1);
  }

  function draw(s) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(34,197,94,0.12)';
    ctx.fillRect(0, 0, W, CELL);

    ctx.fillStyle = 'rgba(45,212,191,0.06)';
    s.lanes.forEach((lane) => ctx.fillRect(0, lane.row * CELL, W, CELL));

    ctx.fillStyle = '#a855f7';
    s.lanes.forEach((lane) => {
      lane.cars.forEach((car) => {
        const x = (((car.pos % COLS) + COLS) % COLS) * CELL;
        ctx.fillRect(x + 2, lane.row * CELL + 6, CELL - 4, CELL - 12);
      });
    });

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(s.player.x * CELL + CELL / 2, s.player.y * CELL + CELL / 2, CELL / 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  function tick(s) {
    const canMove = (dir) => {
      if (dir.x === 0 && dir.y === 0) return false;
      const nx = s.player.x + dir.x;
      const ny = s.player.y + dir.y;
      return nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS;
    };
    if (canMove(s.nextDir)) {
      s.player.x += s.nextDir.x;
      s.player.y += s.nextDir.y;
      if (s.nextDir.y < 0) {
        s.score += 10;
        setScore(s.score);
        play('eat');
      }
      s.nextDir = { x: 0, y: 0 };

      if (s.player.y === 0) {
        s.crossings += 1;
        s.score += 50;
        setScore(s.score);
        play('waveClear');
        s.player = { x: Math.floor(COLS / 2), y: ROWS - 1 };
      }
    }
  }

  useControllerFrame((state, time) => {
    const s = stateRef.current;
    if (s.lastTime == null) s.lastTime = time;
    const delta = Math.min(time - s.lastTime, TICK_MS * 3);
    s.lastTime = time;

    const b = state.buttons;
    const { lx, ly } = state.sticks;

    if (!s.alive) {
      if (b.cross.justPressed) reset();
      if (b.circle.justPressed) navigate('/');
      return;
    }

    if (b.up.justPressed || ly < -0.5) s.nextDir = { x: 0, y: -1 };
    else if (b.down.justPressed || ly > 0.5) s.nextDir = { x: 0, y: 1 };
    else if (b.left.justPressed || lx < -0.5) s.nextDir = { x: -1, y: 0 };
    else if (b.right.justPressed || lx > 0.5) s.nextDir = { x: 1, y: 0 };

    s.lanes.forEach((lane) => {
      lane.cars.forEach((car) => {
        car.pos += lane.dir * lane.speed * (delta / TICK_MS);
      });
    });

    s.acc += delta;
    while (s.acc >= TICK_MS) {
      s.acc -= TICK_MS;
      tick(s);
    }

    const lane = s.lanes.find((l) => l.row === s.player.y);
    if (lane) {
      for (const car of lane.cars) {
        const cx = ((car.pos % COLS) + COLS) % COLS;
        if (Math.abs(cx - s.player.x) < 0.6) {
          return endGame(s);
        }
      }
    }

    draw(s);
  });

  return (
    <main className="np-page np-snake">
      <div className="np-snake-hud">
        <h1>Frogger</h1>
        <div className="np-snake-scores">
          <span>Score: {score}</span>
          <span>Best: {best}</span>
        </div>
      </div>

      <div className="np-snake-wrap">
        <canvas ref={canvasRef} width={W} height={H} className="np-snake-canvas" />
        {gameOver && (
          <div className="np-snake-overlay">
            <h2>Game Over</h2>
            <p>Score: {score}{score >= best && score > 0 ? ' — new best!' : ''}</p>
            <div className="np-snake-overlay-actions">
              <button className="np-btn np-btn-primary" onClick={reset}>Play Again</button>
              <Link to="/" className="np-btn np-btn-secondary">Back to Games</Link>
            </div>
            <span className="np-snake-hint">✕ to play again · ○ to go back</span>
          </div>
        )}
      </div>

      <p className="np-snake-controls">D-pad / left stick / arrow keys / WASD — cross the traffic to score</p>

      <Leaderboard gameId="frogger" refreshKey={boardVersion} />
      <ChatFeed channel="leaderboard:frogger" title="Leaderboard Chat" placeholder="Talk trash, give tips..." />
    </main>
  );
}
