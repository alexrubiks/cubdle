import MenuButton from '../components/ui/MenuButton';

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
    <div className="min-h-screen flex flex-col items-center justify-center p-5">
      <h1 className="text-3xl font-title font-extrabold mb-6 text-center">Cubdle</h1>
      <div className="flex flex-col gap-3 items-center w-full max-w-md">
        {MENU_ITEMS.map((item) => (
          <MenuButton key={item.to} {...item} />
        ))}
      </div>
    </div>
  );
}