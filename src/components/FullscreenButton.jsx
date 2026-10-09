import { isFullscreenSupported } from '../engine/useFullscreen';

// Round icon button, same style as each game's mute button. The page owns
// the single useFullscreen() call (one fullscreenchange listener, not one
// per button) and just passes the state/toggle down. Hidden entirely on
// browsers without the Fullscreen API (old iOS Safari) rather than showing
// a button that can't do anything.
export default function FullscreenButton({ isFullscreen, onToggle }) {
  if (!isFullscreenSupported) return null;
  return (
    <button
      type="button"
      className="np-snake-mute"
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      onClick={onToggle}
    >
      {isFullscreen ? '⤢' : '⛶'}
    </button>
  );
}
