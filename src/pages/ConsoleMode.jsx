import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useControllerStatus } from '../engine/useController';
import { GAMES } from '../gamesData';

const FADE_MS = 500;

// Full-screen, controller-only picker: the site's own D-pad focus
// navigation (ControllerNavigator, always mounted in App.jsx) already
// drives every <Link> here - D-pad/stick to move, ✕ to select, ○ to exit
// back to the normal site. Nothing here needs its own input handling.
export default function ConsoleMode() {
  const navigate = useNavigate();
  const { connected } = useControllerStatus();
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    // Entering Console Mode is itself a click, which is the user gesture
    // browsers require before audio can autoplay - unlike a cold page
    // load (see BootScreen), no extra tap-to-start gate is needed here.
    audio?.play().catch(() => {});
    return () => audio?.pause();
  }, []);

  function launch(path) {
    const audio = audioRef.current;
    if (!audio || audio.paused) {
      navigate(path);
      return;
    }
    const startVolume = audio.volume;
    const steps = 10;
    let i = 0;
    const fade = setInterval(() => {
      i += 1;
      audio.volume = Math.max(0, startVolume * (1 - i / steps));
      if (i >= steps) {
        clearInterval(fade);
        audio.pause();
        navigate(path);
      }
    }, FADE_MS / steps);
  }

  return (
    <div className="np-console">
      <audio ref={audioRef} loop>
        <source src="/sounds/anthem-loop.ogg" type="audio/ogg" />
        <source src="/sounds/anthem-loop.mp3" type="audio/mpeg" />
      </audio>

      <div className="np-console-header">
        <h1>Next Player</h1>
        {!connected && (
          <p className="np-console-hint">Press any button on your controller to connect it</p>
        )}
        {connected && <p className="np-console-hint">D-pad to move · ✕ to select · ○ to exit</p>}
      </div>

      <div className="np-console-grid">
        {GAMES.map((game) => (
          <Link
            key={game.id}
            to={game.path}
            className="np-console-tile"
            onClick={(e) => {
              e.preventDefault();
              launch(game.path);
            }}
          >
            <span className="np-console-tile-art" aria-hidden="true">{game.emoji}</span>
            <span className="np-console-tile-title">{game.title}</span>
          </Link>
        ))}
      </div>

      <Link to="/" className="np-console-exit">← Exit Console Mode</Link>
    </div>
  );
}
