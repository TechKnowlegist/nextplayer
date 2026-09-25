import { useCallback } from 'react';
import input from '../engine/input';

// A universal on-screen D-pad + ✕/○ overlay. It drives input.js's shared
// button state directly (setTouchButton), so every game already reading
// state.buttons.* gets touch for free — no per-game wiring needed. The
// optional `thrust` prop adds a third button for Asteroids, the one game
// that needs 3 concurrent inputs (turn + thrust + fire).
function TouchButton({ name, label, className }) {
  const press = useCallback((e) => {
    e.preventDefault();
    input.setTouchButton(name, true);
  }, [name]);
  const release = useCallback((e) => {
    e.preventDefault();
    input.setTouchButton(name, false);
  }, [name]);

  return (
    <button
      type="button"
      className={`np-touch-btn ${className || ''}`}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      tabIndex={-1}
    >
      {label}
    </button>
  );
}

export default function TouchControls({ thrust = false }) {
  return (
    <div className="np-touch-controls">
      <div className="np-touch-dpad">
        <TouchButton name="up" label="↑" className="up" />
        <TouchButton name="left" label="←" className="left" />
        <TouchButton name="right" label="→" className="right" />
        <TouchButton name="down" label="↓" className="down" />
      </div>
      <div className="np-touch-actions">
        {thrust && <TouchButton name="r2" label="▲" className="np-touch-thrust" />}
        <TouchButton name="circle" label="○" className="np-touch-circle" />
        <TouchButton name="cross" label="✕" className="np-touch-cross" />
      </div>
    </div>
  );
}
