// Lets you use the whole website with a controller:
//   D-pad / left stick = move between buttons and links
//   ✕ = select   ○ = go back   right stick = scroll
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import input from './input';

const FOCUSABLE = 'a[href], button:not([disabled]), [data-nav]';
const FIRST_REPEAT_MS = 380; // hold a direction: wait this long...
const REPEAT_MS = 120; // ...then keep moving this often

function visibleTargets() {
  return [...document.querySelectorAll(FOCUSABLE)].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  });
}

function focusEl(el) {
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function moveFocus(dir) {
  const targets = visibleTargets();
  if (!targets.length) return;
  const current = document.activeElement;
  if (!current || !targets.includes(current)) {
    focusEl(targets[0]);
    return;
  }
  const a = current.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  let best = null;
  let bestScore = Infinity;
  for (const el of targets) {
    if (el === current) continue;
    const r = el.getBoundingClientRect();
    const dx = r.left + r.width / 2 - ax;
    const dy = r.top + r.height / 2 - ay;
    const [main, side] =
      dir === 'up' ? [-dy, dx] : dir === 'down' ? [dy, dx] : dir === 'left' ? [-dx, dy] : [dx, dy];
    if (main <= 1) continue; // not in that direction
    const score = main + Math.abs(side) * 2; // prefer things straight ahead
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  if (best) {
    focusEl(best);
    input.rumble({ strong: 0, weak: 0.15, duration: 30 }); // tiny tick
  }
}

export default function ControllerNavigator() {
  const navigate = useNavigate();

  useEffect(() => {
    const root = document.documentElement;
    // Show the glowing focus ring only while using a controller
    const mouseMode = () => root.removeAttribute('data-input');
    window.addEventListener('mousemove', mouseMode);
    window.addEventListener('mousedown', mouseMode);

    let holdDir = null;
    let nextRepeat = 0;

    const stop = input.onFrame((state, time) => {
      if (!input.settings.menuNav) {
        holdDir = null;
        return;
      }
      const b = state.pad.buttons;
      const { lx, ly, ry } = state.pad.sticks;

      let dir = null;
      if (b.up.pressed || ly < -0.5) dir = 'up';
      else if (b.down.pressed || ly > 0.5) dir = 'down';
      else if (b.left.pressed || lx < -0.5) dir = 'left';
      else if (b.right.pressed || lx > 0.5) dir = 'right';

      if (dir) {
        root.setAttribute('data-input', 'controller');
        if (dir !== holdDir) {
          moveFocus(dir);
          holdDir = dir;
          nextRepeat = time + FIRST_REPEAT_MS;
        } else if (time >= nextRepeat) {
          moveFocus(dir);
          nextRepeat = time + REPEAT_MS;
        }
      } else {
        holdDir = null;
      }

      if (ry) window.scrollBy(0, ry * 18);

      if (b.cross.justPressed) {
        root.setAttribute('data-input', 'controller');
        const el = document.activeElement;
        if (el && el !== document.body && el.matches(FOCUSABLE)) el.click();
        else moveFocus('down');
      }

      if (b.circle.justPressed && window.location.pathname !== '/') {
        const canGoBack = (window.history.state?.idx ?? 0) > 0;
        if (canGoBack) navigate(-1);
        else navigate('/');
      }
    });

    return () => {
      stop();
      window.removeEventListener('mousemove', mouseMode);
      window.removeEventListener('mousedown', mouseMode);
    };
  }, [navigate]);

  return null;
}
