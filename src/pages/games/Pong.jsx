import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import input from '../../engine/input';
import { useControllerFrame, useMenuNav } from '../../engine/useController';
import { play } from '../../engine/sound';

const W = 480;
const H = 320;
const PADDLE_H = 64;
const PADDLE_W = 10;
const PADDLE_SPEED = 0.35;
const AI_SPEED = 0.22;
const BALL_SIZE = 8;
const BALL_SPEED_START = 0.2;
const WIN_SCORE = 7;

function freshState() {
  return {
    playerY: H / 2 - PADDLE_H / 2,
    aiY: H / 2 - PADDLE_H / 2,
    ball: { x: W / 2, y: H / 2, vx: BALL_SPEED_START, vy: 0.08 },
    playerScore: 0,
    aiScore: 0,
    lastTime: null,
    alive: true,
  };
}

export default function Pong() {
  useMenuNav(false);
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const stateRef = useRef(freshState());
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  useEffect(() => {
    input.captureKeyboard(true);
    return () => input.captureKeyboard(false);
  }, []);

  function reset() {
    stateRef.current = freshState();
    setPlayerScore(0);
    setAiScore(0);
    setGameOver(false);
    setWon(false);
  }

  function serve(s, towardPlayer) {
    s.ball = { x: W / 2, y: H / 2, vx: (towardPlayer ? -1 : 1) * BALL_SPEED_START, vy: (Math.random() * 2 - 1) * 0.12 };
  }

  function draw(s) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(14, s.playerY, PADDLE_W, PADDLE_H);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(W - 14 - PADDLE_W, s.aiY, PADDLE_W, PADDLE_H);

    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.fillRect(s.ball.x - BALL_SIZE / 2, s.ball.y - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE);
    ctx.shadowBlur = 0;
  }

  useControllerFrame((state, time) => {
    const s = stateRef.current;
    if (s.lastTime == null) s.lastTime = time;
    const delta = Math.min(time - s.lastTime, 100);
    s.lastTime = time;

    const b = state.buttons;
    const { ly } = state.sticks;

    if (!s.alive) {
      if (b.cross.justPressed) reset();
      if (b.circle.justPressed) navigate('/');
      return;
    }

    let move = 0;
    if (b.up.pressed || ly < -0.3) move = -1;
    else if (b.down.pressed || ly > 0.3) move = 1;
    s.playerY = Math.max(0, Math.min(H - PADDLE_H, s.playerY + move * PADDLE_SPEED * delta));

    const aiCenter = s.aiY + PADDLE_H / 2;
    if (aiCenter < s.ball.y - 8) s.aiY += AI_SPEED * delta;
    else if (aiCenter > s.ball.y + 8) s.aiY -= AI_SPEED * delta;
    s.aiY = Math.max(0, Math.min(H - PADDLE_H, s.aiY));

    s.ball.x += s.ball.vx * delta;
    s.ball.y += s.ball.vy * delta;

    if (s.ball.y < BALL_SIZE / 2 || s.ball.y > H - BALL_SIZE / 2) {
      s.ball.vy *= -1;
      s.ball.y = Math.max(BALL_SIZE / 2, Math.min(H - BALL_SIZE / 2, s.ball.y));
    }

    // player paddle
    if (
      s.ball.vx < 0 &&
      s.ball.x - BALL_SIZE / 2 < 14 + PADDLE_W &&
      s.ball.x > 14 &&
      s.ball.y > s.playerY &&
      s.ball.y < s.playerY + PADDLE_H
    ) {
      s.ball.vx *= -1.05;
      s.ball.vy += ((s.ball.y - (s.playerY + PADDLE_H / 2)) / PADDLE_H) * 0.3;
      play('hit');
    }
    // ai paddle
    if (
      s.ball.vx > 0 &&
      s.ball.x + BALL_SIZE / 2 > W - 14 - PADDLE_W &&
      s.ball.x < W - 14 &&
      s.ball.y > s.aiY &&
      s.ball.y < s.aiY + PADDLE_H
    ) {
      s.ball.vx *= -1.05;
      s.ball.vy += ((s.ball.y - (s.aiY + PADDLE_H / 2)) / PADDLE_H) * 0.3;
      play('hit');
    }

    if (s.ball.x < 0) {
      s.aiScore += 1;
      setAiScore(s.aiScore);
      play('gameOver');
      if (s.aiScore >= WIN_SCORE) {
        s.alive = false;
        setGameOver(true);
      } else serve(s, false);
    } else if (s.ball.x > W) {
      s.playerScore += 1;
      setPlayerScore(s.playerScore);
      play('eat');
      if (s.playerScore >= WIN_SCORE) {
        s.alive = false;
        setWon(true);
      } else serve(s, true);
    }

    draw(s);
  });

  const done = gameOver || won;

  return (
    <main className="np-page np-snake">
      <div className="np-snake-hud">
        <h1>Pong</h1>
        <div className="np-snake-scores">
          <span>You: {playerScore}</span>
          <span>CPU: {aiScore}</span>
        </div>
      </div>

      <div className="np-snake-wrap">
        <canvas ref={canvasRef} width={W} height={H} className="np-snake-canvas" />
        {done && (
          <div className="np-snake-overlay">
            <h2>{won ? 'You Win!' : 'CPU Wins'}</h2>
            <p>{playerScore} — {aiScore}</p>
            <div className="np-snake-overlay-actions">
              <button className="np-btn np-btn-primary" onClick={reset}>Play Again</button>
              <Link to="/" className="np-btn np-btn-secondary">Back to Games</Link>
            </div>
            <span className="np-snake-hint">✕ to play again · ○ to go back</span>
          </div>
        )}
      </div>

      <p className="np-snake-controls">Up/Down or left stick — first to {WIN_SCORE} wins</p>
    </main>
  );
}
