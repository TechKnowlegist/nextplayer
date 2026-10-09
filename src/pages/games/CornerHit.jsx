import { useEffect, useRef, useState } from 'react';
import { useControllerFrame } from '../../engine/useController';
import { usePauseMenu } from '../../engine/usePauseMenu';
import { useSubmitScore } from '../../engine/useSubmitScore';
import { formatLapTime } from '../../engine/scoreFormat';
import Leaderboard from '../../components/Leaderboard';
import ChatFeed from '../../components/ChatFeed';
import PauseMenu from '../../components/PauseMenu';

// Corner Hit is a self-contained game (its own canvas, shop, skins, sound and
// save data) kept as one HTML file next to this page. It's loaded as a string
// (Vite ?raw, in its own chunk) and rendered with iframe srcdoc, so it doesn't
// depend on Amplify's rewrite rules serving a separate .html file. The frame
// shares the site's origin, so its localStorage save works as normal.
// The page bridges it to the site with postMessage:
//   game -> site: { source: 'corner-hit', type: 'win' | 'toggle-pause', ... }
//   site -> game: { target: 'corner-hit', type: 'pause' | 'resume' }
// The leaderboard ranks the fastest corner win (lower time is better).

export default function CornerHit() {
  const [paused, setPaused] = usePauseMenu();
  const frameRef = useRef(null);
  const [boardVersion, setBoardVersion] = useState(0);
  const submitScore = useSubmitScore('corner-hit');
  const [gameHtml, setGameHtml] = useState(null);

  useEffect(() => {
    let cancelled = false;
    import('./corner-hit.html?raw').then((m) => {
      if (!cancelled) setGameHtml(m.default);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Tell the embedded game to freeze or carry on whenever the pause menu changes.
  useEffect(() => {
    const win = frameRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ target: 'corner-hit', type: paused ? 'pause' : 'resume' }, '*');
    // Give keyboard focus back to the game so P / shop keys work right away.
    if (!paused) frameRef.current.focus();
  }, [paused]);

  useEffect(() => {
    function onMessage(e) {
      if (e.source !== frameRef.current?.contentWindow) return;
      const msg = e.data;
      if (!msg || msg.source !== 'corner-hit') return;
      if (msg.type === 'toggle-pause') setPaused((p) => !p);
      if (msg.type === 'win' && Number.isFinite(msg.timeMs) && msg.timeMs > 0) {
        submitScore(msg.timeMs);
        // Give the submit a moment to land before re-fetching the board.
        setTimeout(() => setBoardVersion((v) => v + 1), 1500);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [setPaused, submitScore]);

  // Options / Start on a controller opens the same pause menu as every game.
  useControllerFrame((state) => {
    if (state.buttons.options.justPressed) setPaused((p) => !p);
  });

  return (
    <main className="np-page np-snake np-cornerhit">
      <div className="np-snake-hud">
        <h1>Corner Hit</h1>
      </div>

      <div className="np-snake-wrap np-cornerhit-wrap">
        <iframe
          ref={frameRef}
          srcDoc={gameHtml ?? ''}
          title="Corner Hit game"
          className="np-cornerhit-frame"
          allow="autoplay; fullscreen"
        />
      </div>

      {paused && <PauseMenu onResume={() => setPaused(false)} />}

      <p className="np-snake-controls">
        Bounce the logo off the walls for points, spend them in the Shop, and land it in a corner to win.
        P or Options to pause.
      </p>

      <h2 className="np-cornerhit-board-title">Fastest corner wins</h2>
      <Leaderboard gameId="corner-hit" refreshKey={boardVersion} ascending format={formatLapTime} />
      <ChatFeed channel="leaderboard:corner-hit" title="Leaderboard Chat" placeholder="Talk trash, give tips..." />
    </main>
  );
}
