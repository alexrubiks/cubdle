export default function CornerBlocks({ position }) {
  const positionStyles = {
    'top-left': { top: 'clamp(8px, 1.2vw, 18px)', left: 'clamp(8px, 1.2vw, 18px)' },
    'bottom-right': {
      bottom: 'clamp(8px, 1.2vw, 18px)',
      right: 'clamp(8px, 1.2vw, 18px)',
      transform: 'rotate(180deg)',
    },
  };
  const blockColor = "#0062ff"

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        width: 'clamp(140px, 18vw, 240px)',
        ...positionStyles[position],
      }}
    >
      <svg viewBox="0 0 200 200" className="w-full h-auto">
        <rect x="0" y="0" width="55" height="55" fill={blockColor} />
        <rect x="65" y="0" width="55" height="55" fill={blockColor} />
        <rect x="130" y="0" width="55" height="55" fill={blockColor} />
        <rect x="0" y="65" width="55" height="55" fill={blockColor} />
        <rect x="65" y="65" width="55" height="55" fill={blockColor} />
        <rect x="0" y="130" width="55" height="55" fill={blockColor} />
      </svg>
    </div>
  );
}