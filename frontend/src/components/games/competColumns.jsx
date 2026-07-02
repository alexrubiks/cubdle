import { RubikCell, NameCell } from '../../components/ui/RubikCell';
import { compareValues, compareList, compareMonth } from '../../utils';
import { HeaderCell } from '../ui/HeaderCell';
import { EventHeaderCell } from '../ui/EventHeaderCell';

const EVENTS_ORDER = [
  '333', '222', '444', '555', '666', '777',
  '333bf', '333fm', '333oh', 'clock', 'minx',
  'pyram', 'skewb', 'sq1', '444bf', '555bf', '333mbf',
];

const EVENT_LABEL = {
  '333': '3x3', '222': '2x2', '444': '4x4', '555': '5x5',
  '666': '6x6', '777': '7x7', '333bf': '3BLD', '333fm': 'FMC',
  '333oh': 'OH', 'clock': 'Clock', 'minx': 'Mega', 'pyram': 'Pyra',
  'skewb': 'Skewb', 'sq1': 'SQ1', '444bf': '4BLD', '555bf': '5BLD',
  '333mbf': 'MBLD',
};

const eventColumns = EVENTS_ORDER.map(slug => ({
  key: `event-${slug}`,
  width: '56px',
  header: <EventHeaderCell slug={slug} label={EVENT_LABEL[slug]} />,
  renderCell: (guess) => {
    const { value, target } = guess.comparison.events[slug] ?? {};
    if (value === undefined) return <RubikCell color="tile-none" />;
    
    if (value && target)   return <RubikCell color="tile-correct" />;
    if (!value && !target) return <RubikCell color="tile-correct" />;
    return <RubikCell color="tile-wrong" />;
  },
}));

export const competColumns = [
  {
    key: 'nom',
    width: '180px',
    header: (
      <span className="font-body text-[9px] uppercase tracking-wide text-black/40 self-start">
        Compétition
      </span>
    ),
    renderCell: (guess) => <NameCell>{guess.name}</NameCell>,
  },
  {
    key: 'mois',
    width: '80px',
    header: <HeaderCell icon="📅" label="Mois" />,
    renderCell: (guess) => {
      const { value, target } = guess.comparison.month;
      return (
        <RubikCell color={compareMonth(value, target)}>
          {value}
        </RubikCell>
      );
    },
  },
  {
    key: 'annee',
    width: '72px',
    header: <HeaderCell icon="📆" label="Année" />,
    renderCell: (guess) => {
      const { value, target } = guess.comparison.year;
      return (
        <RubikCell color={compareValues(value, target)}>
          {value}
        </RubikCell>
      );
    },
  },
  {
    key: 'participants',
    width: '64px',
    header: <HeaderCell icon="👥" label="Partici." />,
    renderCell: (guess) => {
      const { value, target } = guess.comparison.participant_count;
      return (
        <RubikCell color={compareValues(value, target)}>
          {value}
        </RubikCell>
      );
    },
  },
  ...eventColumns,
  {
    key: 'organisateurs',
    width: '120px',
    header: <HeaderCell icon="🎙️" label="Orga." />,
    renderCell: (guess) => {
      const { value, target } = guess.comparison.organizers;
      return (
        <RubikCell color={compareList(value, target)}>
          {value?.length ?? 0}
        </RubikCell>
      );
    },
  },
  {
    key: 'delegues',
    width: '120px',
    header: <HeaderCell icon="🏅" label="Délég." />,
    renderCell: (guess) => {
      const { value, target } = guess.comparison.delegates;
      return (
        <RubikCell color={compareList(value, target)}>
          {value?.length ?? 0}
        </RubikCell>
      );
    },
  },
];