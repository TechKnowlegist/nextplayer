import { Link } from 'react-router-dom';
import { GAMES } from '../gamesData';

export default function Help() {
  return (
    <main className="np-page np-help">
      <section className="np-help-intro">
        <h1>How to Play</h1>
        <p>
          Every game here works with a DualSense, Xbox, or Nintendo controller, a keyboard, or touch on
          phone/tablet — pick whatever you've got, no setup needed.
        </p>
        <div className="np-help-general">
          <div className="np-help-general-item">
            <span className="np-help-key">D-pad / stick / arrows / WASD</span>
            <span>Move</span>
          </div>
          <div className="np-help-general-item">
            <span className="np-help-key">✕ (Enter / Space / tap)</span>
            <span>Confirm, select, or the game's main action</span>
          </div>
          <div className="np-help-general-item">
            <span className="np-help-key">○ (Backspace)</span>
            <span>Back / go to menu</span>
          </div>
          <div className="np-help-general-item">
            <span className="np-help-key">Touch</span>
            <span>An on-screen D-pad + ✕/○ appears automatically on phones and tablets</span>
          </div>
        </div>
        <p className="np-help-tip">
          Not sure your controller is being picked up? Head to <Link to="/controller">Controller Check</Link> and
          press a button — it'll light up on screen the second it's detected.
        </p>
      </section>

      <section className="np-help-list">
        <h2>Game by Game</h2>
        <div className="np-help-grid">
          {GAMES.map((game) => (
            <div key={game.id} className="np-help-card">
              <div className="np-help-card-top">
                <span className="np-help-emoji" aria-hidden="true">{game.emoji}</span>
                <h3>{game.title}</h3>
              </div>
              <p className="np-help-goal">{game.goal}</p>
              <p className="np-help-controls">{game.controls}</p>
              <Link to={game.path} className="np-btn np-btn-secondary np-help-play">Play</Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
