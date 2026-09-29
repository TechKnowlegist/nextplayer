import { Link } from 'react-router-dom';

// Same overlay every game uses for Options/Start - autoFocus on Resume so
// the site's D-pad navigation lands on it immediately.
export default function PauseMenu({ onResume }) {
  return (
    <div className="np-pause-overlay">
      <div className="np-pause-panel">
        <h2>Paused</h2>
        <button type="button" className="np-btn np-btn-primary" onClick={onResume} autoFocus>
          Resume
        </button>
        <Link to="/" className="np-btn np-btn-secondary">Main Menu</Link>
        <span className="np-snake-hint">Options / Start (or P) to resume</span>
      </div>
    </div>
  );
}
