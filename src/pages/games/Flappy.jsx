import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import input from '../../engine/input';
import { useControllerFrame, useMenuNav } from '../../engine/useController';
import { play } from '../../engine/sound';

const W = 400;
const H = 560;
const BIRD_X = 90;
const BIRD_SIZE = 14;
const GRAVITY = 0.0011;
const FLAP_VY = -0.36;
const PIPE_GAP = 150;
const PIPE_W = 56;
const PIPE_SPEED = 0.15;
const PIPE_INTERVAL = 1500;
const BEST_KEY = 'np-flappy-best';

function freshState() {
  return {
    birdY: H / 2,
    vy: 0,
    pipes: [],
    spawnTimer: 0,
    score: 0,
    lastTime: null,
    alive: true,
  };
}

export default function Flappy() {
  useMenuNav(false);
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const stateRef = useRef(freshState());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY)) || 0);
  const [gameOver, setGameOver] = useState(false);

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
  }

  function draw(s) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#2dd4bf';
    s.pipes.forEach((p) => {
      ctx.fillRect(p.x, 0, PIPE_W, p.gapY - PIPE_GAP / 2);
      ctx.fillRect(p.x, p.gapY + PIPE_GAP / 2, PIPE_W, H - (p.gapY + PIPE_GAP / 2));
    });

    ctx.fillStyle = '#facc15';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(BIRD_X, s.birdY, BIRD_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  useControllerFrame((state, time) => {
    const s = stateRef.current;
    if (s.lastTime == null) s.lastTime = time;
    const delta = Math.min(time - s.lastTime, 100);
    s.lastTime = time;

    const b = state.buttons;

    if (!s.alive) {
      if (b.cross.justPressed) reset();
      if (b.circle.justPressed) navigate('/');
      return;
    }

    if (b.cross.justPressed || b.up.justPressed) {
      s.vy = FLAP_VY;
    }
    s.vy += GRAVITY * delta;
    s.birdY += s.vy * delta;

    s.spawnTimer -= delta;
    if (s.spawnTimer <= 0) {
      s.spawnTimer = PIPE_INTERVAL;
      const gapY = 100 + Math.random() * (H - 200);
      s.pipes.push({ x: W, gapY, scored: false });
    }
    s.pipes.forEach((p) => (p.x -= PIPE_SPEED * delta));
    s.pipes = s.pipes.filter((p) => p.x > -PIPE_W);

    for (const p of s.pipes) {
      if (!p.scored && p.x + PIPE_W < BIRD_X) {
        p.scored = true;
        s.score += 1;
        setScore(s.score);
        play('eat');
      }
      const inX = BIRD_X + BIRD_SIZE / 2 > p.x && BIRD_X - BIRD_SIZE / 2 < p.x + PIPE_W;
      const inGap = s.birdY - BIRD_SIZE / 2 > p.gapY - PIPE_GAP / 2 && s.birdY + BIRD_SIZE / 2 < p.gapY + PIPE_GAP / 2;
      if (inX && !inGap) return endGame(s);
    }

    if (s.birdY < 0 || s.birdY > H) return endGame(s);

    draw(s);
  });

  return (
    <main className="np-page np-snake">
      <div className="np-snake-hud">
        <h1>Flappy</h1>
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

      <p className="np-snake-controls">✕ or Up to flap</p>
    </main>
  );
}
