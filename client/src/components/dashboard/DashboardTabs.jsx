export function DashboardTabs({ tabs, active, onChange, label = 'Dashboard sections' }) {
  return <div className="dashboard-tabs" role="tablist" aria-label={label}>
    {tabs.map((tab) => <button
      type="button"
      role="tab"
      aria-selected={active === tab.id}
      className={active === tab.id ? 'active' : ''}
      key={tab.id}
      onClick={() => onChange(tab.id)}
    >
      {tab.icon && <tab.icon size={17} />}
      <span>{tab.label}</span>
      {tab.count !== undefined && <small>{tab.count}</small>}
    </button>)}
  </div>;
}

export function Pagination({ page, pages, total, onChange, label = 'records' }) {
  const safePages = Math.max(1, pages || 1);
  return <div className="pagination" aria-label={`${label} pagination`}>
    <span>{total ?? 0} {label} · Page {page} of {safePages}</span>
    <div>
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1}>Previous</button>
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= safePages}>Next</button>
    </div>
  </div>;
}
