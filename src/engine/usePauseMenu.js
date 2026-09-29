import { useState } from 'react';
import { useMenuNav } from './useController';

// Shared pause behavior for every game. While paused, the site's own D-pad
// focus navigation (normally switched off during gameplay via useMenuNav)
// switches back on, so the Resume/Main Menu buttons in <PauseMenu> are
// reachable with no extra input-handling code of their own - same D-pad,
// ✕ to select, that already drives every other page.
export function usePauseMenu() {
  const [paused, setPaused] = useState(false);
  useMenuNav(paused);
  return [paused, setPaused];
}
