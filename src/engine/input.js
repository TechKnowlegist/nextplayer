// Next Player controller engine
// Reads the DualSense (or any controller) and the keyboard in one place,
// so every page and every game shares the same controls.
//
// Games: use input.onFrame((state) => { ... }) as your game loop and read
//   state.buttons.r2.value, state.sticks.lx, state.buttons.cross.justPressed, etc.

// Standard button numbers (how Chrome/Edge/Opera report a DualSense)
export const BUTTONS = {
  cross: 0, circle: 1, square: 2, triangle: 3,
  l1: 4, r1: 5, l2: 6, r2: 7,
  create: 8, options: 9, l3: 10, r3: 11,
  up: 12, down: 13, left: 14, right: 15,
  ps: 16, touchpad: 17,
};

// What to show on screen for each button
export const LABELS = {
  cross: '✕', circle: '○', square: '□', triangle: '△',
  l1: 'L1', r1: 'R1', l2: 'L2', r2: 'R2',
  create: 'Create', options: 'Options', l3: 'L3', r3: 'R3',
  up: '↑', down: '↓', left: '←', right: '→',
  ps: 'PS', touchpad: 'Touchpad',
};

// Keyboard fallback: which keys count as which controller button
const KEYMAP = {
  cross: ['Enter', 'Space'],
  circle: ['Backspace'],
  square: ['ShiftLeft', 'ShiftRight'],
  triangle: ['KeyR'],
  l1: ['KeyQ'],
  r1: ['KeyE'],
  l2: ['KeyZ'],
  r2: ['KeyX'],
  create: ['KeyC'],
  options: ['Escape', 'KeyP'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
};

// Keys that would scroll the page; blocked only while a game captures the keyboard
const SCROLL_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Backspace'];

const NAMES = Object.keys(BUTTONS);
const PRESS_THRESHOLD = 0.3; // how far a trigger must go to count as "pressed"
const STICK_DEADZONE = 0.15; // ignore tiny stick drift

function makeButtons() {
  const buttons = {};
  for (const name of NAMES) {
    buttons[name] = { pressed: false, value: 0, justPressed: false, justReleased: false };
  }
  return buttons;
}

const state = {
  connected: false,
  name: '',
  isDualSense: false,
  lastInput: 'keyboard', // 'controller' or 'keyboard'
  buttons: makeButtons(), // controller + keyboard combined (use this in games)
  sticks: { lx: 0, ly: 0, rx: 0, ry: 0 },
  pad: { buttons: makeButtons(), sticks: { lx: 0, ly: 0, rx: 0, ry: 0 } }, // controller only
};

// menuNav: when true, the D-pad moves between buttons/links on the page.
// Games turn it off while you're playing.
export const settings = { menuNav: true };

const keysDown = new Set();
const frameListeners = new Set();
const statusListeners = new Set();
let padIndex = null;
let captureKeys = false;
let running = false;
let lastStatusKey = '';

function isTyping(el) {
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (isTyping(e.target)) return;
    keysDown.add(e.code);
    if (captureKeys && SCROLL_KEYS.includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keysDown.delete(e.code));
  window.addEventListener('blur', () => keysDown.clear());
  window.addEventListener('gamepadconnected', (e) => {
    padIndex = e.gamepad.index;
  });
  window.addEventListener('gamepaddisconnected', (e) => {
    if (padIndex === e.gamepad.index) padIndex = null;
  });
}

function detectDualSense(id) {
  // 054c = Sony, 0ce6 = DualSense, 0df2 = DualSense Edge
  return /dualsense|0ce6|0df2/i.test(id);
}

function friendlyName(id) {
  if (detectDualSense(id)) return 'DualSense';
  if (/054c/i.test(id)) return 'PlayStation controller';
  if (/xbox|045e/i.test(id)) return 'Xbox controller';
  if (/joy-con|pro controller|057e/i.test(id)) return 'Nintendo controller';
  return 'Controller';
}

function findPad() {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
  const pads = navigator.getGamepads();
  // Re-check .connected on every poll rather than trusting the cached index
  // forever — gamepaddisconnected doesn't reliably fire for Bluetooth
  // controllers (DualSense included), so without this a controller that
  // silently drops stays "connected" until the page reloads.
  if (padIndex !== null) {
    const cached = pads[padIndex];
    if (cached && cached.connected) return cached;
    padIndex = null;
  }
  for (const pad of pads) {
    if (pad && pad.connected) {
      padIndex = pad.index;
      return pad;
    }
  }
  return null;
}

function deadzone(x, y) {
  const mag = Math.hypot(x, y);
  if (mag < STICK_DEADZONE) return [0, 0];
  const scale = Math.min(1, (mag - STICK_DEADZONE) / (1 - STICK_DEADZONE)) / mag;
  return [x * scale, y * scale];
}

function setButton(button, value) {
  const pressed = value > PRESS_THRESHOLD;
  button.justPressed = pressed && !button.pressed;
  button.justReleased = !pressed && button.pressed;
  button.pressed = pressed;
  button.value = value;
}

const keyHeld = (name) => (KEYMAP[name] || []).some((code) => keysDown.has(code));

export function getStatus() {
  return {
    connected: state.connected,
    name: state.name,
    isDualSense: state.isDualSense,
    lastInput: state.lastInput,
  };
}

function poll() {
  const pad = findPad();
  let padActive = false;

  // Buttons
  for (const name of NAMES) {
    let padValue = 0;
    if (pad) {
      const b = pad.buttons[BUTTONS[name]];
      if (b) padValue = b.value || (b.pressed ? 1 : 0);
    }
    if (padValue > PRESS_THRESHOLD) padActive = true;
    setButton(state.pad.buttons[name], padValue);
    setButton(state.buttons[name], Math.max(padValue, keyHeld(name) ? 1 : 0));
  }

  // Sticks (up on a stick is negative Y)
  let [lx, ly] = [0, 0];
  let [rx, ry] = [0, 0];
  if (pad) {
    [lx, ly] = deadzone(pad.axes[0] || 0, pad.axes[1] || 0);
    [rx, ry] = deadzone(pad.axes[2] || 0, pad.axes[3] || 0);
    if (lx || ly || rx || ry) padActive = true;
  }
  Object.assign(state.pad.sticks, { lx, ly, rx, ry });

  // Arrow keys / WASD also move the left stick
  const kx = (keyHeld('right') ? 1 : 0) - (keyHeld('left') ? 1 : 0);
  const ky = (keyHeld('down') ? 1 : 0) - (keyHeld('up') ? 1 : 0);
  if (kx || ky) {
    const mag = Math.hypot(kx, ky);
    lx = kx / mag;
    ly = ky / mag;
  }
  Object.assign(state.sticks, { lx, ly, rx, ry });

  if (padActive) state.lastInput = 'controller';
  else if (keysDown.size) state.lastInput = 'keyboard';

  state.connected = !!pad;
  state.name = pad ? friendlyName(pad.id) : '';
  state.isDualSense = !!pad && detectDualSense(pad.id);

  const statusKey = `${state.connected}|${state.name}|${state.lastInput}`;
  if (statusKey !== lastStatusKey) {
    lastStatusKey = statusKey;
    const status = getStatus();
    statusListeners.forEach((fn) => fn(status));
  }
}

function frame(time) {
  poll();
  frameListeners.forEach((fn) => {
    try {
      fn(state, time);
    } catch (err) {
      console.error('Controller frame listener crashed:', err);
    }
  });
  requestAnimationFrame(frame);
}

function start() {
  if (running || typeof window === 'undefined') return;
  running = true;
  requestAnimationFrame(frame);
}

// Rumble! Works in Chromium browsers (Chrome, Edge, Opera GX) on most setups.
// Support for DualSense specifically is known to be inconsistent across
// Chrome versions/OSes and especially over Bluetooth vs a wired USB-C
// connection — if this still doesn't work after the fixes below, that's
// most likely a browser/OS limitation rather than something fixable here.
export function rumble({ strong = 0.5, weak = 0.5, duration = 150 } = {}) {
  const pad = findPad();
  if (!pad) {
    console.log('Nextplayer — rumble: no controller detected');
    return false;
  }
  const actuator = pad.vibrationActuator;
  if (!actuator) {
    console.log('Nextplayer — rumble: this controller/browser has no vibrationActuator', pad.id);
    return false;
  }
  if (!actuator.playEffect) {
    console.log('Nextplayer — rumble: vibrationActuator has no playEffect()', actuator);
    return false;
  }
  // Some browsers report the actuator's own supported type instead of
  // always being 'dual-rumble' — prefer that when present.
  const effectType = actuator.type || 'dual-rumble';
  try {
    actuator
      .playEffect(effectType, {
        startDelay: 0,
        duration,
        strongMagnitude: strong,
        weakMagnitude: weak,
      })
      .catch((err) => console.log('Nextplayer — rumble: playEffect rejected', err));
    return true;
  } catch {
    return false;
  }
}

export const input = {
  state,
  settings,
  getStatus,
  rumble,
  // Runs every frame (~60 times a second), right after the controller is read
  onFrame(fn) {
    start();
    frameListeners.add(fn);
    return () => frameListeners.delete(fn);
  },
  // Runs when a controller connects/disconnects or you switch controller <-> keyboard
  onStatus(fn) {
    start();
    statusListeners.add(fn);
    return () => statusListeners.delete(fn);
  },
  pressed: (name) => state.buttons[name]?.pressed ?? false,
  justPressed: (name) => state.buttons[name]?.justPressed ?? false,
  value: (name) => state.buttons[name]?.value ?? 0,
  // Games call captureKeyboard(true) so arrow keys/space don't scroll the page
  captureKeyboard(on) {
    captureKeys = on;
  },
};

start();

export default input;
