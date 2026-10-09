// Shared fullscreen support for game pages. Always targets the whole
// document (not a single wrapped element) — a game page hides its own
// chrome (leaderboard, chat, nav, footer) via normal React conditional
// rendering while fullscreen is active, rather than asking the
// Fullscreen API to hide them by occlusion. That matters because the
// Fullscreen API only stops *painting* anything outside the fullscreen
// element — it doesn't remove it from the DOM — and this site's D-pad
// focus navigation (ControllerNavigator) walks the whole document with no
// concept of what's actually visible, so an occluded nav link would still
// be a real, focusable target. Fullscreening <html> sidesteps that
// entirely: nothing is occluded, so nothing needs a visibility workaround.
import { useEffect, useState } from 'react';

export const isFullscreenSupported =
  typeof document !== 'undefined' && document.fullscreenEnabled;

function isActive() {
  return typeof document !== 'undefined' && document.fullscreenElement != null;
}

// True whenever ANY element is fullscreen — used by App.jsx to hide the
// nav bar and footer the same way they're hidden for Console Mode.
export function useIsFullscreenActive() {
  const [active, setActive] = useState(isActive);
  useEffect(() => {
    const onChange = () => setActive(isActive());
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  return active;
}

// [isFullscreen, toggle] for a game page's own fullscreen button. Tracks
// state via the fullscreenchange event (not just the toggle call) since
// fullscreen can also end on its own — Esc, switching tabs/apps, etc.
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(isActive);

  useEffect(() => {
    const onChange = () => setIsFullscreen(isActive());
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  function toggle() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  return [isFullscreen, toggle];
}
