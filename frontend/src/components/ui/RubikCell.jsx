const COLOR_MAP = {
  'tile-correct': 'bg-cubdle-green',
  'tile-near':    'bg-cubdle-yellow',
  'tile-partial': 'bg-cubdle-orange',
  'tile-wrong':   'bg-cubdle-red',
  'tile-none':    'bg-[#d4d4d4]',
};

const ChevronUp = () => (
  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
    <path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChevronDown = () => (
  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function RubikCell({ color = 'tile-none', direction = null, width = null, children }) {
  return (
    <div
      className="h-12 bg-black rounded-xl p-1 flex items-center justify-center shrink-0"
      style={{ width: width ?? '48px' }}
    >
      <div className={`w-full h-full rounded-lg ${COLOR_MAP[color] ?? 'bg-[#d4d4d4]'} flex flex-col items-center justify-center font-title font-bold text-xs leading-none tabular-nums`}>
        <div className="h-[10px] flex items-center justify-center">
          {direction === 'up' ? <ChevronUp /> : null}
        </div>
        {children}
        <div className="h-[10px] flex items-center justify-center">
          {direction === 'down' ? <ChevronDown /> : null}
        </div>
      </div>
    </div>
  );
}

export function NameCell({ children, width = '160px' }) {
  return (
    <div
      className="h-12 bg-white border-4 border-black rounded-xl px-3 flex items-center min-w-0"
      style={{ width: width }}
    >
      <span className="font-body font-medium text-xs text-black truncate">
        {children}
      </span>
    </div>
  );
}