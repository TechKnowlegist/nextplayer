import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import input from '../../engine/input';
import { useControllerFrame, useMenuNav } from '../../engine/useController';
import { useSubmitScore } from '../../engine/useSubmitScore';
import { play } from '../../engine/sound';
import Leaderboard from '../../components/Leaderboard';
import ChatFeed from '../../components/ChatFeed';

const W = 480;
const H = 480;
const TURN_RATE = 0.0035;
const THRUST = 0.00035;
const MAX_SPEED = 0.28;
const DRAG = 0.0008;
const BULLET_SPEED = 0.4;
const FIRE_COOLDOWN = 220;
const SHIP_RADIUS = 10;
const BEST_KEY = 'np-asteroids-best';

function wrap(v, max) {
  if (v < 0) return v + max;
  if (v > max) return v - max;
  return v;
}

function makeAsteroid(size, x, y) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 0.03 + Math.random() * 0.05;
  return {
    x: x ?? Math.random() * W,
    y: y ?? Math.random() * H,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size, // 3 = large, 2 = medium, 1 = small
    radius: size * 14,
    spin: (Math.random() - 0.5) * 0.002,
    rotation: 0,
  };
}

function spawnWave(wave) {
  const count = 3 + Math.min(wave, 5);
  const asteroids = [];
  for (let i = 0; i < count; i++) {
    // keep them away from the ship's spawn point at center
    let x, y;
    do {
      x = Math.random() * W;
      y = Math.random() * H;
    } while (Math.hypot(x - W / 2, y - H / 2) < 100);
    asteroids.push(makeAsteroid(3, x, y));
  }
  return asteroids;
}

function freshState() {
  return {
    ship: { x: W / 2, y: H / 2, heading: -Math.PI / 2, vx: 0, vy: 0 },
    bullets: [],
    asteroids: spawnWave(1),
    wave: 1,
    lives: 3,
    score: 0,
    fireTimer: 0,
    invuln: 1500,
    lastTime: null,
    alive: true,
  };
}

