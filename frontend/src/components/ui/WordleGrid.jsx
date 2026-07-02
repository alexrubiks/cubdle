export default function WordleGrid({ columns, guesses }) {
  const gridTemplate = columns.map(col => col.width).join(' ');

  return (
    <div className="overflow-x-auto pb-10">
      <div
        className="grid gap-x-1 gap-y-1"
        style={{ gridTemplateColumns: gridTemplate }}
      >

        {/* ── HEADER ── */}
        {columns.map(col => (
          <div
            key={col.key}
            className="flex flex-col items-center justify-center"
          >
            {col.header}
          </div>
        ))}

        {/* ── ROWS ── */}
        {guesses.map((guess, i) => (
          columns.map(col => (
            <div
              key={`${i}-${col.key}`}
              className="flex items-center justify-center"
            >
              {col.renderCell(guess)}
            </div>
          ))
        ))}

      </div>
    </div>
  );
}

// Le contrat de columns que GuessCubeur et GuessCompet devront respecter :
//
// const columns = [
//   {
//     key: 'nom',           // string unique, sert de key React
//     width: '150px',       // largeur CSS de la colonne
//     header: <span className="font-body text-xs uppercase text-black/50">Cubeur</span>,
//     renderCell: (guess) => <NameCell>{guess.name}</NameCell>,
//   },
//   {
//     key: 'genre',
//     width: '56px',
//     header: <span title="Genre">⚥</span>,
//     renderCell: (guess) => (
//       <RubikCell color={compareValues(guess.comparison.gender.value, guess.comparison.gender.target)}>
//         {genderLabel(guess.comparison.gender.value)}
//       </RubikCell>
//     ),
//   },
//   // ...
// ];