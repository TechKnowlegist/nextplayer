import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './AuthContext.jsx';
import ControllerNavigator from './engine/ControllerNavigator';
import { useIsTouchDevice } from './engine/useController';
import { recordPlayed } from './engine/recentlyPlayed';
import { gameBySlug } from './gamesData';
import NavBar from './components/NavBar';
import TouchControls from './components/TouchControls';
import Home from './pages/Home';
import Help from './pages/Help';
import Chat from './pages/Chat';
import ControllerTest from './pages/ControllerTest';
import Account from './pages/Account';
import Snake from './pages/games/Snake';
import DriftRacer from './pages/games/DriftRacer';
import MazeChomper from './pages/games/MazeChomper';
import StarBlaster from './pages/games/StarBlaster';
import Pong from './pages/games/Pong';
import Breakout from './pages/games/Breakout';
import Asteroids from './pages/games/Asteroids';
import Flappy from './pages/games/Flappy';
import Simon from './pages/games/Simon';
import Frogger from './pages/games/Frogger';
import WhackAMole from './pages/games/WhackAMole';
import TicTacToe from './pages/games/TicTacToe';
import Game2048 from './pages/games/Game2048';
import MemoryMatch from './pages/games/MemoryMatch';
import NotFound from './pages/NotFound';
import './App.css';

// Only shows on touch devices, and only on an actual game page — the
// home page, account, and controller-test pages don't need it.
function TouchControlsGate() {
  const isTouch = useIsTouchDevice();
  const { pathname } = useLocation();
  if (!isTouch || !pathname.startsWith('/games/')) return null;
  return <TouchControls thrust={pathname === '/games/asteroids'} />;
}

// Records every game page visited to localStorage so Home's "Continue
// Playing" row can show it — works for guests too, no sign-in involved.
function RecentlyPlayedTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!pathname.startsWith('/games/')) return;
    const game = gameBySlug(pathname.slice('/games/'.length));
    if (game) recordPlayed(game.id);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ControllerNavigator />
        <RecentlyPlayedTracker />
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/help" element={<Help />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/controller" element={<ControllerTest />} />
          <Route path="/account" element={<Account />} />
          <Route path="/games/snake" element={<Snake />} />
          <Route path="/games/drift-racer" element={<DriftRacer />} />
          <Route path="/games/maze-chomper" element={<MazeChomper />} />
          <Route path="/games/star-blaster" element={<StarBlaster />} />
          <Route path="/games/pong" element={<Pong />} />
          <Route path="/games/breakout" element={<Breakout />} />
          <Route path="/games/asteroids" element={<Asteroids />} />
          <Route path="/games/flappy" element={<Flappy />} />
          <Route path="/games/simon" element={<Simon />} />
          <Route path="/games/frogger" element={<Frogger />} />
          <Route path="/games/whack-a-mole" element={<WhackAMole />} />
          <Route path="/games/tic-tac-toe" element={<TicTacToe />} />
          <Route path="/games/2048" element={<Game2048 />} />
          <Route path="/games/memory-match" element={<MemoryMatch />} />
          {/* Anything that doesn't match a page above lands on the 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <TouchControlsGate />
        <footer className="np-footer">© 2026 Next Player</footer>
      </BrowserRouter>
    </AuthProvider>
  );
}
