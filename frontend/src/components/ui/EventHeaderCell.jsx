export function EventHeaderCell({ slug, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <img
        src={`/icons/${slug}.svg`}
        alt={label}
        title={label}
        className="w-5 h-5 object-contain"
      />
      <span className="font-body text-[9px] uppercase tracking-wide text-black/40">
        {label}
      </span>
    </div>
  );
}