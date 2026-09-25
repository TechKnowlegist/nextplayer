import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import input from '../../engine/input';
import { useControllerFrame, useMenuNav } from '../../engine/useController';
import { useSubmitScore } from '../../engine/useSubmitScore';
import { play } from '../../engine/sound';
import Leaderboard from '../../components/Leaderboard';
import ChatFeed from '../../components/ChatFeed';

const CELL = 26;
const MW = 7; // maze width in cells
const MH = 5; // maze height in cells
const GRID_W = MW * 2 + 1; // odd lattice: cell centers sit on odd coords, walls can sit between them
const GRID_H = MH * 2 + 1;
const CANVAS_W = GRID_W * CELL;
const CANVAS_H = GRID_H * CELL;
const TICK_MS = 160;
const FRIGHT_MS = 6000;
const BEST_KEY = 'np-chomper-best';

// Randomized-DFS "perfect maze" on a cell lattice, then a few random extra
// passages opened up for loops (ghosts otherwise corner the player too
// easily in a loop-free tree maze). Because it starts from a fully
// connected spanning tree and only ever opens more walls, every dot is
// always guaranteed reachable — no hand-authored layout to get wrong.
function generateMaze() {
  const walls = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(true));
  for (let cy = 0; cy < MH; cy++) {
    for (let cx = 0; cx < MW; cx++) walls[cy * 2 + 1][cx * 2 + 1] = false;
  }
  const visited = Array.from({ length: MH }, () => Array(MW).fill(false));
  const stack = [[0, 0]];
  visited[0][0] = true;
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const options = [];
    if (cx > 0 && !visited[cy][cx - 1]) options.push([cx - 1, cy]);
    if (cx < MW - 1 && !visited[cy][cx + 1]) options.push([cx + 1, cy]);
    if (cy > 0 && !visited[cy - 1][cx]) options.push([cx, cy - 1]);
    if (cy < MH - 1 && !visited[cy + 1][cx]) options.push([cx, cy + 1]);
    if (!options.length) {
      stack.pop();
      continue;
    }
    const [nx, ny] = options[Math.floor(Math.random() * options.length)];
    walls[cy * 2 + 1 + (ny - cy)][cx * 2 + 1 + (nx - cx)] = false;
    visited[ny][nx] = true;
    stack.push([nx, ny]);
  }
  for (let cy = 0; cy < MH; cy++) {
    for (let cx = 0; cx < MW; cx++) {
      if (cx < MW - 1 && Math.random() < 0.12) walls[cy * 2 + 1][cx * 2 + 2] = false;
      if (cy < MH - 1 && Math.random() < 0.12) walls[cy * 2 + 2][cx * 2 + 1] = false;
    }
  }
  return walls;
}

function placeDots(playerStart) {
  const dots = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(null));
  for (let cy = 0; cy < MH; cy++) {
    for (let cx = 0; cx < MW; cx++) {
      const x = cx * 2 + 1;
      const y = cy * 2 + 1;
      if (x === playerStart.x && y === playerStart.y) continue;
      dots[y][x] = 'dot';
    }
  }
  const corners = [
    { x: 1, y: 1 },
    { x: (MW - 1) * 2 + 1, y: 1 },
    { x: 1, y: (MH - 1) * 2 + 1 },
    { x: (MW - 1) * 2 + 1, y: (MH - 1) * 2 + 1 },
  ];
  corners.forEach(({ x, y }) => {
    if (x !== playerStart.x || y !== playerStart.y) dots[y][x] = 'power';
  });
  return dots;
}

// Single BFS from the player each tick gives every cell's distance to the
// player in one pass — cheap, and lets each ghost just greedily step
// toward (or away from, while scared) a lower/higher number.
function bfsDistances(walls, start) {
  const dist = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(Infinity));
  dist[start.y][start.x] = 0;
  const queue = [start];
  let qi = 0;
  while (qi < queue.length) {
    const { x, y } = queue[qi++];
    const d = dist[y][x];
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H || walls[ny][nx]) continue;
      if (dist[ny][nx] > d + 1) {
        dist[ny][nx] = d + 1;
        queue.push({ x: nx, y: ny });
      }
    }
  }
  return dist;
}

