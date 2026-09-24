import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import input from '../../engine/input';
import { useControllerFrame, useMenuNav } from '../../engine/useController';
import { play } from '../../engine/sound';

const DIRS = ['up', 'right', 'down', 'left'];
const FLASH_MS = 450;
const GAP_MS = 200;
const BEST_KEY = 'np-simon-best';

function freshState() {
  return {
    sequence: [DIRS[Math.floor(Math.random() * 4)]],
    phase: 'watching', // 'watching' | 'input' | 'gameover'
    watchIndex: 0,
    watchTimer: FLASH_MS,
    flashDir: null,
    inputIndex: 0,
    lastTime: null,
  };
}

export default function Simon() {
  useMenuNav(false);
  const navigate = useNavigate();
  const stateRef = useRef(freshState());
  const [round, setRound] = useState(1);
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY)) || 0);
  const [gameOver, setGameOver] = useState(false);
  const [flashDir, setFlashDir] = useState(null);
  const [phase, setPhase] = useState('watching');

  useEffect(() => {
    input.captureKeyboard(true);
    return () => input.captureKeyboard(false);
  }, []);

  function reset() {
    stateRef.current = freshState();
    setRound(1);
    setGameOver(false);
    setPhase('watching');
    setFlashDir(null);
  }

  function fail(s) {
    s.phase = 'gameover';
    setGameOver(true);
    setBest((prev) => {
      const next = Math.max(prev, s.sequence.length - 1);
      localStorage.setItem(BEST_KEY, String(next));
      return next;
    });
    play('gameOver');
    input.rumble({ strong: 0.6, weak: 0.6, duration: 200 });
  }

  useControllerFrame((state, time) => {
    const s = stateRef.current;
    if (s.lastTime == null) s.lastTime = time;
    const delta = Math.min(time - s.lastTime, 100);
    s.lastTime = time;

    const b = state.buttons;

    if (s.phase === 'gameover') {
      if (b.cross.justPressed) reset();
      if (b.circle.justPressed) navigate('/');
      return;
    }

    if (s.phase === 'watching') {
      s.watchTimer -= delta;
      if (s.watchTimer <= 0) {
        if (s.flashDir) {
          s.flashDir = null;
          setFlashDir(null);
          s.watchTimer = GAP_MS;
        } else if (s.watchIndex < s.sequence.length) {
          s.flashDir = s.sequence[s.watchIndex];
          setFlashDir(s.flashDir);
          s.watchIndex += 1;
          s.watchTimer = FLASH_MS;
        } else {
          s.phase = 'input';
          setPhase('input');
          s.inputIndex = 0;
          s.watchIndex = 0;
        }
      }
      return;
    }

    // input phase
    let pressed = null;
    if (b.up.justPressed) pressed = 'up';
    else if (b.right.justPressed) pressed = 'right';
    else if (b.down.justPressed) pressed = 'down';
    else if (b.left.justPressed) pressed = 'left';

    if (pressed) {
      setFlashDir(pressed);
      setTimeout(() => setFlashDir(null), 150);
      if (pressed === s.sequence[s.inputIndex]) {
        play('eat');
        s.inputIndex += 1;
        if (s.inputIndex >= s.sequence.length) {
          s.sequence.push(DIRS[Math.floor(Math.random() * 4)]);
          s.phase = 'watching';
          setPhase('watching');
          s.watchIndex = 0;
          s.watchTimer = 500;
          setRound(s.sequence.length);
        }
      } else {
        fail(s);
      }
    }
  });

  return (
    <main className="np-page np-simon">
      <div className="np-snake-hud">
        <h1>Simon</h1>
        <div className="np-snake-scores">
          <span>Round: {round}</span>
          <span>Best: {best}</span>
        </div>
      </div>

      <div className="np-simon-wrap">
        <div className="np-simon-grid">
          <div className={`np-simon-pad up ${flashDir === 'up' ? 'on' : ''}`} />
          <div className={`np-simon-pad left ${flashDir === 'left' ? 'on' : ''}`} />
          <div className="np-simon-center">{phase === 'watching' ? 'Watch...' : 'Your turn!'}</div>
          <div className={`np-simon-pad right ${flashDir === 'right' ? 'on' : ''}`} />
          <div className={`np-simon-pad down ${flashDir === 'down' ? 'on' : ''}`} />
        </div>

        {gameOver && (
          <div className="np-snake-overlay">
            <h2>Game Over</h2>
            <p>You reached round {round}{round - 1 >= best ? ' — new best!' : ''}</p>
            <div className="np-snake-overlay-actions">
              <button className="np-btn np-btn-primary" onClick={reset}>Play Again</button>
              <Link to="/" className="np-btn np-btn-secondary">Back to Games</Link>
            </div>
            <span className="np-snake-hint">✕ to play again · ○ to go back</span>
          </div>
        )}
      </div>

      <p className="np-snake-controls">Watch the pattern, then repeat it with the D-pad / arrow keys</p>
    </main>
  );
}
