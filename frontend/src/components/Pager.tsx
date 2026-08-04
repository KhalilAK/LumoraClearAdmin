import { useEffect, useState } from "react";

interface PagerProps {
  offset: number;
  limit: number;
  total: number;
  onOffsetChange: (offset: number) => void;
  disabled?: boolean;
}

// Prev/Next plus a "jump to page" input — like Supabase's table pagination,
// so going from page 3 to page 90 doesn't mean 87 clicks.
export function Pager({ offset, limit, total, onOffsetChange, disabled }: PagerProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(totalPages, Math.floor(offset / limit) + 1);
  const [pageInput, setPageInput] = useState(String(currentPage));

  // Keep the input in sync when the page changes some other way (Prev/Next,
  // or the parent resetting offset on a table/tab switch).
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  function goToPage(page: number) {
    const clamped = Math.min(totalPages, Math.max(1, page));
    onOffsetChange((clamped - 1) * limit);
  }

  function commitPageInput() {
    const parsed = parseInt(pageInput, 10);
    if (!Number.isNaN(parsed)) goToPage(parsed);
    else setPageInput(String(currentPage));
  }

  return (
    <div className="pager">
      <button className="btn-secondary" disabled={disabled || currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
        Prev
      </button>

      <form
        className="pager-page-form"
        onSubmit={(e) => {
          e.preventDefault();
          commitPageInput();
        }}
      >
        <span className="meta-text">Page</span>
        <input
          type="number"
          className="text-input pager-page-input"
          min={1}
          max={totalPages}
          value={pageInput}
          disabled={disabled}
          onChange={(e) => setPageInput(e.target.value)}
          onBlur={commitPageInput}
        />
        <span className="meta-text">of {totalPages}</span>
      </form>

      <button className="btn-secondary" disabled={disabled || currentPage >= totalPages} onClick={() => goToPage(currentPage + 1)}>
        Next
      </button>
    </div>
  );
}