function ghostStep(walls, ghost, dist, fleeing) {
  const options = [[ghost.x + 1, ghost.y], [ghost.x - 1, ghost.y], [ghost.x, ghost.y + 1], [ghost.x, ghost.y - 1]]
    .filter(([x, y]) => x >= 0 && x < GRID_W && y >= 0 && y < GRID_H && !walls[y][x]);
  if (!options.length) return { x: ghost.x, y: ghost.y };
  let best = options[0];
  let bestScore = fleeing ? -Infinity : Infinity;
  for (const [x, y] of options) {
    const d = dist[y][x];
    if (fleeing ? d > bestScore : d < bestScore) {
      bestScore = d;
      best = [x, y];
    }
  }
  return { x: best[0], y: best[1] };
}

function freshState() {
  const walls = generateMaze();
  const start = { x: 2 * Math.floor(MW / 2) + 1, y: 2 * Math.floor(MH / 2) + 1 };
  const dots = placeDots(start);
  let dotsLeft = 0;
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) if (dots[y][x]) dotsLeft++;
  const ghostY = start.y;
  const ghosts = [
    { x: 2 * Math.max(0, Math.floor(MW / 2) - 2) + 1, y: ghostY, scared: false },
    { x: 2 * Math.min(MW - 1, Math.floor(MW / 2) + 2) + 1, y: ghostY, scared: false },
  ].map((g) => ({ ...g, home: { x: g.x, y: g.y } }));

  return {
    walls,
    dots,
    dotsLeft,
    player: { ...start },
    dir: { x: 0, y: 0 },
    nextDir: { x: 0, y: 0 },
    ghosts,
    ghostMoveParity: 0,
    frightTimer: 0,
    // A brief "Ready!" pause before ghosts start moving — without it they
    // spawn close enough to the player to catch them before the player
    // can even react to the first frame.
    readyTimer: 1300,
    score: 0,
    acc: 0,
    lastTime: null,
    alive: true,
  };
}

