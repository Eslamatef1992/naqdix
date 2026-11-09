import { createContext, useContext, useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { get, post, money } from '../lib/api.js';
import { useLang, pick } from '../lib/i18n.jsx';
import { fill } from './content.js';
import { Icon } from '../components/Icon.jsx';

// ---------- catalogue (products, prices, contact) loaded once ----------
const CatalogCtx = createContext(null);
export function CatalogProvider({ children }) {
  const [data, setData] = useState(null);
  useEffect(() => { get('/api/catalog').then(setData).catch(() => setData({ products: [], paymentMethods: [], contact: {}, charge: {} })); }, []);
  return <CatalogCtx.Provider value={data}>{children}</CatalogCtx.Provider>;
}
export const useCatalog = () => useContext(CatalogCtx);

export const cx = (...c) => c.filter(Boolean).join(' ');
const waLink = (num, text) => `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

// ---------- header / footer ----------
export function Header() {
  const { t, lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const links = [['/#solutions', t.nav.modules], ['/features', t.nav.features], ['/android', t.nav.android], ['/#pricing', t.nav.pricing], ['/#faq', t.nav.faq]];
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-line">
      <div className="wrap h-[68px] flex items-center gap-6">
        <Link to="/" aria-label="Naqdi X" className="shrink-0"><img src="/brand/naqdix-logo-96.png" alt="Naqdi X" className="h-10 w-auto" /></Link>
        <nav className="hidden md:flex items-center gap-1 text-[15px]" aria-label="Main">
          {links.map(([to, label]) => <a key={to} href={to} className="px-3 py-2 rounded-lg text-ink-2 hover:text-ink hover:bg-paper">{label}</a>)}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <button type="button" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="px-3 py-2 rounded-lg text-[14px] text-ink-2 hover:bg-paper" lang={lang === 'ar' ? 'en' : 'ar'}>{t.nav.other}</button>
          <a href="/#demo" className="btn btn-primary hidden sm:inline-flex !h-10 !px-4 text-[14px]">{t.nav.demo}</a>
          <button type="button" className="md:hidden p-2 rounded-lg hover:bg-paper" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name={open ? 'x' : 'menu'} /></button>
        </div>
      </div>
      {open && (
        <nav className="md:hidden border-t border-line bg-white wrap py-3 grid gap-1" aria-label="Mobile">
          {links.map(([to, label]) => <a key={to} href={to} onClick={() => setOpen(false)} className="px-3 py-3 rounded-lg hover:bg-paper">{label}</a>)}
          <a href="/#demo" onClick={() => setOpen(false)} className="btn btn-primary mt-2">{t.nav.demo}</a>
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  const { t } = useLang();
  const cat = useCatalog();
  const c = cat?.contact || {};
  return (
    <footer className="bg-white border-t border-line mt-0">
      <div className="wrap py-14 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <img src="/brand/naqdix-logo-96.png" alt="Naqdi X" className="h-11 w-auto" />
          <p className="mt-4 text-ink-2 max-w-[42ch] leading-relaxed">{t.footer.blurb}</p>
        </div>
        <div>
          <p className="font-semibold mb-3">{t.footer.product}</p>
          <ul className="grid gap-2 text-ink-2">
            <li><a href="/#solutions" className="hover:text-ink">{t.nav.modules}</a></li>
            <li><Link to="/features" className="hover:text-ink">{t.nav.features}</Link></li>
            <li><Link to="/android" className="hover:text-ink">{t.nav.android}</Link></li>
            <li><a href="/#pricing" className="hover:text-ink">{t.nav.pricing}</a></li>
            <li><a href="/#faq" className="hover:text-ink">{t.nav.faq}</a></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold mb-3">{t.footer.contact}</p>
          <ul className="grid gap-2 text-ink-2">
            {c.whatsapp && <li><a href={waLink(c.whatsapp)} target="_blank" rel="noopener" className="inline-flex items-center gap-2 hover:text-ink"><Icon name="wa" size={18} className="text-[#1fa855]" /><span dir="ltr">+{c.whatsapp}</span></a></li>}
            {c.email && <li><a href={`mailto:${c.email}`} className="inline-flex items-center gap-2 hover:text-ink"><Icon name="mail" size={18} />{c.email}</a></li>}
            {c.address && <li>{c.address}</li>}
            <li><a href="/#demo" className="text-signal font-semibold hover:underline">{t.nav.demo}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line"><p className="wrap py-5 text-[13px] text-ink-3">© {new Date().getFullYear()} Naqdi X. {t.footer.rights}</p></div>
    </footer>
  );
}

export function WhatsAppButton() {
  const { t } = useLang();
  const num = useCatalog()?.contact?.whatsapp;
  if (!num) return null;
  return (
    <a href={waLink(num)} target="_blank" rel="noopener" aria-label={t.footer.whatsapp}
      className="fixed bottom-5 end-5 z-40 h-14 w-14 rounded-full bg-[#1fa855] text-white grid place-items-center shadow-lg hover:scale-105 transition-transform">
      <Icon name="wa" size={30} />
    </a>
  );
}

// ---------- the printing receipt (hero) ----------
export function Receipt() {
  const { t, ar } = useLang();
  const r = t.receipt;
  const total = r.items.reduce((a, [, q, p]) => a + q * p, 0);
  const amt = (n) => <span dir="ltr" className="tnum">{n.toFixed(3)}</span>;
  return (
    <div className="relative mx-auto w-full max-w-[360px]" aria-label="Sample receipt" role="img">
      {/* the printer slot */}
      <div className="relative z-10 h-6 rounded-t-2xl bg-ink mx-2 shadow-[0_6px_0_#071536]" />
      <div className="receipt relative -mt-1 mx-5 bg-white px-6 pt-6 pb-8 shadow-[0_20px_40px_-20px_rgba(11,31,75,.45)]"
        style={{ fontFamily: ar ? 'var(--font-ar)' : '"Archivo", system-ui', fontStretch: '88%' }}>
        <div className="ln text-center" style={{ animationDelay: '.4s' }}>
          <p className="font-bold text-[17px]">{r.store}</p>
          <p className="text-[12px] text-ink-3">{r.branch}</p>
        </div>
        <div className="my-4 border-t border-dashed border-ink-3/50" />
        <ul className="grid gap-2 text-[14px]">
          {r.items.map(([name, q, p], i) => (
            <li key={name} className="ln flex justify-between gap-3" style={{ animationDelay: `${0.8 + i * 0.35}s` }}>
              <span>{name}{q > 1 && <span className="text-ink-3"> <bdi dir="ltr">×{q}</bdi></span>}</span>{amt(q * p)}
            </li>
          ))}
        </ul>
        <div className="my-4 border-t border-dashed border-ink-3/50" />
        <div className="ln flex justify-between items-baseline" style={{ animationDelay: '2.3s' }}>
          <span className="font-semibold">{r.total}</span>
          <span className="text-[24px] font-extrabold" dir="ltr">{total.toFixed(3)} <span className="text-[13px] font-semibold">KWD</span></span>
        </div>
        <p className="ln mt-4 text-center font-bold tracking-wide text-paid border-2 border-paid rounded-md py-1 rotate-[-2deg]" style={{ animationDelay: '2.7s' }}>{r.paid}</p>
        <p className="ln mt-4 text-center text-[12px] text-ink-3" style={{ animationDelay: '2.9s' }}>{r.thanks}</p>
        {/* torn edge */}
        <svg className="absolute -bottom-2 inset-x-0 w-full h-3 text-white" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0h100v2L95 6l-5-4-5 4-5-4-5 4-5-4-5 4-5-4-5 4-5-4-5 4-5-4-5 4-5-4-5 4-5-4-5 4-5-4-5 4L0 2z" fill="currentColor" /></svg>
      </div>
    </div>
  );
}

// ---------- pricing cards ----------
export function PricingCards({ compact = false }) {
  const { t, lang } = useLang();
  const cat = useCatalog();
  const nav = useNavigate();
  const plans = (cat?.products || []).filter((p) => p.kind === 'plan');
  const hasMonthly = plans.some((p) => p.price_monthly != null);
  const hasYearly = plans.some((p) => p.price_yearly != null);
  const [chosen, setInterval] = useState('yearly');
  const interval = !hasMonthly ? 'yearly' : !hasYearly ? 'monthly' : chosen;
  return (
    <div>
      {hasMonthly && hasYearly && <div className="flex justify-center mb-8">
        <div className="inline-flex p-1 rounded-xl bg-white border border-line" role="radiogroup" aria-label={t.pricing.title}>
          {['monthly', 'yearly'].map((k) => (
            <button key={k} type="button" role="radio" aria-checked={interval === k} onClick={() => setInterval(k)}
              className={cx('h-10 px-5 rounded-lg text-[15px] font-semibold', interval === k ? 'bg-ink text-white' : 'text-ink-2')}>
              {t.pricing[k]}{k === 'yearly' && <span className={cx('ms-2 text-[12px] font-semibold', interval === k ? 'text-[#9cc0ff]' : 'text-signal')}>{t.pricing.save}</span>}
            </button>
          ))}
        </div>
      </div>}
      {!cat ? <div className="h-80" /> : (
        <div className={cx('grid gap-5 mx-auto', plans.length >= 3 ? 'lg:grid-cols-3 max-w-[1100px]' : 'md:grid-cols-2 max-w-[860px]')}>
          {plans.map((p) => {
            const per = interval === 'yearly' && p.price_yearly != null ? 'yearly' : p.price_monthly != null ? 'monthly' : 'yearly';
            const price = per === 'yearly' ? p.price_yearly : p.price_monthly;
            const feats = (lang === 'ar' && p.features.ar?.length ? p.features.ar : p.features.en) || [];
            return (
              <div key={p.id} className={cx('relative rounded-2xl p-7 flex flex-col', p.highlighted ? 'bg-ink text-white ring-1 ring-ink' : 'bg-white border border-line')}>
                {p.highlighted && <span className="absolute -top-3 start-7 bg-signal text-white text-[12px] font-semibold px-3 py-1 rounded-full">{t.pricing.popular}</span>}
                <h3 className="text-[22px] font-extrabold" style={{ fontStretch: '108%' }}>{pick(p, 'name', lang)}</h3>
                <p className={cx('text-[14px] mt-1', p.highlighted ? 'text-white/70' : 'text-ink-3')}>{pick(p, 'tagline', lang)}</p>
                <p className="mt-6 flex items-baseline gap-2">
                  <span className="text-[40px] font-extrabold tnum leading-none" dir="ltr">{(+price).toFixed(3).replace(/\.000$/, '')}</span>
                  <span className={cx('text-[15px]', p.highlighted ? 'text-white/70' : 'text-ink-3')}>KWD {per === 'yearly' ? t.pricing.perYear : t.pricing.perMonth}</span>
                </p>
                {!compact && (
                  <ul className="mt-6 grid gap-3 text-[15px] flex-1">
                    {feats.map((f) => <li key={f} className="flex gap-2.5"><Icon name="check" size={18} className={cx('shrink-0 mt-0.5', p.highlighted ? 'text-[#7fb0ff]' : 'text-signal')} />{f}</li>)}
                  </ul>
                )}
                <button type="button" onClick={() => nav(`/checkout/${p.slug}?interval=${per}`)}
                  className={cx('btn mt-7 w-full', p.highlighted ? 'btn-primary' : 'btn-ink')}>{t.pricing.choose} {pick(p, 'name', lang)}</button>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-center text-[13px] text-ink-3 mt-6">{t.pricing.note}</p>
    </div>
  );
}

// ---------- Android handheld (CSS drawing) ----------
export function Handheld() {
  const { t, ar } = useLang();
  return (
    <div className="relative mx-auto w-[230px]" role="img" aria-label="Android handheld POS">
      <div className="h-10 mx-10 rounded-t-xl bg-[#e9edf5] border border-b-0 border-line flex items-end justify-center pb-1"><div className="h-1 w-24 rounded bg-ink-3/40" /></div>
      <div className="rounded-[28px] bg-[#1b3474] ring-1 ring-white/15 p-3 shadow-[0_30px_50px_-25px_rgba(0,0,0,.6)]">
        <div className="rounded-[18px] bg-white text-ink overflow-hidden">
          <div className="bg-signal text-white px-4 py-3 flex justify-between items-center text-[13px]"><span className="font-semibold">Naqdi X</span><span dir="ltr" className="tnum">09:41</span></div>
          <div className="p-4 grid gap-2 text-[13px]">
            {t.receipt.items.slice(0, 3).map(([n, q, p]) => <div key={n} className="flex justify-between gap-2"><span className="truncate">{n}</span><span dir="ltr" className="tnum">{(q * p).toFixed(3)}</span></div>)}
            <div className="border-t border-line pt-2 flex justify-between font-bold"><span>{t.receipt.total}</span><span dir="ltr" className="tnum">7.650</span></div>
            <div className={cx('mt-1 rounded-lg bg-paid text-white text-center py-2 font-semibold', ar && 'tracking-normal')}>{ar ? 'ادفع' : 'Charge'} · <span dir="ltr">7.650 KWD</span></div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 px-2">{['#e5484d', '#f5c84b', '#22a861'].map((c) => <span key={c} className="h-3 rounded" style={{ background: c }} />)}</div>
      </div>
    </div>
  );
}

// ---------- FAQ ----------
export function Faq() {
  const { t } = useLang();
  const [open, setOpen] = useState(0);
  return (
    <div className="divide-y divide-line border-y border-line">
      {t.faq.items.map(([q, a], i) => (
        <div key={q}>
          <button type="button" className="w-full flex justify-between items-center gap-4 py-5 text-start text-[17px] font-semibold" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
            {q}<Icon name={open === i ? 'minus' : 'plus'} className="shrink-0 text-signal" />
          </button>
          {open === i && <p className="pb-5 text-ink-2 leading-relaxed max-w-[70ch]">{a}</p>}
        </div>
      ))}
    </div>
  );
}

// ---------- demo request ----------
export function DemoForm() {
  const { t } = useLang();
  const d = t.demo;
  const [f, setF] = useState({ name: '', company: '', phone: '', email: '', interest: 'plans', message: '', website: '' });
  const [state, setState] = useState({ busy: false, done: false, error: '' });
  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, done: false, error: '' });
    try { await post('/api/leads', f); setState({ busy: false, done: true, error: '' }); } catch (err) { setState({ busy: false, done: false, error: err.message }); }
  };
  if (state.done) return <div className="rounded-2xl bg-white p-8 text-center"><Icon name="check" size={36} className="mx-auto text-paid" /><p className="mt-3 text-[18px] font-semibold">{d.sent}</p></div>;
  const field = (k, label, props = {}) => (
    <label className="grid gap-1.5 text-[14px] font-medium">{label}<input className="field" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props} /></label>
  );
  return (
    <form onSubmit={submit} className="rounded-2xl bg-white p-6 sm:p-8 grid gap-4 text-ink">
      <div className="grid sm:grid-cols-2 gap-4">
        {field('name', d.name, { required: true, autoComplete: 'name' })}
        {field('company', d.company, { autoComplete: 'organization' })}
        {field('phone', d.phone, { required: true, type: 'tel', dir: 'ltr', autoComplete: 'tel', placeholder: '+965' })}
        {field('email', d.email, { type: 'email', dir: 'ltr', autoComplete: 'email' })}
      </div>
      <label className="grid gap-1.5 text-[14px] font-medium">{d.interest}
        <select className="field" value={f.interest} onChange={(e) => setF({ ...f, interest: e.target.value })}>{d.interests.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </label>
      <label className="grid gap-1.5 text-[14px] font-medium">{d.message}<textarea className="field" rows={3} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} aria-hidden="true" />
      {state.error && <p className="text-danger text-[14px]" role="alert">{state.error}</p>}
      <button className="btn btn-primary" disabled={state.busy}>{d.send}</button>
    </form>
  );
}

export function NavLinkTop(props) { return <NavLink {...props} />; }
export { waLink, fill };
