export function HeaderCell({ icon, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={label ? 'text-base leading-none' : 'text-2xl leading-none'}>
        {icon}
      </span>
      {label && (
        <span className="font-body text-[9px] uppercase tracking-wide text-black/40">
          {label}
        </span>
      )}
    </div>
  );
}