export default function MazeChomper() {
  useMenuNav(false);
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const stateRef = useRef(freshState());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY)) || 0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [ready, setReady] = useState(true);
  const [boardVersion, setBoardVersion] = useState(0);
  const submitScore = useSubmitScore('maze-chomper');

  useEffect(() => {
    input.captureKeyboard(true);
    return () => input.captureKeyboard(false);
  }, []);

  function reset() {
    stateRef.current = freshState();
    setScore(0);
    setGameOver(false);
    setWon(false);
    setReady(true);
  }

  function endGame(s, didWin) {
    s.alive = false;
    if (didWin) setWon(true);
    else setGameOver(true);
    setBest((prev) => {
      const next = Math.max(prev, s.score);
      localStorage.setItem(BEST_KEY, String(next));
      return next;
    });
    if (didWin) play('eat');
    else {
      play('gameOver');
      input.rumble({ strong: 0.7, weak: 0.7, duration: 300 });
    }
    submitScore(s.score);
    setBoardVersion((v) => v + 1);
  }

  function tick(s) {
    if (s.frightTimer > 0) {
      s.frightTimer -= TICK_MS;
      if (s.frightTimer <= 0) {
        s.frightTimer = 0;
        s.ghosts.forEach((g) => (g.scared = false));
      }
    }

    const canMove = (dir) => {
      if (dir.x === 0 && dir.y === 0) return false;
      const nx = s.player.x + dir.x;
      const ny = s.player.y + dir.y;
      return nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H && !s.walls[ny][nx];
    };
    const moveDir = canMove(s.nextDir) ? s.nextDir : canMove(s.dir) ? s.dir : null;
    if (moveDir) {
      s.dir = moveDir;
      s.player = { x: s.player.x + moveDir.x, y: s.player.y + moveDir.y };
    }

    const cell = s.dots[s.player.y][s.player.x];
    if (cell) {
      s.dots[s.player.y][s.player.x] = null;
      s.dotsLeft -= 1;
      s.score += cell === 'power' ? 50 : 10;
      setScore(s.score);
      play('eat');
      if (cell === 'power') {
        s.frightTimer = FRIGHT_MS;
        s.ghosts.forEach((g) => (g.scared = true));
      }
      if (s.dotsLeft <= 0) return endGame(s, true);
    }

    // Ghosts move at half player speed — keeps a fair chase instead of
    // an always-optimal shortest-path ghost catching the player instantly.
    s.ghostMoveParity = (s.ghostMoveParity + 1) % 2;
    if (s.ghostMoveParity === 0) {
      const dist = bfsDistances(s.walls, s.player);
      s.ghosts.forEach((g) => {
        const next = ghostStep(s.walls, g, dist, g.scared);
        g.x = next.x;
        g.y = next.y;
      });
    }

    for (const g of s.ghosts) {
      if (g.x === s.player.x && g.y === s.player.y) {
        if (g.scared) {
          s.score += 100;
          setScore(s.score);
          g.x = g.home.x;
          g.y = g.home.y;
          g.scared = false;
        } else {
          return endGame(s, false);
        }
      }
    }
  }

  function draw(s) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = 'rgba(45, 212, 191, 0.1)';
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (s.walls[y][x]) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }

    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const d = s.dots[y][x];
        if (!d) continue;
        ctx.fillStyle = d === 'power' ? '#facc15' : 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, d === 'power' ? 6 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    s.ghosts.forEach((g, i) => {
      ctx.fillStyle = g.scared ? '#38bdf8' : i === 0 ? '#f87171' : '#a855f7';
      ctx.beginPath();
      ctx.arc(g.x * CELL + CELL / 2, g.y * CELL + CELL / 2, CELL / 2.4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(s.player.x * CELL + CELL / 2, s.player.y * CELL + CELL / 2, CELL / 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  useControllerFrame((state, time) => {
    const s = stateRef.current;
    if (s.lastTime == null) s.lastTime = time;
    const delta = Math.min(time - s.lastTime, TICK_MS * 3);
    s.lastTime = time;

    const b = state.buttons;
    const { lx, ly } = state.sticks;

    if (!s.alive) {
      if (b.cross.justPressed) reset();
      if (b.circle.justPressed) navigate('/');
      return;
    }

    if (s.readyTimer > 0) {
      s.readyTimer -= delta;
      if (s.readyTimer <= 0) {
        s.readyTimer = 0;
        setReady(false);
      }
      draw(s);
      return;
    }

    let dir = null;
    if (b.up.pressed || ly < -0.5) dir = { x: 0, y: -1 };
    else if (b.down.pressed || ly > 0.5) dir = { x: 0, y: 1 };
    else if (b.left.pressed || lx < -0.5) dir = { x: -1, y: 0 };
    else if (b.right.pressed || lx > 0.5) dir = { x: 1, y: 0 };
    if (dir) s.nextDir = dir;

    s.acc += delta;
    while (s.acc >= TICK_MS && s.alive) {
      s.acc -= TICK_MS;
      tick(s);
    }
    draw(s);
  });

  const done = gameOver || won;

  return (
    <main className="np-page np-snake">
      <div className="np-snake-hud">
        <h1>Maze Chomper</h1>
        <div className="np-snake-scores">
          <span>Score: {score}</span>
          <span>Best: {best}</span>
        </div>
      </div>

      <div className="np-snake-wrap">
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="np-snake-canvas" />
        {ready && !done && (
          <div className="np-snake-overlay">
            <h2>Ready!</h2>
          </div>
        )}
        {done && (
          <div className="np-snake-overlay">
            <h2>{won ? 'You Win!' : 'Game Over'}</h2>
            <p>Score: {score}{score >= best && score > 0 ? ' — new best!' : ''}</p>
            <div className="np-snake-overlay-actions">
              <button className="np-btn np-btn-primary" onClick={reset}>Play Again</button>
              <Link to="/" className="np-btn np-btn-secondary">Back to Games</Link>
            </div>
            <span className="np-snake-hint">✕ to play again · ○ to go back</span>
          </div>
        )}
      </div>

      <p className="np-snake-controls">D-pad / left stick / arrow keys / WASD — grab the big dots to turn the tables</p>

      <Leaderboard gameId="maze-chomper" refreshKey={boardVersion} />
      <ChatFeed channel="leaderboard:maze-chomper" title="Leaderboard Chat" placeholder="Talk trash, give tips..." />
    </main>
  );
}
