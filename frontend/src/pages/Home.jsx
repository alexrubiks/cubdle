import MenuButton from '../components/ui/MenuButton';
import CubdleLogo from '../components/ui/CubdleLogo';
import { Link } from 'react-router-dom';

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
        <div className="  font-body  font-bold  text-[1em]  text-center  text-white  mt-1  mb-[1em]">
          Tous les jours, devine un{' '}
          <span className="text-cubdle-yellow">
            cubeur
          </span>{' '}
          et bien plus !
        </div>

        {/* MENU */}
        <div className=" flex flex-col gap-[clamp(8px,1.5vh,12px)] items-center w-full">
          {MENU_ITEMS.map((item) => (
            <MenuButton
              key={item.to}
              {...item}
            />
          ))}
        </div>
      </div>
    </div>
  );
}