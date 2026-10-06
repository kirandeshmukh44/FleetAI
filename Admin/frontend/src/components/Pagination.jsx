import { formatNumber } from '../utils/format';

/** Page controls driven by the backend pagination envelope. */
const Pagination = ({ meta, onPageChange }) => {
  if (!meta || !meta.total) return null;
  const { page, pages, total, per_page: perPage } = meta;
  const first = (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, total);

  return (
    <div className="pagination">
      <span>
        Showing <strong>{formatNumber(first)}</strong>–<strong>{formatNumber(last)}</strong> of{' '}
        <strong>{formatNumber(total)}</strong>
      </span>
      <div className="pagination-controls">
        <button type="button" className="btn btn-sm" disabled={!meta.has_prev} onClick={() => onPageChange(page - 1)}>
          Previous
        </button>
        <span className="nowrap">
          Page {page} of {pages || 1}
        </span>
        <button type="button" className="btn btn-sm" disabled={!meta.has_next} onClick={() => onPageChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;
