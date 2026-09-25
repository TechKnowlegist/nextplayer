import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import input from '../../engine/input';
import { useControllerFrame, useMenuNav } from '../../engine/useController';
import { useSubmitScore } from '../../engine/useSubmitScore';
import { play } from '../../engine/sound';
import Leaderboard from '../../components/Leaderboard';
import ChatFeed from '../../components/ChatFeed';

const W = 440;
const H = 520;
const PADDLE_W = 70;
const PADDLE_H = 10;
const PADDLE_Y = H - 30;
const PADDLE_SPEED = 0.38;
const BALL_SIZE = 8;
const BALL_SPEED_START = 0.22;
const COLS = 8;
const ROWS = 5;
const BRICK_W = (W - 40) / COLS;
const BRICK_H = 20;
const BEST_KEY = 'np-breakout-best';

function makeBricks() {
  const bricks = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      bricks.push({ x: 20 + c * BRICK_W, y: 50 + r * (BRICK_H + 6), alive: true, row: r });
    }
  }
  return bricks;
}

function freshState() {
  return {
    paddleX: W / 2 - PADDLE_W / 2,
    ball: { x: W / 2, y: PADDLE_Y - 20, vx: BALL_SPEED_START * 0.6, vy: -BALL_SPEED_START },
    bricks: makeBricks(),
    lives: 3,
    score: 0,
    lastTime: null,
    alive: true,
  };
}

const ROW_COLORS = ['#f87171', '#facc15', '#22c55e', '#2dd4bf', '#38bdf8'];

export default function Breakout() {
  useMenuNav(false);
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const stateRef = useRef(freshState());
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY)) || 0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [boardVersion, setBoardVersion] = useState(0);
  const submitScore = useSubmitScore('breakout');

  useEffect(() => {
    input.captureKeyboard(true);
    return () => input.captureKeyboard(false);
  }, []);

  function reset() {
    stateRef.current = freshState();
    setScore(0);
    setLives(3);
    setGameOver(false);
    setWon(false);
  }

  function endGame(s, didWin) {
    s.alive = false;
    if (didWin) setWon(true);
    else setGameOver(true);
    setBest((prev) => {
      const next = Math.max(prev, s.score);
      localStorage.setItem(BEST_KEY, String(next));
      return next;
    });
    play(didWin ? 'waveClear' : 'gameOver');
    if (!didWin) input.rumble({ strong: 0.7, weak: 0.7, duration: 300 });
    submitScore(s.score);
    setBoardVersion((v) => v + 1);
  }

  function draw(s) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, W, H);

    s.bricks.forEach((br) => {
      if (!br.alive) return;
      ctx.fillStyle = ROW_COLORS[br.row % ROW_COLORS.length];
      ctx.fillRect(br.x, br.y, BRICK_W - 4, BRICK_H);
    });

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(s.paddleX, PADDLE_Y, PADDLE_W, PADDLE_H);

    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(s.ball.x, s.ball.y, BALL_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
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

    let move = 0;
    if (b.left.pressed || lx < -0.3) move = -1;
    else if (b.right.pressed || lx > 0.3) move = 1;
    s.paddleX = Math.max(0, Math.min(W - PADDLE_W, s.paddleX + move * PADDLE_SPEED * delta));

    s.ball.x += s.ball.vx * delta;
    s.ball.y += s.ball.vy * delta;

    if (s.ball.x < BALL_SIZE / 2 || s.ball.x > W - BALL_SIZE / 2) {
      s.ball.vx *= -1;
      s.ball.x = Math.max(BALL_SIZE / 2, Math.min(W - BALL_SIZE / 2, s.ball.x));
    }
    if (s.ball.y < BALL_SIZE / 2) {
      s.ball.vy *= -1;
      s.ball.y = BALL_SIZE / 2;
    }

    if (
      s.ball.vy > 0 &&
      s.ball.y + BALL_SIZE / 2 > PADDLE_Y &&
      s.ball.y < PADDLE_Y + PADDLE_H &&
      s.ball.x > s.paddleX &&
      s.ball.x < s.paddleX + PADDLE_W
    ) {
      s.ball.vy *= -1;
      s.ball.vx += ((s.ball.x - (s.paddleX + PADDLE_W / 2)) / PADDLE_W) * 0.4;
      s.ball.y = PADDLE_Y - BALL_SIZE / 2;
      play('hit');
    }

    for (const br of s.bricks) {
      if (!br.alive) continue;
      if (
        s.ball.x + BALL_SIZE / 2 > br.x &&
        s.ball.x - BALL_SIZE / 2 < br.x + BRICK_W - 4 &&
        s.ball.y + BALL_SIZE / 2 > br.y &&
        s.ball.y - BALL_SIZE / 2 < br.y + BRICK_H
      ) {
        br.alive = false;
        s.ball.vy *= -1;
        s.score += 10;
        setScore(s.score);
        play('eat');
        break;
      }
    }

    if (s.ball.y > H) {
      s.lives -= 1;
      setLives(s.lives);
      if (s.lives <= 0) {
        endGame(s, false);
      } else {
        s.ball = { x: W / 2, y: PADDLE_Y - 20, vx: BALL_SPEED_START * 0.6, vy: -BALL_SPEED_START };
        input.rumble({ strong: 0.5, weak: 0.5, duration: 150 });
      }
    }

    if (s.alive && s.bricks.every((br) => !br.alive)) endGame(s, true);

    draw(s);
  });

  const done = gameOver || won;

  return (
    <main className="np-page np-snake">
      <div className="np-snake-hud">
        <h1>Breakout</h1>
        <div className="np-snake-scores">
          <span>Score: {score}</span>
          <span>Lives: {lives}</span>
          <span>Best: {best}</span>
        </div>
      </div>

      <div className="np-snake-wrap">
        <canvas ref={canvasRef} width={W} height={H} className="np-snake-canvas" />
        {done && (
          <div className="np-snake-overlay">
            <h2>{won ? 'You Win!' : 'Game Over'}</h2>
            <p>Score: {score}{score >= best && score > 0 ? ' — new best!' : ''}</p>
            <div className="np-snake-overlay-actions">
              <button className="np-btn np-btn-primary" onClick={reset}>Play Again</button>
              <Link to="/" className="np-btn np-btn-secondary">Back to Games</Link>
            </div>
            <span className="np-snake-hint">✕ to play again · ○ to go back</span>
          </div>
        )}
      </div>

      <p className="np-snake-controls">Left/right or stick to move the paddle</p>

      <Leaderboard gameId="breakout" refreshKey={boardVersion} />
      <ChatFeed channel="leaderboard:breakout" title="Leaderboard Chat" placeholder="Talk trash, give tips..." />
    </main>
  );
}
