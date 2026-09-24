// Tiny sound-effect player shared by every game. Files are .ogg (Kenney's
// "Digital Audio" pack, CC0 — see public/sounds/CREDITS.txt), which Chrome,
// Firefox, and Edge all play fine but Safari does not support at all — on
// Safari these calls just silently no-op rather than erroring.
const SOUNDS = {
  eat: '/sounds/eat.ogg',
  gameOver: '/sounds/game-over.ogg',
  shoot: '/sounds/shoot.ogg',
  hit: '/sounds/hit.ogg',
  waveClear: '/sounds/wave-clear.ogg',
};

const MUTE_KEY = 'np-sound-muted';
let muted = typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === 'true';

const cache = {};

function getAudio(name) {
  if (!cache[name]) {
    const audio = new Audio(SOUNDS[name]);
    audio.volume = 0.5;
    cache[name] = audio;
  }
  return cache[name];
}

export function play(name) {
  if (muted || !SOUNDS[name]) return;
  const audio = getAudio(name);
  audio.currentTime = 0; // restart if it's still playing from a rapid repeat
  audio.play().catch(() => {}); // browsers may reject before any user gesture, or if unsupported (Safari + ogg)
}

export function isMuted() {
  return muted;
}

export function toggleMuted() {
  muted = !muted;
  if (typeof localStorage !== 'undefined') localStorage.setItem(MUTE_KEY, String(muted));
  return muted;
}
