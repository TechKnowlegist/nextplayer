// React hooks for the controller engine
import { useEffect, useRef, useState } from 'react';
import input from './input';

// { connected, name, isDualSense, lastInput } — updates when a controller connects/disconnects
export function useControllerStatus() {
  const [status, setStatus] = useState(input.getStatus);
  useEffect(() => input.onStatus(setStatus), []);
  return status;
}

// Run a function every frame with the live controller state
export function useControllerFrame(callback) {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  });
  useEffect(() => input.onFrame((state, time) => saved.current(state, time)), []);
}

// Turn D-pad menu navigation on/off while a page is open (games turn it off)
export function useMenuNav(enabled) {
  useEffect(() => {
    const previous = input.settings.menuNav;
    input.settings.menuNav = enabled;
    return () => {
      input.settings.menuNav = previous;
    };
  }, [enabled]);
}
