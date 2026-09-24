import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import input from '../../engine/input';
import { useControllerFrame, useMenuNav } from '../../engine/useController';
import { play } from '../../engine/sound';

const CANVAS_W = 420;
const CANVAS_H = 560;
const PLAYER_SPEED = 0.3;
const PLAYER_Y = CANVAS_H - 40;
const PLAYER_SIZE = 16;
const BULLET_SPEED = 0.55;
const ENEMY_BULLET_SPEED = 0.22;
const FIRE_COOLDOWN = 260;
const ENEMY_SIZE = 14;
const HIT_RADIUS = ENEMY_SIZE + 4;
const BEST_KEY = 'np-blaster-best';

function spawnWave(wave) {
  const cols = 6;
  const rows = Math.min(3 + Math.floor((wave - 1) / 2), 5); // more enemies every 2 waves, capped
  const spacingX = (CANVAS_W - 80) / (cols - 1);
  const enemies = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      enemies.push({
        baseX: 40 + c * spacingX,
        x: 40 + c * spacingX,
        y: 40 + r * 36,
        phase: Math.random() * Math.PI * 2,
        alive: true,
      });
    }
  }
  return enemies;
}

function freshState() {
  return {
    player: { x: CANVAS_W / 2 },
    bullets: [],
    enemyBullets: [],
    enemies: spawnWave(1),
    wave: 1,
    lives: 3,
    score: 0,
    fireTimer: 0,
    elapsed: 0,
    lastTime: null,
    alive: true,
  };
}

export default function StarBlaster() {
  useMenuNav(false);
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const stateRef = useRef(freshState());
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY)) || 0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    input.captureKeyboard(true);
    return () => input.captureKeyboard(false);
  }, []);

  function reset() {
    stateRef.current = freshState();
    setScore(0);
    setLives(3);
    setWave(1);
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
    input.rumble({ strong: 0.7, weak: 0.7, duration: 300 });
  }

  function draw(s) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = '#facc15';
    s.bullets.forEach((b) => ctx.fillRect(b.x - 2, b.y - 8, 4, 10));

    ctx.fillStyle = '#f87171';
    s.enemyBullets.forEach((b) => ctx.fillRect(b.x - 2, b.y - 6, 4, 8));

    s.enemies.forEach((e) => {
      if (!e.alive) return;
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(e.x, e.y, ENEMY_SIZE / 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    ctx.save();
    ctx.translate(s.player.x, PLAYER_Y);
    ctx.fillStyle = '#22c55e';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, -PLAYER_SIZE);
    ctx.lineTo(PLAYER_SIZE * 0.8, PLAYER_SIZE * 0.7);
    ctx.lineTo(-PLAYER_SIZE * 0.8, PLAYER_SIZE * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  useControllerFrame((state, time) => {
    const s = stateRef.current;
    if (s.lastTime == null) s.lastTime = time;
    const delta = Math.min(time - s.lastTime, 100);
    s.lastTime = time;
    s.elapsed += delta;

    const b = state.buttons;
    const { lx } = state.sticks;

    if (!s.alive) {
      if (b.cross.justPressed) reset();
      if (b.circle.justPressed) navigate('/');
      return;
    }

    let moveX = 0;
    if (b.left.pressed || lx < -0.3) moveX = -1;
    else if (b.right.pressed || lx > 0.3) moveX = 1;
    s.player.x = Math.max(20, Math.min(CANVAS_W - 20, s.player.x + moveX * PLAYER_SPEED * delta));

    s.fireTimer -= delta;
    if ((b.cross.pressed || b.r2.pressed) && s.fireTimer <= 0) {
      s.fireTimer = FIRE_COOLDOWN;
      s.bullets.push({ x: s.player.x, y: PLAYER_Y - PLAYER_SIZE });
      play('shoot');
    }

    s.bullets.forEach((bl) => (bl.y -= BULLET_SPEED * delta));
    s.bullets = s.bullets.filter((bl) => bl.y > -10);

    const descend = 0.02 + s.wave * 0.003;
    s.enemies.forEach((e) => {
      if (!e.alive) return;
      e.y += descend * delta;
      e.x = e.baseX + Math.sin(s.elapsed / 500 + e.phase) * 24;
      if (Math.random() < 0.0006 * delta) {
        s.enemyBullets.push({ x: e.x, y: e.y });
      }
    });

    s.enemyBullets.forEach((bl) => (bl.y += ENEMY_BULLET_SPEED * delta));
    s.enemyBullets = s.enemyBullets.filter((bl) => bl.y < CANVAS_H + 10);

    for (const bl of s.bullets) {
      for (const e of s.enemies) {
        if (!e.alive) continue;
        if (Math.hypot(bl.x - e.x, bl.y - e.y) < HIT_RADIUS) {
          e.alive = false;
          bl.y = -100; // mark for removal
          s.score += 10;
          setScore(s.score);
          play('hit');
        }
      }
    }
    s.bullets = s.bullets.filter((bl) => bl.y > -50);

    for (const e of s.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - s.player.x, e.y - PLAYER_Y) < HIT_RADIUS + 4 || e.y > CANVAS_H) {
        e.alive = false;
        s.lives -= 1;
        setLives(s.lives);
        input.rumble({ strong: 0.5, weak: 0.5, duration: 150 });
        if (s.lives <= 0) return endGame(s);
      }
    }

    for (const bl of s.enemyBullets) {
      if (Math.hypot(bl.x - s.player.x, bl.y - PLAYER_Y) < 12) {
        bl.y = CANVAS_H + 100;
        s.lives -= 1;
        setLives(s.lives);
        input.rumble({ strong: 0.5, weak: 0.5, duration: 150 });
        if (s.lives <= 0) return endGame(s);
      }
    }
    s.enemyBullets = s.enemyBullets.filter((bl) => bl.y < CANVAS_H + 10);

    if (s.alive && s.enemies.every((e) => !e.alive)) {
      s.wave += 1;
      setWave(s.wave);
      s.enemies = spawnWave(s.wave);
      play('waveClear');
    }

    draw(s);
  });

  return (
    <main className="np-page np-snake">
      <div className="np-snake-hud">
        <h1>Star Blaster</h1>
        <div className="np-snake-scores">
          <span>Score: {score}</span>
          <span>Wave: {wave}</span>
          <span>Lives: {lives}</span>
          <span>Best: {best}</span>
        </div>
      </div>

      <div className="np-snake-wrap">
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="np-snake-canvas" />
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

      <p className="np-snake-controls">Left/right or stick to move · ✕ or R2 to fire</p>
    </main>
  );
}
