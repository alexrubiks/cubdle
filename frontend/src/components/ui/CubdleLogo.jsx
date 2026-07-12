export default function CubdleLogo({ className = "" }) {
  const COLORS = {
    'tile-correct': '#7BD45A',
    'tile-near': '#F2D24D',
    'tile-partial': '#F4924D',
    'tile-wrong': '#F0455A',
  };

  const GRID = [
    ['tile-correct', 'tile-near', 'tile-correct'],
    ['tile-partial', 'tile-correct', 'tile-near'],
    ['tile-near', 'tile-wrong', 'tile-wrong'],
  ];

  const cell = 16;
  const pad = 2;
  const radius = 4;

  return (
    <div
      className={`
        flex
        items-center
        gap-[0.08em]
        ${className}
      `}
    >
      <svg
        viewBox="0 0 48 48"
        className="h-[1em] w-[1em]"
        xmlns="http://www.w3.org/2000/svg"
      >
        {GRID.map((row, i) =>
          row.map((color, j) => {
            const x = j * cell;
            const y = i * cell;

            return (
              <g key={`${i}-${j}`}>
                <rect
                  x={x}
                  y={y}
                  width={cell}
                  height={cell}
                  rx={radius}
                  fill="#000"
                />
                <rect
                  x={x + pad}
                  y={y + pad}
                  width={cell - pad * 2}
                  height={cell - pad * 2}
                  rx={radius - pad}
                  fill={COLORS[color]}
                />
              </g>
            );
          })
        )}
      </svg>

      <span
        className="
          font-title
          font-extrabold
          leading-none
          text-white
          text-[0.5em]
        "
      >
        Cub<span className="text-cubdle-yellow">dle</span>
      </span>
    </div>
  );
}