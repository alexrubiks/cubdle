import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Home from './pages/Home';
import GuessCubeur from './pages/GuessCubeur';
import GuessPodium from './pages/GuessPodium';
import GuessRanking from './pages/GuessRanking';
import GuessLocation from './pages/GuessLocation';
import GuessCompet from './pages/GuessCompet';
import SideBlocks from './components/ui/SideBlocks';
import Privacy from './pages/Privacy';
import Legal from './pages/Legal';
import Footer from './components/ui/Footer';
import AboutModal from './components/ui/AboutModal';
import AccountModal from './components/ui/AccountModal';


export default function App() {
  const [showAbout, setShowAbout] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data))
      .catch(() => {});
  }, []);

  const loginWCA = () => {
    window.location.href = "/api/auth/wca/login";
  };

  const logoutWCA = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    setUser(null);
  };

  return (
    <div className="relative flex flex-col min-h-screen bg-cubdle-background">

      <SideBlocks position="left" />
      <SideBlocks position="right" />

      <div className="flex-1 z-20">
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/cubeur" element={<GuessCubeur />} />
          <Route path="/competition" element={<GuessCompet />} />
          <Route path="/ranking" element={<GuessRanking />} />
          <Route path="/podium" element={<GuessPodium />} />
          <Route path="/location" element={<GuessLocation />} />

          <Route path="/privacy" element={<Privacy />} />
          <Route path="/legal" element={<Legal />} />
        </Routes>
      </div>

      <Footer
        onAbout={() => setShowAbout(true)}
        onAccount={() => setShowAccount(true)}
      />

      {showAbout && (
        <AboutModal
          onClose={() => setShowAbout(false)}
        />
      )}

      {showAccount && (
        <AccountModal
          onClose={() => setShowAccount(false)}
          user={user}
          onLogin={loginWCA}
          onLogout={logoutWCA}
        />
      )}
    </div>
  );
}