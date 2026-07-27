import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

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

export function PeriodCell({ color = 'tile-none', direction = null, width = null, children }) {
  const directionText =
    direction === 'up'
      ? 'après'
      : direction === 'down'
      ? 'avant'
      : '';

  return (
    <div
      className="h-12 bg-black rounded-xl p-1 flex items-center justify-center shrink-0"
      style={{ width: width ?? '48px' }}
    >
      <div
        className={`w-full h-full rounded-lg ${
          COLOR_MAP[color] ?? 'bg-[#d4d4d4]'
        } flex flex-col items-center justify-center font-title font-bold leading-none tabular-nums`}
      >
        <div className="h-[10px] flex items-center justify-center text-[9px] font-bold text-black">
          {directionText}
        </div>

        <div className="text-xs">
          {children}
        </div>

        <div className="h-[10px]" />
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


export function ListCell({ color = 'tile-none', direction = null, width = null, value = null, children, open, onOpen, onClose }) {
  const [position, setPosition] = useState(null);

  function handleClick(e) {
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();

    setPosition({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX - 8,
    });

    onOpen();
  }

  useEffect(() => {
    if (!open) return;

    function close() {
      onClose();
    }

    document.addEventListener("click", close);

    return () => document.removeEventListener("click", close);
  }, [open, onClose]);

  return (
    <>
      <div
        className="cursor-pointer"
        onClick={handleClick}
      >
        <div
          className="h-12 bg-black rounded-xl p-1 flex items-center justify-center shrink-0"
          style={{ width: width ?? '48px' }}
        >
          <div className={`
            w-full h-full rounded-lg 
            ${COLOR_MAP[color] ?? 'bg-[#d4d4d4]'}
            flex flex-col items-center justify-center
            font-title font-bold text-xs leading-none tabular-nums
          `}>
            <div className="h-[10px] flex items-center justify-center">
              {direction === 'up' ? <ChevronUp /> : null}
            </div>

            {children}

            <div className="h-[10px] flex items-center justify-center">
              {direction === 'down' ? <ChevronDown /> : null}
            </div>
          </div>
        </div>
      </div>

      {open && position && value?.length > 0 &&
        createPortal(
          <div
            className="fixed z-[9999] rounded bg-gray-900 text-white px-3 py-2 text-xs shadow-lg whitespace-nowrap"
            style={{
              top: position.top,
              left: position.left,
              transform: "translateX(-100%)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {value.map((name) => (
              <div key={name}>
                {name}
              </div>
            ))}
          </div>,
          document.body
        )
      }
    </>
  );
}