import { Navigate, useParams } from 'react-router-dom';
import GameRoute from './GameRoute';
import { isArchivePlayable, isLaunched } from '../utils/dates';
import { archiveGames } from '../utils/games';
import GuessCubeur from '../pages/GuessCubeur';
import GuessCompet from '../pages/GuessCompet';
import GuessPodium from '../pages/GuessPodium';
import GuessNR from '../pages/GuessNR';
import GuessLocation from '../pages/GuessLocation';

const PAGES = {
  cubeur: GuessCubeur,
  compet: GuessCompet,
  podium: GuessPodium,
  nr: GuessNR,
  location: GuessLocation,
};

/** /archives/:date/:game — un jeu d'un ancien jour (hors classement). */
export default function ArchiveGame() {
  const { date, game } = useParams();
  const Page = PAGES[game];

  const allowed =
    isLaunched() &&
    Page &&
    isArchivePlayable(date) &&
    archiveGames(date).some((g) => g.slug === game);

  if (!allowed) return <Navigate to="/archives" replace />;

  return (
    <GameRoute key={`${date}-${game}`} date={date} archive>
      <Page />
    </GameRoute>
  );
}
