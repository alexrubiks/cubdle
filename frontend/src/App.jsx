import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import GuessCubeur from './pages/GuessCubeur';
import GuessPodium from './pages/GuessPodium';
import GuessRanking from './pages/GuessRanking';
import GuessLocation from './pages/GuessLocation';
import GuessCompet from './pages/GuessCompet';
import CornerBlocks from './components/ui/CornerBlocks';

export default function App() {
  return (
    <div className="min-h-screen bg-cubdle-background">
      <CornerBlocks position="top-left" />
      <CornerBlocks position="bottom-right" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cubeur" element={<GuessCubeur />} />
        <Route path="/ranking" element={<GuessRanking />} />
        <Route path="/podium" element={<GuessPodium />} />
        <Route path="/location" element={<GuessLocation />} />
        <Route path="/competition" element={<GuessCompet />} />
      </Routes>
    </div>
  );
}