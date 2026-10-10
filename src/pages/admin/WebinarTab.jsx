import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../services/readingApi.js';

const fmt = d => (d ? new Date(d).toLocaleString() : '\u2014');
const csvCell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;

// Sign-ups from the /tt-1 webinar page (popup and on-page form), newest first.
export default function WebinarTab() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try { setRows(await adminApi.webinarRegistrations(query)); setError(null); } catch (e) { setError(e); }
  }, [query]);
  useEffect(() => { load(); }, [load]);

  function exportCsv() {
    const head = ['Name', 'Email', 'Phone', 'Country', 'Source', 'Registered'];
    const lines = [head, ...rows.map(r => [r.name, r.email, r.phone, r.country, r.source, new Date(r.createdAt).toISOString()])];
    const blob = new Blob([lines.map(l => l.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `webinar-registrations-${new Date().toISOString().slice(0, 10)}.csv` });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <p className="rd-note">People who registered for the live masterclass on the /tt-1 page, through the popup or the on-page form. Newest first.</p>
      <form className="rd-filters" onSubmit={e => { e.preventDefault(); setQuery(search.trim()); }} role="search">
        <input className="rd-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or phone" aria-label="Search registrations" />
        <button className="rd-mini" type="submit">Search</button>
        {query && <button className="rd-mini" type="button" onClick={() => { setSearch(''); setQuery(''); }}>Clear</button>}
        <button className="rd-mini" type="button" onClick={load}>Refresh</button>
        <button className="rd-mini" type="button" onClick={exportCsv} disabled={!rows?.length}>Download CSV</button>
      </form>
      {error && <p className="rd-error" role="alert">{error.message}</p>}
      {!rows ? <p>Loading\u2026</p> : rows.length === 0 ? <p>No registrations{query ? ' match that search' : ' yet'}.</p> : (
        <>
          <p className="rd-note"><strong>{rows.length}</strong> registration{rows.length === 1 ? '' : 's'}{rows.length >= 1000 ? ' (showing the latest 1000)' : ''}</p>
          <div className="rd-table-wrap">
            <table className="rd-table">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Country</th><th>Source</th><th>Registered</th></tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td data-label="Name"><strong>{r.name}</strong></td>
                    <td data-label="Email">{r.email}</td>
                    <td data-label="Phone">{r.phone}</td>
                    <td data-label="Country">{r.country || '\u2014'}</td>
                    <td data-label="Source">{r.source === 'popup' ? 'Popup' : 'On-page form'}</td>
                    <td data-label="Registered">{fmt(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
