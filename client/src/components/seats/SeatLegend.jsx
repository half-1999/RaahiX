const items = [
  { label: 'Available', className: 'bg-indigo-soft border-brand/40' },
  { label: 'Selected', className: 'bg-coral border-coral' },
  { label: 'Occupied', className: 'bg-navy/10 border-line' },
  { label: 'Premium', className: 'bg-coral-soft border-coral/50' },
  { label: 'Window', className: 'bg-white border-brand', dot: true },
];

export default function SeatLegend() {
  return (
    <ul className="flex flex-wrap gap-3 text-xs text-slate">
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-1.5">
          <span className={`relative h-3.5 w-3.5 rounded border ${item.className}`}>
            {item.dot ? (
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-brand" />
            ) : null}
          </span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
