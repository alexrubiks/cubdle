const COLOR_MAP = {
  'tile-correct': 'bg-cubdle-green',
  'tile-near':    'bg-cubdle-yellow',
  'tile-partial': 'bg-cubdle-orange',
  'tile-wrong':   'bg-cubdle-red',
  'tile-none':    'bg-[#d4d4d4]',
};

export function RubikCell({ color = 'tile-none', children }) {
  return (
    <div className="w-12 h-12 bg-black rounded-xl p-1 flex items-center justify-center shrink-0">
      <div className={`w-full h-full rounded-lg ${COLOR_MAP[color] ?? 'bg-[#d4d4d4]'} flex items-center justify-center font-title font-bold text-xs leading-none tabular-nums`}>
        {children}
      </div>
    </div>
  );
}

export function NameCell({ children }) {
  return (
    <div className="h-12 min-w-[160px] bg-white border-4 border-black rounded-xl px-3 flex items-center min-w-0">
      <span className="font-body font-medium text-xs text-black truncate">
        {children}
      </span>
    </div>
  );
}