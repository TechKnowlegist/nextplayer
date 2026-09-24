import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useControllerStatus } from '../engine/useController';
import input from '../engine/input';

const QUIPS = [
  'We blew on the cartridge. Twice. Still nothing.',
  "This level hasn't been built yet. Or it has, and we lost it.",
  'Our search party checked behind every arcade cabinet. Just gum.',
  'Even the pixels are confused right now.',
  'The page rage-quit. It did not leave a note.',
  'We asked the final boss. He shrugged.',
  'Somebody tripped over the power cord. Probably.',
];

export default function NotFound() {
  const { pathname } = useLocation();
  const { connected } = useControllerStatus();
  const homeRef = useRef(null);
  const [quip] = useState(() => QUIPS[Math.floor(Math.random() * QUIPS.length)]);

  useEffect(() => {
    // Focus the button so ✕ on the controller takes you home, plus a little "bonk"
    homeRef.current?.focus({ preventScroll: true });
    input.rumble({ strong: 0.6, weak: 0.3, duration: 220 });
  }, []);

  return (
    <main className="np-page np-404">
      <div className="np-404-code" aria-hidden="true">
        {'404'.split('').map((digit, i) => (
          <span key={i} className="np-404-digit" style={{ '--i': i }} data-text={digit}>
            {digit}
          </span>
        ))}
      </div>

      <h1>That's an error.</h1>
      <h2>That's all we know.</h2>

      <p className="np-404-quip">{quip}</p>
      <p className="np-404-path">
        We looked everywhere for <code>{pathname}</code> and came up empty.
      </p>

      <Link ref={homeRef} to="/" className="np-btn np-btn-primary">
        Take me home
      </Link>
      <span className="np-404-continue">
        {connected ? 'Press ✕ to continue' : 'Insert coin to continue'}
      </span>
    </main>
  );
}