export default function Asteroids() {
  useMenuNav(false);
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const stateRef = useRef(freshState());
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY)) || 0);
  const [gameOver, setGameOver] = useState(false);
  const [boardVersion, setBoardVersion] = useState(0);
  const submitScore = useSubmitScore('asteroids');

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
    input.rumble({ strong: 0.8, weak: 0.8, duration: 350 });
    submitScore(s.score);
    setBoardVersion((v) => v + 1);
  }

  function draw(s) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#facc15';
    s.bullets.forEach((bl) => {
      ctx.beginPath();
      ctx.arc(bl.x, bl.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    s.asteroids.forEach((a) => {
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
      ctx.stroke();
    });

    if (s.invuln <= 0 || Math.floor(s.invuln / 100) % 2 === 0) {
      ctx.save();
      ctx.translate(s.ship.x, s.ship.y);
      ctx.rotate(s.ship.heading);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(SHIP_RADIUS, 0);
      ctx.lineTo(-SHIP_RADIUS * 0.7, SHIP_RADIUS * 0.7);
      ctx.lineTo(-SHIP_RADIUS * 0.3, 0);
      ctx.lineTo(-SHIP_RADIUS * 0.7, -SHIP_RADIUS * 0.7);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  useControllerFrame((state, time) => {
    const s = stateRef.current;
    if (s.lastTime == null) s.lastTime = time;
    const delta = Math.min(time - s.lastTime, 100);
    s.lastTime = time;

    const b = state.buttons;
    const { lx } = state.sticks;

    if (!s.alive) {
      if (b.cross.justPressed) reset();
      if (b.circle.justPressed) navigate('/');
      return;
    }

    if (s.invuln > 0) s.invuln -= delta;

    let turn = 0;
    if (b.left.pressed || lx < -0.3) turn = -1;
    else if (b.right.pressed || lx > 0.3) turn = 1;
    s.ship.heading += turn * TURN_RATE * delta;

    const thrusting = b.up.pressed || b.r2.pressed;
    if (thrusting) {
      s.ship.vx += Math.cos(s.ship.heading) * THRUST * delta;
      s.ship.vy += Math.sin(s.ship.heading) * THRUST * delta;
    }
    s.ship.vx *= Math.max(0, 1 - DRAG * delta);
    s.ship.vy *= Math.max(0, 1 - DRAG * delta);
    const spd = Math.hypot(s.ship.vx, s.ship.vy);
    if (spd > MAX_SPEED) {
      s.ship.vx = (s.ship.vx / spd) * MAX_SPEED;
      s.ship.vy = (s.ship.vy / spd) * MAX_SPEED;
    }
    s.ship.x = wrap(s.ship.x + s.ship.vx * delta, W);
    s.ship.y = wrap(s.ship.y + s.ship.vy * delta, H);

    s.fireTimer -= delta;
    if (b.cross.pressed && s.fireTimer <= 0) {
      s.fireTimer = FIRE_COOLDOWN;
      s.bullets.push({
        x: s.ship.x,
        y: s.ship.y,
        vx: Math.cos(s.ship.heading) * BULLET_SPEED,
        vy: Math.sin(s.ship.heading) * BULLET_SPEED,
        life: 900,
      });
      play('shoot');
    }

    s.bullets.forEach((bl) => {
      bl.x = wrap(bl.x + bl.vx * delta, W);
      bl.y = wrap(bl.y + bl.vy * delta, H);
      bl.life -= delta;
    });
    s.bullets = s.bullets.filter((bl) => bl.life > 0);

    s.asteroids.forEach((a) => {
      a.x = wrap(a.x + a.vx * delta, W);
      a.y = wrap(a.y + a.vy * delta, H);
      a.rotation += a.spin * delta;
    });

    const nextAsteroids = [];
    for (const a of s.asteroids) {
      let hit = false;
      for (const bl of s.bullets) {
        if (Math.hypot(bl.x - a.x, bl.y - a.y) < a.radius) {
          hit = true;
          bl.life = -1;
          s.score += (4 - a.size) * 20;
          setScore(s.score);
          play('hit');
          break;
        }
      }
      if (hit) {
        if (a.size > 1) {
          nextAsteroids.push(makeAsteroid(a.size - 1, a.x, a.y));
          nextAsteroids.push(makeAsteroid(a.size - 1, a.x, a.y));
        }
      } else {
        nextAsteroids.push(a);
      }
    }
    s.asteroids = nextAsteroids;
    s.bullets = s.bullets.filter((bl) => bl.life > 0);

    if (s.invuln <= 0) {
      for (const a of s.asteroids) {
        if (Math.hypot(a.x - s.ship.x, a.y - s.ship.y) < a.radius + SHIP_RADIUS * 0.6) {
          s.lives -= 1;
          setLives(s.lives);
          input.rumble({ strong: 0.6, weak: 0.6, duration: 200 });
          if (s.lives <= 0) return endGame(s);
          s.ship = { x: W / 2, y: H / 2, heading: -Math.PI / 2, vx: 0, vy: 0 };
          s.invuln = 1500;
          break;
        }
      }
    }

    if (s.alive && s.asteroids.length === 0) {
      s.wave += 1;
      setWave(s.wave);
      s.asteroids = spawnWave(s.wave);
      play('waveClear');
    }

    draw(s);
  });

  return (
    <main className="np-page np-snake">
      <div className="np-snake-hud">
        <h1>Asteroids</h1>
        <div className="np-snake-scores">
          <span>Score: {score}</span>
          <span>Wave: {wave}</span>
          <span>Lives: {lives}</span>
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

      <p className="np-snake-controls">Left/right to turn · Up or R2 to thrust · ✕ to fire</p>

      <Leaderboard gameId="asteroids" refreshKey={boardVersion} />
      <ChatFeed channel="leaderboard:asteroids" title="Leaderboard Chat" placeholder="Talk trash, give tips..." />
    </main>
  );
}
