import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import input, { LABELS } from '../engine/input';
import { useControllerFrame, useControllerStatus, useMenuNav } from '../engine/useController';

function Btn({ name, value, className = '' }) {
  return <div className={`np-ct-btn ${className} ${value > 0.3 ? 'on' : ''}`}>{LABELS[name]}</div>;
}

function Trigger({ name, value }) {
  return (
    <div className="np-ct-trigger">
      <div className="np-ct-trigger-fill" style={{ height: `${value * 100}%` }} />
      <span>{LABELS[name]}</span>
      <small>{Math.round(value * 100)}%</small>
    </div>
  );
}

function Stick({ x, y, pressed, label }) {
  return (
    <div className={`np-ct-stick ${pressed ? 'on' : ''}`}>
      <div className="np-ct-stick-dot" style={{ transform: `translate(${x * 26}px, ${y * 26}px)` }} />
      <small>{label}</small>
    </div>
  );
}

export default function ControllerTest() {
  useMenuNav(false); // the D-pad is being tested here, so don't move around the page
  const { connected, name, isDualSense } = useControllerStatus();
  const navigate = useNavigate();
  const [snap, setSnap] = useState({ b: {}, sticks: { lx: 0, ly: 0, rx: 0, ry: 0 } });
  const [leaving, setLeaving] = useState(0);
  const holdStart = useRef(null);

  useControllerFrame((state, time) => {
    const b = {};
    for (const key in state.pad.buttons) b[key] = state.pad.buttons[key].value;
    setSnap({ b, sticks: { ...state.pad.sticks } });

    if (state.pad.buttons.r3.justPressed) input.rumble({ strong: 0.8, weak: 0.8, duration: 300 });

    // Hold ○ for one second to leave
    if (state.pad.buttons.circle.pressed) {
      if (holdStart.current === null) holdStart.current = time;
      const progress = Math.min(1, (time - holdStart.current) / 1000);
      setLeaving(progress);
      if (progress >= 1) {
        holdStart.current = null;
        navigate('/');
      }
    } else if (holdStart.current !== null) {
      holdStart.current = null;
      setLeaving(0);
    }
  });

  const v = (key) => snap.b[key] ?? 0;
  const { lx, ly, rx, ry } = snap.sticks;

  return (
    <main className="np-page np-ct">
      <h1>Controller Check</h1>
      {connected ? (
        <p>
          {name} connected{isDualSense ? ' 🎮' : ''}. Press everything!
        </p>
      ) : (
        <p>
          Plug in your controller with USB-C or pair it over Bluetooth, then press any button. Works best in
          Chrome, Edge, or Opera GX.
        </p>
      )}

      <div className={`np-ct-pad ${connected ? '' : 'waiting'}`}>
        <div className="np-ct-side">
          <div className="np-ct-shoulder">
            <Trigger name="l2" value={v('l2')} />
            <Btn name="l1" value={v('l1')} className="wide" />
          </div>
          <div className="np-ct-dpad">
            <Btn name="up" value={v('up')} className="up" />
            <Btn name="left" value={v('left')} className="left" />
            <Btn name="right" value={v('right')} className="right" />
            <Btn name="down" value={v('down')} className="down" />
          </div>
          <Stick x={lx} y={ly} pressed={v('l3') > 0.3} label="L3" />
        </div>

        <div className="np-ct-center">
          <div className="np-ct-center-row">
            <Btn name="create" value={v('create')} className="small" />
            <Btn name="options" value={v('options')} className="small" />
          </div>
          <Btn name="touchpad" value={v('touchpad')} className="touchpad" />
          <Btn name="ps" value={v('ps')} className="ps" />
        </div>

        <div className="np-ct-side">
          <div className="np-ct-shoulder">
            <Btn name="r1" value={v('r1')} className="wide" />
            <Trigger name="r2" value={v('r2')} />
          </div>
          <div className="np-ct-face">
            <Btn name="triangle" value={v('triangle')} className="up triangle" />
            <Btn name="square" value={v('square')} className="left square" />
            <Btn name="circle" value={v('circle')} className="right circle" />
            <Btn name="cross" value={v('cross')} className="down cross" />
          </div>
          <Stick x={rx} y={ry} pressed={v('r3') > 0.3} label="R3" />
        </div>
      </div>

      <div className="np-ct-actions">
        <button
          type="button"
          className="np-btn np-btn-secondary"
          onClick={() => input.rumble({ strong: 0.8, weak: 0.8, duration: 300 })}
        >
          Test rumble
        </button>
        <span className="np-ct-note">or click the right stick (R3)</span>
      </div>

      <div className="np-ct-leave">
        <div className="np-ct-leave-bar">
          <div style={{ width: `${leaving * 100}%` }} />
        </div>
        <span>Hold ○ to go back</span>
      </div>
    </main>
  );
}
