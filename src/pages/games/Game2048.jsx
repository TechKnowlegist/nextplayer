import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import input from '../../engine/input';
import { useControllerFrame, useMenuNav } from '../../engine/useController';
import { useSubmitScore } from '../../engine/useSubmitScore';
import { play } from '../../engine/sound';
import Leaderboard from '../../components/Leaderboard';
import ChatFeed from '../../components/ChatFeed';

const SIZE = 4;
const BEST_KEY = 'np-2048-best';

function emptyGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function spawnTile(grid) {
  const empty = [];
  grid.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r, c]); }));
  if (!empty.length) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = grid.map((row) => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slideLine(line) {
  const nums = line.filter((v) => v !== 0);
  const merged = [];
  let scoreGained = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i < nums.length - 1 && nums[i] === nums[i + 1]) {
      merged.push(nums[i] * 2);
      scoreGained += nums[i] * 2;
      i++;
    } else {
      merged.push(nums[i]);
    }
  }
  while (merged.length < line.length) merged.push(0);
  return { line: merged, scoreGained };
}

function move(grid, dir) {
  const newGrid = grid.map((row) => [...row]);
  let moved = false;
  let scoreGained = 0;

  const getLine = (i) => {
    if (dir === 'left') return newGrid[i];
    if (dir === 'right') return [...newGrid[i]].reverse();
    if (dir === 'up') return newGrid.map((row) => row[i]);
    return newGrid.map((row) => row[i]).reverse(); // down
  };
  const setLine = (i, line) => {
    if (dir === 'left') newGrid[i] = line;
    else if (dir === 'right') newGrid[i] = [...line].reverse();
    else if (dir === 'up') line.forEach((v, r) => (newGrid[r][i] = v));
    else {
      const rev = [...line].reverse();
      rev.forEach((v, r) => (newGrid[r][i] = v));
    }
  };

  for (let i = 0; i < SIZE; i++) {
    const original = getLine(i);
    const { line, scoreGained: sg } = slideLine(original);
    if (line.some((v, idx) => v !== original[idx])) moved = true;
    scoreGained += sg;
    setLine(i, line);
  }
  return { grid: newGrid, moved, scoreGained };
}

function noMovesLeft(grid) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!grid[r][c]) return false;
      if (c < SIZE - 1 && grid[r][c] === grid[r][c + 1]) return false;
      if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return false;
    }
  }
  return true;
}

const TILE_COLORS = {
  2: '#0d0f13', 4: '#111827', 8: '#22c55e', 16: '#2dd4bf', 32: '#38bdf8',
  64: '#3b82f6', 128: '#a855f7', 256: '#c084fc', 512: '#f472b6', 1024: '#f87171', 2048: '#facc15',
};

function freshGrid() {
  return spawnTile(spawnTile(emptyGrid()));
}

export default function Game2048() {
  useMenuNav(false);
  const navigate = useNavigate();
  const [grid, setGrid] = useState(freshGrid);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY)) || 0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [boardVersion, setBoardVersion] = useState(0);
  const submitScore = useSubmitScore('2048');

  useEffect(() => {
    input.captureKeyboard(true);
    return () => input.captureKeyboard(false);
  }, []);

  function reset() {
    setGrid(freshGrid());
    setScore(0);
    setGameOver(false);
    setWon(false);
  }

  function doMove(dir) {
    if (gameOver || won) return;
    setGrid((prev) => {
      const { grid: moved, moved: didMove, scoreGained } = move(prev, dir);
      if (!didMove) return prev;
      const withNew = spawnTile(moved);
      const newScore = score + scoreGained;
      setScore(newScore);
      setBest((prevBest) => {
        const next = Math.max(prevBest, newScore);
        localStorage.setItem(BEST_KEY, String(next));
        return next;
      });
      if (scoreGained > 0) play('eat');
      if (withNew.some((row) => row.some((v) => v >= 2048))) {
        setWon(true);
        play('waveClear');
        submitScore(newScore);
        setBoardVersion((v) => v + 1);
      } else if (noMovesLeft(withNew)) {
        setGameOver(true);
        play('gameOver');
        submitScore(newScore);
        setBoardVersion((v) => v + 1);
      }
      return withNew;
    });
  }

  useControllerFrame((state) => {
    const b = state.buttons;
    if (gameOver || won) {
      if (b.cross.justPressed) reset();
      if (b.circle.justPressed) navigate('/');
      return;
    }
    if (b.up.justPressed) doMove('up');
    else if (b.down.justPressed) doMove('down');
    else if (b.left.justPressed) doMove('left');
    else if (b.right.justPressed) doMove('right');
  });

  const done = gameOver || won;

  return (
    <main className="np-page np-snake">
      <div className="np-snake-hud">
        <h1>2048</h1>
        <div className="np-snake-scores">
          <span>Score: {score}</span>
          <span>Best: {best}</span>
        </div>
      </div>

      <div className="np-snake-wrap np-2048-wrap">
        <div className="np-2048-grid">
          {grid.flatMap((row, r) => row.map((v, c) => (
            <div
              key={`${r}-${c}`}
              className="np-2048-tile"
              style={{
                background: v ? TILE_COLORS[v] || '#facc15' : 'rgba(255,255,255,0.04)',
                color: v <= 4 ? 'rgba(255,255,255,0.8)' : '#0a120d',
              }}
            >
              {v || ''}
            </div>
          )))}
        </div>
        {done && (
          <div className="np-snake-overlay">
            <h2>{won ? 'You reached 2048!' : 'No More Moves'}</h2>
            <p>Score: {score}{score >= best && score > 0 ? ' — new best!' : ''}</p>
            <div className="np-snake-overlay-actions">
              <button className="np-btn np-btn-primary" onClick={reset}>Play Again</button>
              <Link to="/" className="np-btn np-btn-secondary">Back to Games</Link>
            </div>
            <span className="np-snake-hint">✕ to play again · ○ to go back</span>
          </div>
        )}
      </div>

      <p className="np-snake-controls">D-pad / stick / arrow keys / WASD to slide the tiles</p>

      <Leaderboard gameId="2048" refreshKey={boardVersion} />
      <ChatFeed channel="leaderboard:2048" title="Leaderboard Chat" placeholder="Talk trash, give tips..." />
    </main>
  );
}
