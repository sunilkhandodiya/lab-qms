// components/FilterBar.js — active-filter indicator with a clear action (server component)
import Link from 'next/link';

export default function FilterBar({ label, count, clearHref }) {
  return (
    <div className="filter-bar">
      <span className="filter-chip">
        <span className="filter-chip-dot" />
        <span>Showing: <strong>{label}</strong>{count != null ? ` · ${count}` : ''}</span>
        <Link href={clearHref} className="filter-chip-x" title="Clear filter" aria-label="Clear filter">×</Link>
      </span>
      <Link href={clearHref} className="btn btn-ghost btn-sm">Clear filter</Link>
    </div>
  );
}
