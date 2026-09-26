import { cn } from '../../utils/cn';

export default function Table({ columns = [], rows = [], empty, className, keyField = 'id' }) {
  if (!rows.length) {
    return empty || null;
  }

  return (
    <div className={cn('overflow-x-auto rounded-lg border border-line bg-white', className)}>
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-line bg-surface-2/60 text-ink-muted">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2.5 font-medium whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row[keyField] || row._id || idx}
              className="border-b border-line/70 last:border-0 hover:bg-surface/50"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2.5 align-middle text-ink">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
