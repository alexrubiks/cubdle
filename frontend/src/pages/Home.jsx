import MenuButton from '../components/ui/MenuButton';
import CubdleLogo from '../components/ui/CubdleLogo';

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
    subtitle: 'pointe sur la carte',
    color: 'bg-cubdle-blue',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-cubdle-background flex flex-col items-center p-5">
      
      {/* ── LOGO ── */}
      <div className="flex items-center justify-center py-8">
        <CubdleLogo size="xl" />
      </div>

      {/* ── MENU ── */}
      <div className="flex flex-col gap-3 items-center w-full max-w-md">
        {MENU_ITEMS.map((item) => (
          <MenuButton key={item.to} {...item} />
        ))}
      </div>

    </div>
  );
}