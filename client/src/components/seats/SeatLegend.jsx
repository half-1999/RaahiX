const items = [
  { label: 'Available', className: 'bg-brand-soft border-brand' },
  { label: 'Selected', className: 'bg-accent border-accent' },
  { label: 'Held', className: 'bg-surface-2 border-line' },
  { label: 'Booked', className: 'bg-ink/10 border-line' },
];

export default function SeatLegend() {
  return (
    <ul className="flex flex-wrap gap-3 text-xs text-ink-muted">
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-1.5">
          <span className={`h-3.5 w-3.5 rounded border ${item.className}`} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
