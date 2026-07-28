import { ListCell, PeriodCell, RubikCell, NameCell } from '../ui/RubikCell';
import { getDirection, EVENTS_ORDER, EVENT_LABEL } from '../../utils';
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

const eventColumns = EVENTS_ORDER.map(slug => ({
  key: `event-${slug}`,
  width: '48px',
  header: <EventHeaderCell slug={slug} label={EVENT_LABEL[slug]} />,
  renderCell: (guess) => {
    const { value, status } = guess.comparison.events[slug] ?? {};

    if (value === undefined || !value) return <RubikCell color="tile-none" />;
    if (status) return <RubikCell color="tile-correct" />;
    return <RubikCell color="tile-wrong" />;
  },
}));

export function buildShareTextCompet(guesses) {
  const allLines = [...guesses].reverse().map(guess => {
    const c = guess.comparison;

    const cells = [
      c.month.status,
      c.year.status,
      c.participant_count.status,
      c.organizers.status,
      c.delegates.status,
    ].map(status => TILE_EMOJI[status] ?? '⬜').join('');

    return `${cells}`;
  });

  const MAX = 5;
  const lines = allLines.length <= MAX + 1
    ? allLines
    : [...allLines.slice(0, MAX), '...', allLines[allLines.length - 1]];

  return [
    '🎯 Cubdle — Devine la Compétition 🏆',
    `Trouvé en ${guesses.length} essai${guesses.length > 1 ? 's' : ''} !`,
    '',
    ...lines,
    '',
    'https://cubdle.alexrubiks.fr',
  ].join('\n');
}

export const competColumns = [
  {
    key: 'nom',
    width: '200px',
    header: <HeaderCell icon="🏆" label="Compétition" />,
    renderCell: (guess) => <NameCell width='200px'>{guess.name}</NameCell>,
  },
  separator('sep-nom'),
  {
    key: 'mois',
    width: '80px',
    header: <HeaderCell icon="📅" label="Mois" />,
    renderCell: (guess) => {
      const { display_value, direction, status } = guess.comparison.month;
      return (
        <PeriodCell
          color={STATUS_COLOR[status] ?? 'tile-wrong'}
          direction={direction}
          width={'80px'}
        >
          {display_value}
        </PeriodCell>
      );
    },
  },
  {
    key: 'annee',
    width: '48px',
    header: <HeaderCell icon="📅" label="Année" />,
    renderCell: (guess) => {
      const { value, direction, status } = guess.comparison.year;
      return (
        <PeriodCell
          color={STATUS_COLOR[status] ?? 'tile-wrong'}
          direction={direction}
        >
          {value}
        </PeriodCell>
      );
    },
  },
  
  separator('sep-participants'),
  {
    key: 'participants',
    width: '48px',
    header: <HeaderCell icon="#" label="Competiteurs" />,
    renderCell: (guess) => {
      const { value, target, status} = guess.comparison.participant_count;
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
  separator('sep-events'),
  ...eventColumns,
  separator('sep-orga'),
  {
    key: 'organisateurs',
    width: '48px',
    header: <HeaderCell icon="🎙️" label="Orgas" />,
    renderCell: (guess, id, openedCell, setOpenedCell) => {
      const { status, value } = guess.comparison.organizers;

      return (
        <ListCell
          id={id}
          color={STATUS_COLOR[status] ?? 'tile-wrong'}
          value={value}
          open={openedCell === id}
          onOpen={() => setOpenedCell(id)}
          onClose={() => setOpenedCell(null)}
        >
          {value?.length ?? 0}
        </ListCell>
      );
    },
  },
  {
    key: 'delegues',
    width: '48px',
    header: <HeaderCell icon="🏅" label="Délégués" />,
    renderCell: (guess, id, openedCell, setOpenedCell) => {
      const { status, value } = guess.comparison.delegates;
      return (
        <ListCell
          id={id}
          color={STATUS_COLOR[status] ?? 'tile-wrong'}
          value={value}
          open={openedCell === id}
          onOpen={() => setOpenedCell(id)}
          onClose={() => setOpenedCell(null)}
        >
          {value?.length ?? 0}
        </ListCell>
      );
    },
  },
];

export default competColumns;