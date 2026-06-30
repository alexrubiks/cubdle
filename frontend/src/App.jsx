import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import GuessCubeur from './components/games/GuessCubeur';
import GuessPodium from './components/games/GuessPodium';
import GuessRanking from './components/games/GuessRanking';
import GuessLocation from './components/games/GuessLocation';
import GuessCompet from './components/games/GuessCompet';
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