import MenuButton from '../components/ui/MenuButton';
import CubdleLogo from '../components/ui/CubdleLogo';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { User, Info, Coffee } from 'lucide-react';
import AboutModal from '../components/ui/AboutModal';
import AccountModal from '../components/ui/AccountModal';

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

export default function Home() {
  const [showAbout, setShowAbout] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  const [user, setUser] = useState(null);

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
    <div className="min-h-screen flex flex-col items-center px-5 py-[clamp(8px,2vh,14px)]">
      <div className="flex flex-col items-center text-[clamp(1rem,min(2vw,3vh),1.5rem)]">
        {/* ── LOGO ── */}
        <Link
          to="/"
          className="flex items-center justify-center py-[clamp(10px,4vh,30px)]"
        >
          <CubdleLogo className="text-[6em]" />
        </Link>

        <div
          className="
            font-body
            font-bold
            text-[1em]
            mt-1
            mb-[1em]
            text-white
          "
        >
          Tous les jours, devine un <span className="text-cubdle-yellow">cubeur</span> et bien plus !
        </div>
      
        {/* ── MENU ── */}
        <div className="flex flex-col gap-3 items-center w-full max-w-md">
          {MENU_ITEMS.map((item) => (
            <MenuButton key={item.to} {...item} />
          ))}
        </div>
      </div>

      <footer className="w-full max-w-md mt-10 pt-6 border-white/10 flex flex-col items-center gap-4">

        <div className="flex gap-4">

          <button
            onClick={() => setShowAccount(true)}
            className="w-12 h-12 rounded-full border-4 border-black bg-white flex items-center justify-center hover:scale-105 transition-transform"
          >
            <User size={22} strokeWidth={3}/>
          </button>


          <button
            onClick={() => setShowAbout(true)}
            className="w-12 h-12 rounded-full border-4 border-black bg-white flex items-center justify-center hover:scale-105 transition-transform"
          >
            <Info size={22} strokeWidth={3}/>
          </button>

          <a
            href="https://ko-fi.com/alexrubiks"
            target="_blank"
            rel="noopener noreferrer"
            className=" w-12 h-12 rounded-full border-4 border-black bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            aria-label="Me soutenir"
          >
            <Coffee size={22} strokeWidth={3} />
          </a>

        </div>

        <p className="font-body text-xs text-center text-white/70">
          La WCA n'approuve ni ne sponsorise ce projet.
        </p>

        <div className="flex items-center gap-2">
          <Link
            to="/privacy"
            className="font-body text-xs underline text-white/70 hover:text-white"
          >
            Politique de confidentialité
          </Link>

          <span className="text-white/40">
            ·
          </span>

          <Link
            to="/legal"
            className="font-body text-xs underline text-white/70 hover:text-white"
          >
            Mentions légales
          </Link>
        </div>

        <p className="font-body text-xs text-white/50 text-center">
          © 2026 Alexis Tremellat · Tous droits réservés
        </p>

      </footer>

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