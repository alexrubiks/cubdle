import { RubikCell, NameCell } from '../ui/RubikCell';
import { compareValues, getDirection, getRankingDirection } from '../../utils';
import { HeaderCell } from '../ui/HeaderCell';
import { EventHeaderCell } from '../ui/EventHeaderCell';

const EVENTS_SINGLE = new Set(['333bf', '444bf', '555bf', '333mbf']);

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

const SEPARATOR = {
  key: 'sep-events',
  width: '2px',
  header: null,
  renderCell: () => null,
};

function genderLabel(v) {
  if (v === 'm') return 'H';
  if (v === 'f') return 'F';
  if (v === 'o') return 'X';
  return '?';
}


const eventColumns = EVENTS_ORDER.map(slug => {
  return {
    key: `event-${slug}`,
    width: '48px',
    header: <EventHeaderCell slug={slug} label={EVENT_LABEL[slug]} />,
    renderCell: (guess) => {
      const rt = EVENTS_SINGLE.has(slug) ? 'single' : 'average';
      const r  = guess.comparison.rankings?.[`${slug}_${rt}`];

      if (!r || r.value === null) {
        return r?.target == null
          ? <RubikCell color="tile-correct">—</RubikCell>
          : <RubikCell color="tile-wrong">—</RubikCell>;
      }

      return (
        <RubikCell
          color={compareValues(r.value, r.target)}
          direction={getRankingDirection(r.value, r.target)}
        >
          {r.value}
        </RubikCell>
      );
    },
  };
});

export const cubeurColumns = [
  {
    key: 'nom',
    width: '160px',
    header: <HeaderCell icon="👤" label="Nom" />,
    renderCell: (guess) => <NameCell>{guess.name}</NameCell>,
  },
  {
    key: 'genre',
    width: '48px',
    header: <HeaderCell icon="⚥" label="Genre" />,
    renderCell: (guess) => {
      const { value, target } = guess.comparison.gender;
      return (
        <RubikCell color={compareValues(value, target)}>
          {genderLabel(value)}
        </RubikCell>
      );
    },
  },
  {
    key: 'annee',
    width: '48px',
    header: <HeaderCell icon="📅" label="Début" />,
    renderCell: (guess) => {
      const { value, target } = guess.comparison.wca_year;
      return (
        <RubikCell
          color={compareValues(value, target, true)}
          direction={getDirection(value, target)}
        >
          {value}
        </RubikCell>
      );
    },
  },
  {
    key: 'comps',
    width: '48px',
    header: <HeaderCell icon="#" label="Compét." />,
    renderCell: (guess) => {
      const { value, target } = guess.comparison.competition_count;
      return (
        <RubikCell
          color={compareValues(value, target)}
          direction={getDirection(value, target)}
        >
          {value}
        </RubikCell>
      );
    },
  },
  SEPARATOR,
  {
    key: 'gold',
    width: '48px',
    header: <HeaderCell icon="🥇" label="" />,
    renderCell: (guess) => {
      const { value, target } = guess.comparison.gold_count;
      return <RubikCell
        color={compareValues(value, target)}
        direction={getDirection(value, target)}
      >
        {value}
      </RubikCell>;
    },
  },
  {
    key: 'silver',
    width: '48px',
    header: <HeaderCell icon="🥈" label="" />,
    renderCell: (guess) => {
      const { value, target } = guess.comparison.silver_count;
      return <RubikCell
        color={compareValues(value, target)}
        direction={getDirection(value, target)}
      >
        {value}
      </RubikCell>;
    },
  },
  {
    key: 'bronze',
    width: '48px',
    header: <HeaderCell icon="🥉" label="" />,
    renderCell: (guess) => {
      const { value, target } = guess.comparison.bronze_count;
      return <RubikCell
        color={compareValues(value, target)}
        direction={getDirection(value, target)}
      >
        {value}
      </RubikCell>;
    },
  },
  SEPARATOR,
  ...eventColumns,
];