import Button from '../ui/Button';

export default function Pagination({ page = 1, pages = 1, total = 0, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
      <p className="text-slate">
        Page {page} of {pages}
        {total ? ` · ${total} records` : ''}
      </p>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
