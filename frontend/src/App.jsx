import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import GuessCubeur from './pages/GuessCubeur';
import GuessPodium from './pages/GuessPodium';
import GuessRanking from './pages/GuessRanking';
import GuessLocation from './pages/GuessLocation';
import GuessCompet from './pages/GuessCompet';
import SideBlocks from './components/ui/SideBlocks';
import Privacy from './pages/Privacy';
import Legal from './pages/Legal';

export default function App() {
  return (
    <div className="relative min-h-screen bg-cubdle-background">
      <SideBlocks position="left" />
      <SideBlocks position="right" />

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
  );
}