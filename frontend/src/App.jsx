import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { decodeJWT } from './components/auth/jwt';
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
import AuthCallback from './components/auth/AuthCallback';
import { API_URLS } from './utils';
import { loadProgress, saveProgress, resetProgress } from "./utils/localProgress";


export default function App() {
  const [showAbout, setShowAbout] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  const [user, setUser] = useState(null);

  const handleUpdatePseudo = (updatedUser) => {
    setUser(updatedUser);
  };

  const syncProgress = async (token) => {
    const localProgress = loadProgress();

    try {
      const res = await fetch(API_URLS.progressSync, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ local_progress: localProgress }),
      });

      if (!res.ok) throw new Error("Sync échouée");

      const merged = await res.json();
      const current = loadProgress();
      saveProgress({ ...current, ...merged });

    } catch {
      // échec réseau : on garde le localStorage tel quel, rien ne change
    }
  };


  useEffect(() => {
    // Mock dev : simule un utilisateur connecté sans passer par le flow OAuth
    if (import.meta.env.VITE_MOCK_USER === "true") {
      setUser({
        wca_id: "2022TREM02",
        pseudo: "Alexis Tremellat",
      });
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) return;

    const decoded = decodeJWT(token);
    if (decoded) {
      setUser({ wca_id: decoded.wca_id, pseudo: decoded.pseudo });
    }

    fetch(API_URLS.authMe, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Token invalide");
        return res.json();
      })
      .then(async (data) => {
        setUser(data);
        await syncProgress(token);
      })
      .catch(() => {
        localStorage.removeItem("access_token");
        setUser(null);
      });
  }, []);

  const loginWCA = () => {
    window.location.href = API_URLS.authWcaLogin;
  };

  const logoutWCA = () => {
    localStorage.removeItem("access_token");
    resetProgress();
    setUser(null);
    window.location.reload();
  };

  useEffect(() => {
    const modalOpen = showAbout || showAccount;

    document.body.style.overflow = modalOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [showAbout, showAccount]);

  return (
    <div className="relative flex flex-col min-h-screen bg-cubdle-background">

      <SideBlocks position="left" />
      <SideBlocks position="right" />

      <div className="flex-1 relative z-30">
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/cubeur" element={<GuessCubeur />} />
          <Route path="/competition" element={<GuessCompet />} />
          <Route path="/ranking" element={<GuessRanking />} />
          <Route path="/podium" element={<GuessPodium />} />
          <Route path="/location" element={<GuessLocation />} />

          <Route path="/privacy" element={<Privacy />} />
          <Route path="/legal" element={<Legal />} />

          <Route path="/auth/callback" element={<AuthCallback />} />
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
          onUpdatePseudo={handleUpdatePseudo}
        />
      )}
    </div>
  );
}