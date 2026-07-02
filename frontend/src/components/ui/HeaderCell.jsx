export function HeaderCell({ icon, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-base leading-none">{icon}</span>
      <span className="font-body text-[9px] uppercase tracking-wide text-black/40">
        {label}
      </span>
    </div>
  );
}