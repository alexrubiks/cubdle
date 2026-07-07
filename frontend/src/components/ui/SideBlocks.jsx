import { useMemo } from "react";

export default function SideBlocks({ position }) {
  const blockColor = "#0062ff";

  const positionStyles = {
    left: {
      left: 'clamp(8px, 1.2vw, 18px)',
    },
    right: {
      right: 'clamp(8px, 1.2vw, 18px)',
    },
  };

  const COLS = 3;
  const ROWS = 100;
  const SIZE = 30;
  const GAP = 6;

  const blocks = useMemo(() => {
    return Array.from({ length: ROWS }, (_, row) => {
      const line = [];

      line.push(true);

      const col2 = Math.random() < 0.75;
      line.push(col2);

      const col3 = col2 ? Math.random() < 0.35 : false;
      line.push(col3);

      return line;
    }).flat();
  }, []);

  const svgWidth = COLS * (SIZE + GAP);
  const svgHeight = ROWS * (SIZE + GAP);

  return (
    <div
      className="absolute top-0 pointer-events-none h-full overflow-hidden"
      style={{
        width: 'clamp(80px, 10vw, 140px)',
        height: '100%',
        ...positionStyles[position],
      }}
    >
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto"
        style={position === "right" ? { transform: "scaleX(-1)" } : {}}
      >
        {blocks.map((visible, index) => {
          if (!visible) return null;

          const col = index % COLS;
          const row = Math.floor(index / COLS);

          return (
            <rect
              key={index}
              x={col * (SIZE + GAP)}
              y={row * (SIZE + GAP) + GAP}
              width={SIZE}
              height={SIZE}
              fill={blockColor}
            />
          );
        })}
      </svg>
    </div>
  );
}