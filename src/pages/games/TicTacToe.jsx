import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import input from '../../engine/input';
import { useControllerFrame, useMenuNav } from '../../engine/useController';
import { useSubmitScore } from '../../engine/useSubmitScore';
import { play } from '../../engine/sound';
import Leaderboard from '../../components/Leaderboard';
import ChatFeed from '../../components/ChatFeed';

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board) {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

function aiMove(board) {
  const empty = board.map((v, i) => (v ? null : i)).filter((v) => v !== null);
  for (const i of empty) {
    const copy = [...board];
    copy[i] = 'O';
    if (checkWinner(copy) === 'O') return i;
  }
  for (const i of empty) {
    const copy = [...board];
    copy[i] = 'X';
    if (checkWinner(copy) === 'X') return i;
  }
  if (!board[4]) return 4;
  const corners = [0, 2, 6, 8].filter((i) => !board[i]);
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  return empty[Math.floor(Math.random() * empty.length)];
}

export default function TicTacToe() {
  useMenuNav(false);
  const navigate = useNavigate();
  const [board, setBoard] = useState(Array(9).fill(null));
  const [cursor, setCursor] = useState(4);
  const [turn, setTurn] = useState('player'); // 'player' | 'ai'
  const [winner, setWinner] = useState(null); // 'X' | 'O' | 'draw' | null
  const [wins, setWins] = useState({ player: 0, ai: 0 });
  const [boardVersion, setBoardVersion] = useState(0);
  // Leaderboard tracks the most wins in a single visit — a single match's
  // result (win/lose/draw) isn't a "score" the way it is in the other games.
  const submitScore = useSubmitScore('tic-tac-toe');

  useEffect(() => {
    input.captureKeyboard(true);
    return () => input.captureKeyboard(false);
  }, []);

  function reset() {
    setBoard(Array(9).fill(null));
    setCursor(4);
    setTurn('player');
    setWinner(null);
  }

  useEffect(() => {
    if (turn !== 'ai' || winner) return;
    const t = setTimeout(() => {
      setBoard((prev) => {
        const i = aiMove(prev);
        if (i == null) return prev;
        const next = [...prev];
        next[i] = 'O';
        const w = checkWinner(next);
        if (w) {
          setWinner(w);
          setWins((wv) => ({ ...wv, ai: wv.ai + 1 }));
          play('gameOver');
        } else if (next.every(Boolean)) {
          setWinner('draw');
        } else {
          setTurn('player');
        }
        return next;
      });
    }, 450);
    return () => clearTimeout(t);
  }, [turn, winner]);

  useControllerFrame((state) => {
    const b = state.buttons;
    if (winner) {
      if (b.cross.justPressed) reset();
      if (b.circle.justPressed) navigate('/');
      return;
    }
    if (turn !== 'player') return;

    if (b.up.justPressed) setCursor((c) => (c - 3 + 9) % 9);
    else if (b.down.justPressed) setCursor((c) => (c + 3) % 9);
    else if (b.left.justPressed) setCursor((c) => (c % 3 === 0 ? c + 2 : c - 1));
    else if (b.right.justPressed) setCursor((c) => (c % 3 === 2 ? c - 2 : c + 1));

    if (b.cross.justPressed) {
      setBoard((prev) => {
        if (prev[cursor]) return prev;
        const next = [...prev];
        next[cursor] = 'X';
        const w = checkWinner(next);
        if (w) {
          setWinner(w);
          setWins((wv) => ({ ...wv, player: wv.player + 1 }));
          play('waveClear');
          submitScore(wins.player + 1);
          setBoardVersion((v) => v + 1);
        } else if (next.every(Boolean)) {
          setWinner('draw');
        } else {
          setTurn('ai');
        }
        return next;
      });
    }
  });

  const message = winner === 'X' ? 'You Win!' : winner === 'O' ? 'CPU Wins' : winner === 'draw' ? "It's a Draw" : null;

  return (
    <main className="np-page np-snake">
      <div className="np-snake-hud">
        <h1>Tic-Tac-Toe</h1>
        <div className="np-snake-scores">
          <span>You: {wins.player}</span>
          <span>CPU: {wins.ai}</span>
        </div>
      </div>

      <div className="np-snake-wrap np-ttt-wrap">
        <div className="np-ttt-grid">
          {board.map((cell, i) => (
            <div
              key={i}
              className={`np-ttt-cell ${cursor === i && !winner ? 'cursor' : ''} ${cell === 'X' ? 'x' : cell === 'O' ? 'o' : ''}`}
            >
              {cell}
            </div>
          ))}
        </div>
        {winner && (
          <div className="np-snake-overlay">
            <h2>{message}</h2>
            <div className="np-snake-overlay-actions">
              <button className="np-btn np-btn-primary" onClick={reset}>Play Again</button>
              <Link to="/" className="np-btn np-btn-secondary">Back to Games</Link>
            </div>
            <span className="np-snake-hint">✕ to play again · ○ to go back</span>
          </div>
        )}
      </div>

      <p className="np-snake-controls">D-pad to move the cursor · ✕ to place</p>

      <Leaderboard gameId="tic-tac-toe" refreshKey={boardVersion} />
      <ChatFeed channel="leaderboard:tic-tac-toe" title="Leaderboard Chat" placeholder="Talk trash, give tips..." />
    </main>
  );
}
