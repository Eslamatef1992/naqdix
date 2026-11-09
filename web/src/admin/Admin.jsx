// Naqdi X admin panel (admin.naqdix.com): orders, serial codes, products and prices, demo requests, settings.
import { Fragment, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { get, post, patch, put, useApi, getToken, setToken, money, date, dateTime } from '../lib/api.js';
import { Icon } from '../components/Icon.jsx';

const cx = (...c) => c.filter(Boolean).join(' ');
const TONE = { paid: 'bg-paid-wash text-paid', pending: 'bg-warn-wash text-warn', canceled: 'bg-paper text-ink-3', issued: 'bg-sky text-signal', activated: 'bg-paid-wash text-paid', revoked: 'bg-[#fdecea] text-danger', new: 'bg-sky text-signal', contacted: 'bg-warn-wash text-warn', closed: 'bg-paper text-ink-3' };
const Badge = ({ s }) => <span className={cx('inline-flex px-2 py-0.5 rounded-md text-[12px] font-semibold capitalize', TONE[s] || 'bg-paper')}>{s}</span>;
const Panel = ({ title, actions, children, className = '' }) => (
  <section className={cx('bg-white border border-line rounded-xl', className)}>
    {title && <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line"><h2 className="font-bold">{title}</h2>{actions}</div>}
    {children}
  </section>
);
const Loading = () => <p className="p-8 text-ink-3">Loading…</p>;
function useRun() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const run = async (fn, ok) => { setBusy(true); setMsg(null); try { await fn(); if (ok) setMsg({ ok: true, text: ok }); } catch (e) { setMsg({ ok: false, text: e.message }); } setBusy(false); };
  const Note = () => msg && <p className={cx('text-[14px] mt-3', msg.ok ? 'text-paid' : 'text-danger')} role="status">{msg.text}</p>;
  return [run, busy, Note];
}
function Pager({ page, total, onChange }) {
  const pages = Math.ceil(total / 25);
  if (pages <= 1) return null;
  return <div className="flex justify-end gap-2 p-4 border-t border-line text-[14px]"><button className="btn btn-line !h-9" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button><span className="self-center text-ink-3">{page} / {pages}</span><button className="btn btn-line !h-9" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button></div>;
}
function Table({ cols, rows, onRow, empty = 'Nothing here yet.' }) {
  if (!rows.length) return <p className="p-8 text-center text-ink-3">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14px]">
        <thead><tr className="text-start text-ink-3 border-b border-line">{cols.map((c) => <th key={c[0]} className="text-start font-medium px-5 py-3 whitespace-nowrap">{c[0]}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} onClick={onRow ? () => onRow(r) : undefined} className={cx('border-b border-line last:border-0', onRow && 'cursor-pointer hover:bg-paper')}>{cols.map((c) => <td key={c[0]} className="px-5 py-3 align-top">{c[1](r)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Login() {
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setError('');
    try { const r = await post('/api/admin/login', f); setToken(r.token); nav('/admin'); } catch (err) { setError(err.message); }
  };
  return (
    <div className="min-h-screen grid place-items-center bg-paper p-5" dir="ltr">
      <form onSubmit={submit} className="w-full max-w-[380px] bg-white border border-line rounded-2xl p-8 grid gap-4">
        <img src="/brand/naqdix-logo-96.png" alt="Naqdi X" className="h-11 w-auto mx-auto" />
        <h1 className="text-center text-[18px] font-bold">Admin sign in</h1>
        <label className="grid gap-1.5 text-[14px] font-medium">Email<input className="field" type="email" autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></label>
        <label className="grid gap-1.5 text-[14px] font-medium">Password<input className="field" type="password" autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></label>
        {error && <p className="text-danger text-[14px]" role="alert">{error}</p>}
        <button className="btn btn-primary">Sign in</button>
      </form>
    </div>
  );
}

function Shell({ children }) {
  const nav = useNavigate();
  const items = [['/admin', 'home', 'Dashboard', true], ['/admin/orders', 'cart', 'Orders'], ['/admin/licenses', 'key', 'Serial codes'], ['/admin/products', 'tag', 'Products & prices'], ['/admin/leads', 'inbox', 'Demo requests'], ['/admin/settings', 'settings', 'Settings']];
  return (
    <div className="min-h-screen lg:flex bg-paper" dir="ltr">
      <aside className="lg:w-60 lg:min-h-screen bg-ink text-white flex lg:flex-col">
        <div className="p-5 hidden lg:block"><Link to="/admin" className="block bg-white rounded-lg p-2"><img src="/brand/naqdix-logo-96.png" alt="Naqdi X" className="h-8 w-auto mx-auto" /></Link></div>
        <nav className="flex lg:flex-col gap-1 p-2 lg:px-3 overflow-x-auto flex-1">
          {items.map(([to, icon, label, end]) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] whitespace-nowrap', isActive ? 'bg-white/12 text-white' : 'text-white/70 hover:text-white hover:bg-white/5')}>
              <Icon name={icon} size={18} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 hidden lg:grid gap-1 border-t border-white/10">
          <a href="/" target="_blank" rel="noopener" className="px-3 py-2 text-[13px] text-white/60 hover:text-white">Open website ↗</a>
          <button className="flex items-center gap-2 px-3 py-2 text-[13px] text-white/60 hover:text-white" onClick={() => { setToken(null); nav('/admin/login'); }}><Icon name="logout" size={16} />Sign out</button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-5 lg:p-8">{children}</main>
    </div>
  );
}

function Dashboard() {
  const { data } = useApi('/api/admin/stats');
  const nav = useNavigate();
  if (!data) return <Loading />;
  const cards = [['Revenue (30 days)', money(data.revenue30)], ['Paid orders (30 days)', data.orders30], ['Active plans', data.activePlans], ['Serials to activate', data.serialsWaiting], ['New demo requests', data.newLeads]];
  return (
    <>
      <h1 className="text-[24px] font-extrabold mb-6">Dashboard</h1>
      {(!data.setup.paypal || !data.setup.email) && (
        <div className="mb-6 rounded-xl bg-warn-wash text-warn p-4 text-[14px] grid gap-1">
          {!data.setup.paypal && <p>Online payment is off: PAYPAL_CLIENT_ID / PAYPAL_SECRET are not set on the server, so checkout shows "contact us" instead of pay buttons.</p>}
          {!data.setup.email && <p>Emails are off: add MAILGUN_API_KEY and MAILGUN_DOMAIN to send receipts and serial codes by email.</p>}
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {cards.map(([l, v]) => <div key={l} className="bg-white border border-line rounded-xl p-4"><p className="text-[13px] text-ink-3">{l}</p><p className="text-[24px] font-extrabold tnum mt-1">{v}</p></div>)}
      </div>
      {data.expiringSoon > 0 && <p className="mb-6 text-[14px] rounded-xl bg-sky p-3">{data.expiringSoon} plan{data.expiringSoon > 1 ? 's end' : ' ends'} in the next 14 days. Customers can renew from their order page.</p>}
      <Panel title="Latest orders" actions={<Link to="/admin/orders" className="text-[14px] text-signal font-semibold">All orders</Link>}>
        <Table rows={data.recent} onRow={(o) => nav(`/admin/orders/${o.id}`)} cols={[
          ['Order', (o) => <span className="font-medium">{o.number}</span>], ['Customer', (o) => o.customer_name], ['Product', (o) => `${o.product_name}${o.interval !== 'once' ? ` (${o.interval})` : ''}`],
          ['Amount', (o) => <span className="tnum">{money(o.amount, o.currency)}</span>], ['Status', (o) => <Badge s={o.status} />], ['Date', (o) => <span className="text-ink-3">{dateTime(o.created_at)}</span>],
        ]} />
      </Panel>
    </>
  );
}

function Orders() {
  const nav = useNavigate();
  const [p, setP] = useState(1); const [status, setStatus] = useState(''); const [kind, setKind] = useState(''); const [q, setQ] = useState('');
  const { data } = useApi(`/api/admin/orders?page=${p}&status=${status}&kind=${kind}&q=${encodeURIComponent(q)}`);
  return (
    <>
      <h1 className="text-[24px] font-extrabold mb-6">Orders</h1>
      <Panel>
        <div className="flex flex-wrap gap-2 p-4 border-b border-line">
          <input className="field !h-10 !w-64" placeholder="Search number, name, email, phone" value={q} onChange={(e) => { setQ(e.target.value); setP(1); }} />
          <select className="field !h-10 !w-40" value={status} onChange={(e) => { setStatus(e.target.value); setP(1); }}><option value="">All statuses</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="canceled">Canceled</option></select>
          <select className="field !h-10 !w-40" value={kind} onChange={(e) => { setKind(e.target.value); setP(1); }}><option value="">Plans and app</option><option value="plan">Plans</option><option value="app">Android app</option></select>
        </div>
        {!data ? <Loading /> : <>
          <Table rows={data.data} onRow={(o) => nav(`/admin/orders/${o.id}`)} empty="No orders yet." cols={[
            ['Order', (o) => <span className="font-medium">{o.number}</span>], ['Customer', (o) => <div><p>{o.customer_name}</p><p className="text-ink-3 text-[12px]">{o.company || o.email}</p></div>],
            ['Product', (o) => `${o.product_name}${o.interval !== 'once' ? ` (${o.interval})` : ''}`], ['Amount', (o) => <span className="tnum">{money(o.amount, o.currency)}</span>],
            ['Status', (o) => <Badge s={o.status} />], ['Plan ends', (o) => (o.period_end ? date(o.period_end) : '—')], ['Created', (o) => <span className="text-ink-3">{dateTime(o.created_at)}</span>],
          ]} />
          <Pager page={p} total={data.total} onChange={setP} />
        </>}
      </Panel>
    </>
  );
}

function OrderDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data, reload } = useApi(`/api/admin/orders/${id}`);
  const [run, busy, Note] = useRun();
  const [ref, setRef] = useState('');
  if (!data) return <Loading />;
  const { order: o, license: l, history, link } = data;
  return (
    <>
      <Link to="/admin/orders" className="text-[14px] text-ink-3 hover:text-ink">← Orders</Link>
      <div className="flex flex-wrap items-center gap-3 mt-2 mb-6"><h1 className="text-[24px] font-extrabold">{o.number}</h1><Badge s={o.status} /></div>
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
        <div className="grid gap-6">
          <Panel title="Order">
            <dl className="grid grid-cols-[150px_1fr] gap-y-2.5 p-5 text-[14px]">
              {[['Product', `${o.product_name}${o.interval !== 'once' ? ` (${o.interval})` : ' (one payment)'}`], ['Amount', money(o.amount, o.currency)], ['Paid', o.paid_at ? `${dateTime(o.paid_at)} · ${o.provider}${o.payment_ref ? ` · ${o.payment_ref}` : ''}` : '—'],
                ['Plan period', o.period_start ? `${date(o.period_start)} → ${date(o.period_end)}` : '—'], ['Customer page', <a key="l" href={link} target="_blank" rel="noopener" className="text-signal break-all">{link}</a>], ['Created', dateTime(o.created_at)]]
                .map(([k, v]) => <Fragment key={k}><dt className="text-ink-3">{k}</dt><dd>{v}</dd></Fragment>)}
            </dl>
          </Panel>
          {o.kind === 'app' && (
            <Panel title="Serial code">
              <div className="p-5">
                {l ? <>
                  <p className="text-[24px] font-extrabold tracking-[0.1em]" style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{l.serial}</p>
                  <p className="mt-2"><Badge s={l.status} />{l.device && <span className="ms-2 text-[14px] text-ink-3">{l.device}</span>}</p>
                  <Link to={`/admin/licenses?q=${l.serial}`} className="inline-block mt-3 text-[14px] text-signal font-semibold">Manage serial</Link>
                </> : <p className="text-ink-3 text-[14px]">The serial is issued automatically when the order is paid.</p>}
              </div>
            </Panel>
          )}
          {history.length > 0 && (
            <Panel title="Other orders from this customer">
              <Table rows={history} onRow={(h) => nav(`/admin/orders/${h.id}`)} cols={[['Order', (h) => h.number], ['Product', (h) => h.product_name], ['Amount', (h) => money(h.amount, h.currency)], ['Status', (h) => <Badge s={h.status} />]]} />
            </Panel>
          )}
        </div>
        <div className="grid gap-6">
          <Panel title="Customer">
            <dl className="p-5 grid gap-2 text-[14px]">
              <p className="font-semibold text-[16px]">{o.customer_name}</p>{o.company && <p className="text-ink-2">{o.company}</p>}
              <a href={`mailto:${o.email}`} className="text-signal">{o.email}</a>
              <a href={`https://wa.me/${o.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-[#168f47]"><Icon name="wa" size={16} />{o.phone}</a>
              <p className="text-ink-3">Language: {o.lang === 'ar' ? 'Arabic' : 'English'}</p>
            </dl>
          </Panel>
          <Panel title="Actions">
            <div className="p-5 grid gap-3">
              {o.status === 'pending' && <>
                <p className="text-[14px] text-ink-2">Got paid another way (bank transfer, KNET link, cash)? Mark it paid{o.kind === 'app' ? ' and the serial code is issued' : ''}.</p>
                <input className="field" placeholder="Payment reference (optional)" value={ref} onChange={(e) => setRef(e.target.value)} />
                <button className="btn btn-primary" disabled={busy} onClick={() => run(async () => { await post(`/api/admin/orders/${o.id}/mark-paid`, { ref }); reload(); }, 'Marked as paid')}>Mark as paid</button>
                <button className="btn btn-line" disabled={busy} onClick={() => run(async () => { await post(`/api/admin/orders/${o.id}/cancel`); reload(); }, 'Order canceled')}>Cancel order</button>
              </>}
              {o.status === 'paid' && <button className="btn btn-line" disabled={busy} onClick={() => run(() => post(`/api/admin/orders/${o.id}/resend`), 'Receipt sent again')}><Icon name="mail" size={18} />Email the receipt again</button>}
              <Note />
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Licenses() {
  const params = new URLSearchParams(window.location.search);
  const [p, setP] = useState(1); const [status, setStatus] = useState(''); const [q, setQ] = useState(params.get('q') || '');
  const { data, reload } = useApi(`/api/admin/licenses?page=${p}&status=${status}&q=${encodeURIComponent(q)}`);
  const [edit, setEdit] = useState(null);
  const [issue, setIssue] = useState(null);
  const [run, busy, Note] = useRun();
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-[24px] font-extrabold">Serial codes</h1>
        <button className="btn btn-primary !h-10" onClick={() => setIssue({ name: '', phone: '', email: '', notes: '' })}><Icon name="plus" size={18} />Issue a serial</button>
      </div>
      <p className="text-[14px] text-ink-2 mb-4 max-w-[80ch]">Customers get a serial automatically after paying for the Android app. When they send it to you, set it to <b>Activated</b> and note the device or build.</p>
      <Panel>
        <div className="flex flex-wrap gap-2 p-4 border-b border-line">
          <input className="field !h-10 !w-64" placeholder="Search serial, name, phone" value={q} onChange={(e) => { setQ(e.target.value); setP(1); }} />
          <select className="field !h-10 !w-44" value={status} onChange={(e) => { setStatus(e.target.value); setP(1); }}><option value="">All</option><option value="issued">Waiting activation</option><option value="activated">Activated</option><option value="revoked">Revoked</option></select>
        </div>
        {!data ? <Loading /> : <>
          <Table rows={data.data} onRow={(l) => setEdit({ ...l })} empty="No serial codes yet." cols={[
            ['Serial', (l) => <span className="font-semibold tracking-wider" style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{l.serial}</span>],
            ['Customer', (l) => <div><p>{l.customer_name || '—'}</p><p className="text-ink-3 text-[12px]">{l.phone || l.email || ''}</p></div>],
            ['Order', (l) => l.order_number || <span className="text-ink-3">Issued by hand</span>], ['Status', (l) => <Badge s={l.status} />],
            ['Device', (l) => <span className="text-ink-2">{l.device || '—'}</span>], ['Issued', (l) => <span className="text-ink-3">{date(l.created_at)}</span>],
          ]} />
          <Pager page={p} total={data.total} onChange={setP} />
        </>}
      </Panel>
      {edit && (
        <Modal title={edit.serial} onClose={() => setEdit(null)}>
          <label className="grid gap-1.5 text-[14px] font-medium">Status
            <select className="field" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}><option value="issued">Waiting activation</option><option value="activated">Activated</option><option value="revoked">Revoked (no longer valid)</option></select>
          </label>
          <label className="grid gap-1.5 text-[14px] font-medium">Device / build<input className="field" placeholder="e.g. Sunmi V2s · build 1.4" value={edit.device || ''} onChange={(e) => setEdit({ ...edit, device: e.target.value })} /></label>
          <label className="grid gap-1.5 text-[14px] font-medium">Notes<textarea className="field" rows={3} value={edit.notes || ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></label>
          <button className="btn btn-primary" disabled={busy} onClick={() => run(async () => { await patch(`/api/admin/licenses/${edit.id}`, { status: edit.status, device: edit.device, notes: edit.notes }); setEdit(null); reload(); })}>Save</button>
          <Note />
        </Modal>
      )}
      {issue && (
        <Modal title="Issue a serial by hand" onClose={() => setIssue(null)}>
          <p className="text-[14px] text-ink-2">For a free copy, a partner, or a replacement. No payment is recorded.</p>
          {[['name', 'Customer name'], ['phone', 'Phone'], ['email', 'Email']].map(([k, l]) => <label key={k} className="grid gap-1.5 text-[14px] font-medium">{l}<input className="field" value={issue[k]} onChange={(e) => setIssue({ ...issue, [k]: e.target.value })} /></label>)}
          <label className="grid gap-1.5 text-[14px] font-medium">Notes<textarea className="field" rows={2} value={issue.notes} onChange={(e) => setIssue({ ...issue, notes: e.target.value })} /></label>
          {issue.serial ? <p className="rounded-xl bg-sky p-4 text-center text-[22px] font-extrabold tracking-wider" style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{issue.serial}</p>
            : <button className="btn btn-primary" disabled={busy} onClick={() => run(async () => { const l = await post('/api/admin/licenses', issue); setIssue({ ...issue, serial: l.serial }); reload(); })}>Create serial</button>}
          <Note />
        </Modal>
      )}
    </>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/40 grid place-items-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[520px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl" role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-line"><h2 className="font-bold">{title}</h2><button className="p-1 rounded hover:bg-paper" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
        <div className="p-6 grid gap-4">{children}</div>
      </div>
    </div>
  );
}

function Products() {
  const { data, reload } = useApi('/api/admin/products');
  const [f, setF] = useState(null);
  const [run, busy, Note] = useRun();
  const open = (p) => setF({ ...p, featuresEn: (p.features?.en || []).join('\n'), featuresAr: (p.features?.ar || []).join('\n') });
  const save = () => run(async () => {
    const body = { ...f, features: { en: f.featuresEn, ar: f.featuresAr } };
    if (f.id) await patch(`/api/admin/products/${f.id}`, body); else await post('/api/admin/products', body);
    setF(null); reload();
  });
  if (!data) return <Loading />;
  const num = (k, label) => <label className="grid gap-1.5 text-[14px] font-medium">{label}<input className="field" type="number" step="0.001" min="0" value={f[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>;
  const txt = (k, label, dir) => <label className="grid gap-1.5 text-[14px] font-medium">{label}<input className="field" dir={dir} value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-[24px] font-extrabold">Products & prices</h1>
        <button className="btn btn-primary !h-10" onClick={() => open({ kind: 'plan', name: '', currency: 'KWD', is_active: true, features: { en: [], ar: [] }, sort: 5 })}><Icon name="plus" size={18} />New plan</button>
      </div>
      <Panel>
        <Table rows={data.data} onRow={open} cols={[
          ['Product', (p) => <div><p className="font-semibold">{p.name}</p><p className="text-ink-3 text-[12px]" dir="rtl">{p.name_ar}</p></div>],
          ['Type', (p) => (p.kind === 'app' ? 'Android app (one payment)' : 'Plan')],
          ['Price', (p) => (p.kind === 'app' ? money(p.price_once, p.currency) : `${money(p.price_monthly, p.currency)} / month · ${money(p.price_yearly, p.currency)} / year`)],
          ['On website', (p) => (p.is_active ? <Badge s="activated" /> : <span className="text-ink-3 text-[13px]">Hidden</span>)],
        ]} />
      </Panel>
      {f && (
        <Modal title={f.id ? `Edit ${f.name}` : 'New plan'} onClose={() => setF(null)}>
          <div className="grid grid-cols-2 gap-3">{txt('name', 'Name (English)')}{txt('name_ar', 'Name (Arabic)', 'rtl')}{txt('tagline', 'Short line (English)')}{txt('tagline_ar', 'Short line (Arabic)', 'rtl')}</div>
          {f.kind === 'app' ? num('price_once', `Price, one payment (${f.currency})`) : <div className="grid grid-cols-2 gap-3">{num('price_monthly', `Monthly (${f.currency})`)}{num('price_yearly', `Yearly (${f.currency})`)}</div>}
          <label className="grid gap-1.5 text-[14px] font-medium">Features (English, one per line)<textarea className="field" rows={5} value={f.featuresEn} onChange={(e) => setF({ ...f, featuresEn: e.target.value })} /></label>
          <label className="grid gap-1.5 text-[14px] font-medium">Features (Arabic, one per line)<textarea className="field" rows={5} dir="rtl" value={f.featuresAr} onChange={(e) => setF({ ...f, featuresAr: e.target.value })} /></label>
          <div className="flex flex-wrap gap-5 text-[14px]">
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} />Show on website</label>
            {f.kind === 'plan' && <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!f.highlighted} onChange={(e) => setF({ ...f, highlighted: e.target.checked })} />Mark as most popular</label>}
            <label className="inline-flex items-center gap-2">Order <input className="field !h-9 !w-20" type="number" value={f.sort ?? 0} onChange={(e) => setF({ ...f, sort: e.target.value })} /></label>
          </div>
          <button className="btn btn-primary" disabled={busy} onClick={save}>Save</button>
          <Note />
        </Modal>
      )}
    </>
  );
}

function Leads() {
  const [p, setP] = useState(1); const [status, setStatus] = useState('');
  const { data, reload } = useApi(`/api/admin/leads?page=${p}&status=${status}`);
  return (
    <>
      <h1 className="text-[24px] font-extrabold mb-6">Demo requests</h1>
      <Panel>
        <div className="p-4 border-b border-line"><select className="field !h-10 !w-44" value={status} onChange={(e) => { setStatus(e.target.value); setP(1); }}><option value="">All</option><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select></div>
        {!data ? <Loading /> : <>
          <Table rows={data.data} empty="No demo requests yet." cols={[
            ['Name', (l) => <div><p className="font-medium">{l.name}</p><p className="text-ink-3 text-[12px]">{l.company}</p></div>],
            ['Contact', (l) => <div><a className="inline-flex items-center gap-1 text-[#168f47]" target="_blank" rel="noopener" href={`https://wa.me/${l.phone.replace(/\D/g, '')}`}><Icon name="wa" size={14} />{l.phone}</a>{l.email && <p className="text-[12px]"><a href={`mailto:${l.email}`} className="text-signal">{l.email}</a></p>}</div>],
            ['Interested in', (l) => l.interest || '—'], ['Message', (l) => <p className="max-w-[40ch] text-ink-2 whitespace-pre-line">{l.message || '—'}</p>],
            ['Status', (l) => <select className="field !h-9 !w-32 text-[13px]" value={l.status} onChange={async (e) => { await patch(`/api/admin/leads/${l.id}`, { status: e.target.value }); reload(); }}><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select>],
            ['Date', (l) => <span className="text-ink-3">{dateTime(l.created_at)}</span>],
          ]} />
          <Pager page={p} total={data.total} onChange={setP} />
        </>}
      </Panel>
    </>
  );
}

function Settings() {
  const { data } = useApi('/api/admin/settings');
  const [f, setF] = useState(null);
  const [pw, setPw] = useState({ current: '', password: '' });
  const [run, busy, Note] = useRun();
  const [runPw, busyPw, NotePw] = useRun();
  const v = f || data;
  if (!v) return <Loading />;
  return (
    <>
      <h1 className="text-[24px] font-extrabold mb-6">Settings</h1>
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <Panel title="Contact details on the website">
          <div className="p-5 grid gap-4">
            <label className="grid gap-1.5 text-[14px] font-medium">WhatsApp number (with country code)<input className="field" dir="ltr" placeholder="96550000000" value={v.whatsapp} onChange={(e) => setF({ ...v, whatsapp: e.target.value })} /><span className="text-[12px] text-ink-3 font-normal">Used for the WhatsApp button and for customers sending you their serial code.</span></label>
            <label className="grid gap-1.5 text-[14px] font-medium">Email<input className="field" dir="ltr" value={v.email} onChange={(e) => setF({ ...v, email: e.target.value })} /></label>
            <label className="grid gap-1.5 text-[14px] font-medium">Address<input className="field" value={v.address} onChange={(e) => setF({ ...v, address: e.target.value })} /></label>
            <button className="btn btn-primary" disabled={busy} onClick={() => run(() => put('/api/admin/settings', v), 'Saved')}>Save</button>
            <Note />
          </div>
        </Panel>
        <Panel title="Change your password">
          <form className="p-5 grid gap-4" onSubmit={(e) => { e.preventDefault(); runPw(async () => { await patch('/api/admin/me/password', pw); setPw({ current: '', password: '' }); }, 'Password changed'); }}>
            <label className="grid gap-1.5 text-[14px] font-medium">Current password<input className="field" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></label>
            <label className="grid gap-1.5 text-[14px] font-medium">New password (8+ characters)<input className="field" type="password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} /></label>
            <button className="btn btn-ink" disabled={busyPw}>Change password</button>
            <NotePw />
          </form>
        </Panel>
      </div>
    </>
  );
}

export default function Admin() {
  if (!getToken()) {
    return <Routes><Route path="login" element={<Login />} /><Route path="*" element={<Navigate to="/admin/login" replace />} /></Routes>;
  }
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route path="*" element={
        <Shell>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="licenses" element={<Licenses />} />
            <Route path="products" element={<Products />} />
            <Route path="leads" element={<Leads />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </Shell>
      } />
    </Routes>
  );
}
