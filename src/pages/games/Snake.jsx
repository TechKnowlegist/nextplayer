import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import input from '../../engine/input';
import { useControllerFrame, useMenuNav } from '../../engine/useController';
import { useSubmitScore } from '../../engine/useSubmitScore';
import { play, isMuted, toggleMuted } from '../../engine/sound';
import Leaderboard from '../../components/Leaderboard';
import ChatFeed from '../../components/ChatFeed';

const GRID = 20;
const CELL = 20;
const CANVAS_SIZE = GRID * CELL;
const TICK_MS = 120;
const BEST_KEY = 'np-snake-best';

function randomCell(exclude) {
  let cell;
  do {
    cell = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (exclude.some((s) => s.x === cell.x && s.y === cell.y));
  return cell;
}

function freshState() {
  const snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  return {
    snake,
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    food: randomCell(snake),
    score: 0,
    acc: 0,
    lastTime: null,
    alive: true,
  };
}

export default function Snake() {
  useMenuNav(false); // this page drives the D-pad itself
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const stateRef = useRef(freshState());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY)) || 0);
  const [gameOver, setGameOver] = useState(false);
  const [muted, setMuted] = useState(isMuted);
  const [boardVersion, setBoardVersion] = useState(0);
  const submitScore = useSubmitScore('snake');

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
    input.rumble({ strong: 0.7, weak: 0.7, duration: 300 });
    play('gameOver');
    submitScore(s.score);
    setBoardVersion((v) => v + 1);
  }

  function tick(s) {
    s.dir = s.nextDir;
    const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };

    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) return endGame(s);
    if (s.snake.some((seg) => seg.x === head.x && seg.y === head.y)) return endGame(s);

    s.snake.unshift(head);
    if (head.x === s.food.x && head.y === s.food.y) {
      s.score += 1;
      setScore(s.score);
      s.food = randomCell(s.snake);
      input.rumble({ strong: 0, weak: 0.4, duration: 60 });
      play('eat');
    } else {
      s.snake.pop();
    }
  }

  function draw(s) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(CANVAS_SIZE, i * CELL);
      ctx.stroke();
    }

    ctx.fillStyle = '#a855f7';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(s.food.x * CELL + CELL / 2, s.food.y * CELL + CELL / 2, CELL / 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    s.snake.forEach((seg, i) => {
      const t = i / Math.max(1, s.snake.length - 1);
      ctx.fillStyle = i === 0 ? '#22c55e' : t < 0.5 ? '#2dd4bf' : '#38bdf8';
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }

  useControllerFrame((state, time) => {
    const s = stateRef.current;
    if (s.lastTime == null) s.lastTime = time;
    // Cap the gap between frames — a backgrounded tab, GC pause, or just a
    // slow frame would otherwise dump a huge delta into the accumulator
    // below and fire a burst of ticks at once, teleporting the snake
    // several cells (often straight into a wall) in a single frame.
    const delta = Math.min(time - s.lastTime, TICK_MS * 3);
    s.lastTime = time;

    const b = state.buttons;
    const { lx, ly } = state.sticks;

    if (!s.alive) {
      if (b.cross.justPressed) reset();
      if (b.circle.justPressed) navigate('/');
      return;
    }

    let dir = null;
    if (b.up.pressed || ly < -0.5) dir = { x: 0, y: -1 };
    else if (b.down.pressed || ly > 0.5) dir = { x: 0, y: 1 };
    else if (b.left.pressed || lx < -0.5) dir = { x: -1, y: 0 };
    else if (b.right.pressed || lx > 0.5) dir = { x: 1, y: 0 };
    if (dir && !(dir.x === -s.dir.x && dir.y === -s.dir.y)) s.nextDir = dir;

    s.acc += delta;
    while (s.acc >= TICK_MS && s.alive) {
      s.acc -= TICK_MS;
      tick(s);
    }
    draw(s);
  });

  return (
    <main className="np-page np-snake">
      <div className="np-snake-hud">
        <h1>Snake</h1>
        <div className="np-snake-scores">
          <span>Score: {score}</span>
          <span>Best: {best}</span>
        </div>
        <button
          type="button"
          className="np-snake-mute"
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          onClick={() => setMuted(toggleMuted())}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      <div className="np-snake-wrap">
        <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="np-snake-canvas" />
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

      <p className="np-snake-controls">D-pad / left stick / arrow keys / WASD to move</p>

      <Leaderboard gameId="snake" refreshKey={boardVersion} />
      <ChatFeed channel="leaderboard:snake" title="Leaderboard Chat" placeholder="Talk trash, give tips..." />
    </main>
  );
}
