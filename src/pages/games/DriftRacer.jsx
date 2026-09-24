import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import input from '../../engine/input';
import { useControllerFrame, useMenuNav } from '../../engine/useController';

const CANVAS_SIZE = 480;
const CENTER = CANVAS_SIZE / 2;
const R_OUT = 220;
const R_IN = 100;
const R_MID = (R_OUT + R_IN) / 2;
const BEST_KEY = 'np-racer-best-lap';

const ACCEL = 0.00028;
const MAX_SPEED = 0.3;
const MAX_REVERSE = -0.12;
const FRICTION = 0.0012;
// Deliberately gentle — holding a constant steering input traces a fixed-
// radius spiral, not the track's actual curve, so drifting off-track for
// a moment is expected even from a good player. A harsh drag here turns
// one bad moment into an unrecoverable stall; this just costs some speed.
const OFFTRACK_DRAG = 0.0015;
// Turn radius = speed / angularRate. A FIXED angular rate (most naive
// arcade-car models) makes that radius scale up with speed — tight at
// low speed, wide at high speed — which is backwards for a fixed-radius
// ring: the same steer input needs to trace roughly the same curve
// whether you're crawling or at top speed. So the turn rate is scaled by
// current speed instead (angularRate = speed / R_MID * STEER_GAIN),
// keeping the natural radius close to the track's own at any speed.
// STEER_GAIN > 1 turns slightly tighter than an exact radius match, to
// give some margin for imperfect steering timing.
const STEER_GAIN = 1.15;
const GRIP = 0.1; // lower = more drift/slide, higher = more grip/direct

function freshState() {
  return {
    x: CENTER,
    y: CENTER - R_MID,
    heading: 0, // pointing along +x initially, but car starts facing along the track (tangent)
    speed: 0,
    vx: 0,
    vy: 0,
    angleAccum: 0,
    lastAngle: Math.atan2(-R_MID, 0), // matches starting position relative to center
    lap: 0,
    lapStart: 0,
    lastLapTime: null,
    bestLapTime: Number(localStorage.getItem(BEST_KEY)) || null,
    raceTime: 0,
  };
}

