import { useState } from 'react';
import ActionButtons from '../components/ui/ActionButtons';
import LeaderboardModal from '../components/ui/LeaderboardModal';
import HowToPlayModal from '../components/ui/HowToPlayModal';
import MenuButton from '../components/ui/MenuButton';
import CubdleLogo from '../components/ui/CubdleLogo';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { isLaunched, getParisToday } from '../utils/dates';
import { loadProgress } from '../utils/localProgress';
import { doneLabel } from '../utils/scoreLabels';
import { gameByPath } from '../utils/games';

const MENU_ITEMS = [
  {
    to: '/cubeur',
    icon: '/events-icons/333.svg',
    title: 'DEVINE LE CUBEUR',
    subtitle: "à l'aide de ses infos et stats",
    color: 'bg-cubdle-red',
  },
  {
    to: '/competition',
    icon: '/events-icons/pyram.svg',
    title: 'DEVINE LA COMPÉTITION',
    subtitle: 'des indices à chaque essai',
    color: 'bg-cubdle-orange',
  },
  {
    to: '/ranking',
    icon: '/events-icons/minx.svg',
    title: 'DEVINE LE CLASSEMENT',
    subtitle: 'classement FR actuel',
    color: 'bg-cubdle-yellow',
  },
  {
    to: '/podium',
    icon: '/events-icons/333bf.svg',
    title: 'DEVINE LE PODIUM',
    subtitle: "d'un CDF et d'une épreuve",
    color: 'bg-cubdle-green',
  },
  {
    to: '/location',
    icon: '/events-icons/skewb.svg',
    title: 'DEVINE LA LOCALISATION',
    subtitle: 'en pointant sur la carte',
    color: 'bg-cubdle-blue',
  },
];

// Maj de décembre : NR en 5e position (bleu clair, icône FTO), Localisation passe en violet
const NR_ITEM = {
  to: '/nr',
  icon: '/events-icons/fto.svg',
  title: 'DEVINE LE NR',
  subtitle: "avec le temps et l'épreuve",
  color: 'bg-cubdle-blue',
};

function getMenuItems() {
  if (!isLaunched()) return MENU_ITEMS;
  return [
    ...MENU_ITEMS.slice(0, 4),
    NR_ITEM,
    { ...MENU_ITEMS[4], color: 'bg-cubdle-purple' },
  ];
}

export default function Home() {
  const today = getParisToday();
  const todayProgress = loadProgress(today);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  return (
    <div className="flex flex-col items-center px-5 pt-[clamp(8px,2vh,20px)] pb-8">
      <div className="flex flex-col items-center w-full max-w-md text-[clamp(1rem,min(2vw,3vh),1.5rem)]">

        {/* LOGO */}
        <Link
          to="/"
          className=" flex items-center justify-center py-[clamp(10px,3vh,25px)]">
          <CubdleLogo className="text-[6em]" />
        </Link>

        {/* ACCROCHE */}
        <div className="font-body font-bold text-[1em] text-center text-white mt-1 mb-[1em]">
          Tous les jours, devine un{' '}
          <span className="text-cubdle-yellow">
            cubeur
          </span>{' '}
          {/* insécable : "et bien plus !" passe à la ligne en bloc */}
          <span className="whitespace-nowrap">et bien plus !</span>
        </div>

        {/* MENU */}
        <div className=" flex flex-col gap-[clamp(8px,1.5vh,12px)] items-center w-full">
          {getMenuItems().map((item) => (
            <MenuButton
              key={item.to}
              {...item}
              // Maj de décembre : bandeau "terminé" avec le score du jour
              ribbon={isLaunched() ? doneLabel(gameByPath(item.to)?.slug, todayProgress, today) : null}
            />
          ))}
        </div>

        {/* BOUTONS */}
        <ActionButtons
          onLeaderboard={() => setShowLeaderboard(true)}
          onHowToPlay={() => setShowHowToPlay(true)}
        />

        {isLaunched() && (
          <Link
            to="/archives"
            className="mt-3 flex items-center justify-center gap-1.5 font-body text-sm font-bold text-white/80 underline-offset-4 hover:text-white hover:underline"
          >
            <CalendarDays size={16} strokeWidth={2.5} />
            Rejouer les anciens défis
          </Link>
        )}

        {showLeaderboard && (
          <LeaderboardModal onClose={() => setShowLeaderboard(false)} />
        )}

        {showHowToPlay && (
          <HowToPlayModal gameKey={isLaunched() ? "general_v2" : "general"} onClose={() => setShowHowToPlay(false)} />
        )}

      </div>
    </div>
  );
}