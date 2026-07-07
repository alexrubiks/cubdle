import { RubikCell, NameCell } from '../ui/RubikCell';
import { getRankingDirection, getDirection, EVENTS_ORDER, EVENTS_SINGLE, EVENT_LABEL } from '../../utils';
import { HeaderCell } from '../ui/HeaderCell';
import { EventHeaderCell } from '../ui/EventHeaderCell';

const STATUS_COLOR = {
  'correct': 'tile-correct',
  'near':    'tile-near',
  'partial': 'tile-partial',
  'wrong':   'tile-wrong',
};

const TILE_EMOJI = {
  'correct': '🟩',
  'near':    '🟨',
  'partial': '🟧',
  'wrong':   '🟥',
};

const separator = (key) => ({
  key,
  width: '2px',
  header: null,
  renderCell: () => null,
});

function genderLabel(v) {
  if (v === 'm') return 'H';
  if (v === 'f') return 'F';
  if (v === 'o') return 'X';
  return '?';
}

const eventColumns = EVENTS_ORDER.map(slug => ({
  key: `event-${slug}`,
  width: '48px',
  header: <EventHeaderCell slug={slug} label={EVENT_LABEL[slug]} />,
  renderCell: (guess) => {
    const rt = EVENTS_SINGLE.has(slug) ? 'single' : 'average';
    const r  = guess.comparison.rankings?.[`${slug}_${rt}`];

    if (!r || r.value === null) {
      return r?.status === 'correct'
        ? <RubikCell color="tile-correct">—</RubikCell>
        : <RubikCell color="tile-wrong">—</RubikCell>;
    }

    return (
      <RubikCell
        color={STATUS_COLOR[r.status] ?? 'tile-wrong'}
        direction={getRankingDirection(r.value, r.target)}
      >
        {r.value}
      </RubikCell>
    );
  },
}));

export function buildShareTextCubeur(guesses) {
  const allLines = [...guesses].reverse().map(guess => {
    const c = guess.comparison;

    const cells = [
      c.gender.status,
      c.wca_year.status,
      c.competition_count.status,
      c.gold_count.status,
      c.silver_count.status,
      c.bronze_count.status,
    ].map(status => TILE_EMOJI[status] ?? '⬜').join('');

    return `${cells}`;
  });

  const MAX = 5;
  const lines = allLines.length <= MAX + 1
    ? allLines
    : [...allLines.slice(0, MAX), '...', allLines[allLines.length - 1]];

  return [
    '🎯 Cubdle — Devine le Cubeur 👤',
    `Trouvé en ${guesses.length} essai${guesses.length > 1 ? 's' : ''} !`,
    '',
    ...lines,
    '',
    'https://cubdle.alexrubiks.fr',
  ].join('\n');
}

export const cubeurColumns = [
  {
    key: 'nom',
    width: '160px',
    header: <HeaderCell icon="👤" label="Cubeur" />,
    renderCell: (guess) => <NameCell>{guess.name}</NameCell>,
  },
  separator('sep-nom'),
  {
    key: 'genre',
    width: '48px',
    header: <HeaderCell icon="⚥" label="Genre" />,
    renderCell: (guess) => {
      const { value, status } = guess.comparison.gender;
      return (
        <RubikCell color={STATUS_COLOR[status] ?? 'tile-wrong'}>
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
      const { value, target, status } = guess.comparison.wca_year;
      return (
        <RubikCell
          color={STATUS_COLOR[status] ?? 'tile-wrong'}
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
    header: <HeaderCell icon="#" label="Compets" />,
    renderCell: (guess) => {
      const { value, target, status } = guess.comparison.competition_count;
      return (
        <RubikCell
          color={STATUS_COLOR[status] ?? 'tile-wrong'}
          direction={getDirection(value, target)}
        >
          {value}
        </RubikCell>
      );
    },
  },
  separator('sep-infos'),
  {
    key: 'gold',
    width: '48px',
    header: <HeaderCell icon="🥇" label="" />,
    renderCell: (guess) => {
      const { value, target, status } = guess.comparison.gold_count;
      return (
        <RubikCell
          color={STATUS_COLOR[status] ?? 'tile-wrong'}
          direction={getDirection(value, target)}
        >
          {value}
        </RubikCell>
      );
    },
  },
  {
    key: 'silver',
    width: '48px',
    header: <HeaderCell icon="🥈" label="" />,
    renderCell: (guess) => {
      const { value, target, status } = guess.comparison.silver_count;
      return (
        <RubikCell
          color={STATUS_COLOR[status] ?? 'tile-wrong'}
          direction={getDirection(value, target)}
        >
          {value}
        </RubikCell>
      );
    },
  },
  {
    key: 'bronze',
    width: '48px',
    header: <HeaderCell icon="🥉" label="" />,
    renderCell: (guess) => {
      const { value, target, status } = guess.comparison.bronze_count;
      return (
        <RubikCell
          color={STATUS_COLOR[status] ?? 'tile-wrong'}
          direction={getDirection(value, target)}
        >
          {value}
        </RubikCell>
      );
    },
  },
  separator('sep-podiums'),
  ...eventColumns,
];


export default cubeurColumns;