export default function DriftRacer() {
  useMenuNav(false);
  const canvasRef = useRef(null);
  const stateRef = useRef(freshState());
  const [lap, setLap] = useState(0);
  const [lastLapTime, setLastLapTime] = useState(null);
  const [bestLapTime, setBestLapTime] = useState(() => Number(localStorage.getItem(BEST_KEY)) || null);

  useEffect(() => {
    input.captureKeyboard(true);
    return () => input.captureKeyboard(false);
  }, []);

  function reset() {
    stateRef.current = freshState();
    stateRef.current.bestLapTime = bestLapTime;
    setLap(0);
    setLastLapTime(null);
  }

  function draw(s) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // track surface
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, R_OUT, 0, Math.PI * 2);
    ctx.fillStyle = '#111827';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, R_IN, 0, Math.PI * 2);
    ctx.fillStyle = '#05070a';
    ctx.fill();

    // track edges
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, R_OUT, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, R_IN, 0, Math.PI * 2);
    ctx.stroke();

    // start/finish checkered marker at top (angle = -90deg)
    const markerAngle = -Math.PI / 2;
    const mx1 = CENTER + Math.cos(markerAngle) * R_IN;
    const my1 = CENTER + Math.sin(markerAngle) * R_IN;
    const mx2 = CENTER + Math.cos(markerAngle) * R_OUT;
    const my2 = CENTER + Math.sin(markerAngle) * R_OUT;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(mx1, my1);
    ctx.lineTo(mx2, my2);
    ctx.stroke();

    // car
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.heading);
    ctx.fillStyle = '#22c55e';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, 7);
    ctx.lineTo(-8, -7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  useControllerFrame((state, time) => {
    const s = stateRef.current;
    if (s.lastTime == null) s.lastTime = time;
    const delta = Math.min(time - s.lastTime, 100);
    s.lastTime = time;
    s.raceTime += delta;

    const b = state.buttons;
    const { lx, ly } = state.sticks;

    const throttle = b.r2.pressed || b.up.pressed || ly < -0.3 ? 1 : b.l2.pressed || b.down.pressed || ly > 0.3 ? -1 : 0;
    const steer = b.left.pressed || lx < -0.3 ? -1 : b.right.pressed || lx > 0.3 ? 1 : 0;

    s.speed += throttle * ACCEL * delta;
    s.speed *= Math.max(0, 1 - FRICTION * delta);
    s.speed = Math.max(MAX_REVERSE, Math.min(MAX_SPEED, s.speed));

    if (Math.abs(s.speed) > 0.01) {
      const turnRate = (Math.abs(s.speed) / R_MID) * STEER_GAIN;
      s.heading += steer * turnRate * delta * Math.sign(s.speed);
    }

    const desiredVX = Math.cos(s.heading) * s.speed;
    const desiredVY = Math.sin(s.heading) * s.speed;
    s.vx += (desiredVX - s.vx) * GRIP;
    s.vy += (desiredVY - s.vy) * GRIP;

    s.x += s.vx * delta;
    s.y += s.vy * delta;

    const distFromCenter = Math.hypot(s.x - CENTER, s.y - CENTER);
    const onTrack = distFromCenter >= R_IN && distFromCenter <= R_OUT;
    if (!onTrack) {
      s.speed *= Math.max(0, 1 - OFFTRACK_DRAG * delta);
      s.vx *= 0.9;
      s.vy *= 0.9;
    }

    const angle = Math.atan2(s.y - CENTER, s.x - CENTER);
    let d = angle - s.lastAngle;
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    // Only count lap progress while actually on the track — otherwise
    // holding a constant turn can settle into a small stable orbit well
    // inside the inner wall that would still rack up "laps" without ever
    // touching the real raceway.
    if (onTrack) s.angleAccum += d;
    s.lastAngle = angle;

    if (s.angleAccum >= Math.PI * 2) {
      s.angleAccum -= Math.PI * 2;
      s.lap += 1;
      const lapTime = s.raceTime - s.lapStart;
      s.lapStart = s.raceTime;
      s.lastLapTime = lapTime;
      setLap(s.lap);
      setLastLapTime(lapTime);
      if (!s.bestLapTime || lapTime < s.bestLapTime) {
        s.bestLapTime = lapTime;
        localStorage.setItem(BEST_KEY, String(lapTime));
        setBestLapTime(lapTime);
      }
    } else if (s.angleAccum <= -Math.PI * 2) {
      // driving backward a full lap — just resync so it doesn't wrap oddly
      s.angleAccum += Math.PI * 2;
    }

    draw(s);
  });

  function fmt(ms) {
    if (ms == null) return '--:--.--';
    const totalSeconds = ms / 1000;
    const m = Math.floor(totalSeconds / 60);
    const sec = (totalSeconds % 60).toFixed(2).padStart(5, '0');
    return `${m}:${sec}`;
  }

  return (
    <main className="np-page np-snake">
      <div className="np-snake-hud">
        <h1>Drift Racer</h1>
        <div className="np-snake-scores">
          <span>Lap: {lap}</span>
          <span>Last: {fmt(lastLapTime)}</span>
          <span>Best: {fmt(bestLapTime)}</span>
        </div>
      </div>

      <div className="np-snake-wrap">
        <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="np-snake-canvas" />
      </div>

      <div className="np-racer-actions">
        <button className="np-btn np-btn-secondary" onClick={reset}>Reset</button>
        <Link to="/" className="np-btn np-btn-secondary">Back to Games</Link>
      </div>

      <p className="np-snake-controls">
        R2/L2 or Up/Down or left stick to accelerate/brake · Left/Right or stick to steer
      </p>
    </main>
  );
}
