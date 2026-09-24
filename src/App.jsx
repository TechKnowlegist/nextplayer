import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext.jsx';
import ControllerNavigator from './engine/ControllerNavigator';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import ControllerTest from './pages/ControllerTest';
import Account from './pages/Account';
import NotFound from './pages/NotFound';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ControllerNavigator />
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/controller" element={<ControllerTest />} />
          <Route path="/account" element={<Account />} />
          {/* Anything that doesn't match a page above lands on the 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <footer className="np-footer">© 2026 Next Player</footer>
      </BrowserRouter>
    </AuthProvider>
  );
}
