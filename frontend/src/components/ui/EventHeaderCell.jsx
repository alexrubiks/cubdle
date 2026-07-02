export function EventHeaderCell({ slug, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <img
        src={`/events-icons/${slug}.svg`}
        alt={label}
        title={label}
        className="w-8 h-8 object-contain"
      />
    </div>
  );
}