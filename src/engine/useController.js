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

// True on touch-primary devices (phones/tablets) — checks the actual
// pointer type, not screen width, so a touch laptop with a keyboard
// doesn't get on-screen controls and a narrow desktop window doesn't
// fake having them either.
export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(pointer: coarse)');
    const onChange = () => setIsTouch(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isTouch;
}
