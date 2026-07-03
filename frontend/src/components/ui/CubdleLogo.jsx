export default function CubdleLogo({ size = 'md' }) {
  const scale = size === 'xl' ? 2.5 : size === 'lg' ? 1.5 : 1;
  const cell  = 16 * scale;
  const r     = 4 * scale;  // border-radius

  const COLORS = {
    'tile-correct': '#7BD45A',
    'tile-near':    '#F2D24D',
    'tile-partial': '#F4924D',
    'tile-wrong':   '#F0455A',
  };

  const GRID = [
    ['tile-correct', 'tile-near',    'tile-correct'],
    ['tile-partial', 'tile-correct', 'tile-near'   ],
    ['tile-near',    'tile-wrong',   'tile-wrong'  ],
  ];

  const gridW = 3 * cell;
  const gridH = 3 * cell;
  const pad   = 2 * scale; // épaisseur du "bord noir"

  return (
    <div className="flex items-center gap-3">
      <svg
        width={gridW}
        height={gridH}
        viewBox={`0 0 ${gridW} ${gridH}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {GRID.map((row, i) =>
          row.map((color, j) => {
            const x = j * (cell);
            const y = i * (cell);
            return (
              <g key={`${i}-${j}`}>
                {/* fond noir = bord */}
                <rect x={x} y={y} width={cell} height={cell} rx={r} fill="#000" />
                {/* sticker coloré */}
                <rect
                  x={x + pad} y={y + pad}
                  width={cell - pad * 2} height={cell - pad * 2}
                  rx={r - pad}
                  fill={COLORS[color]}
                />
              </g>
            );
          })
        )}
      </svg>

      <span
        className={`font-title font-extrabold leading-none text-white ${
          size === 'xl' ? 'text-6xl' :
          size === 'lg' ? 'text-4xl' : 'text-2xl'
        }`}
      >
        Cub<span className="text-cubdle-yellow">dle</span>
      </span>
    </div>
  );
}