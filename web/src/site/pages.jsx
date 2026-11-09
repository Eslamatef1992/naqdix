import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { get, post, money, date } from '../lib/api.js';
import { useLang, pick } from '../lib/i18n.jsx';
import { Icon } from '../components/Icon.jsx';
import { useCatalog, Receipt, PricingCards, Handheld, Faq, DemoForm, cx, waLink, fill } from './parts.jsx';

// scroll to #section after navigation
function useHashScroll() {
  useEffect(() => {
    if (!window.location.hash) return;
    const el = document.querySelector(window.location.hash);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 60);
  }, []);
}

export function Home() {
  const { t, lang } = useLang();
  const cat = useCatalog();
  useHashScroll();
  const app = cat?.products?.find((p) => p.kind === 'app');
  return (
    <>
      {/* hero */}
      <section className="bg-white border-b border-line overflow-hidden">
        <div className="wrap grid lg:grid-cols-[1.15fr_1fr] gap-12 items-center py-14 lg:py-20">
          <div>
            <h1 className="display text-[40px] sm:text-[56px] lg:text-[64px] max-w-[14ch]">{t.hero.title}</h1>
            <p className="mt-5 text-[18px] text-ink-2 leading-relaxed max-w-[54ch]">{t.hero.body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#pricing" className="btn btn-primary">{t.hero.primary}</a>
              <a href="#demo" className="btn btn-line">{t.hero.secondary}</a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-ink-2">
              {t.hero.facts.map((f) => <li key={f} className="inline-flex items-center gap-2"><Icon name="check" size={16} className="text-signal" />{f}</li>)}
            </ul>
          </div>
          <div className="relative">
            <div className="absolute inset-x-6 top-10 bottom-0 rounded-[32px] bg-sky" aria-hidden="true" />
            <div className="relative pt-4 pb-10"><Receipt /></div>
          </div>
        </div>
      </section>

      {/* modules */}
      <section id="solutions" className="py-20 scroll-mt-16">
        <div className="wrap">
          <h2 className="h2 max-w-[20ch]">{t.modules.title}</h2>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 border-t border-s border-line">
            {t.modules.items.map((m) => (
              <div key={m.title} className="p-7 border-b border-e border-line bg-white">
                <span className="inline-grid place-items-center h-11 w-11 rounded-xl bg-sky text-signal"><Icon name={m.icon} size={22} /></span>
                <h3 className="mt-5 text-[19px] font-bold">{m.title}</h3>
                <p className="mt-2 text-ink-2 leading-relaxed">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Android POS */}
      <section id="android" className="bg-ink text-white py-20 scroll-mt-16">
        <div className="wrap grid lg:grid-cols-[1fr_auto] gap-14 items-center">
          <div>
            <h2 className="h2">{t.android.title}</h2>
            <p className="mt-4 text-[18px] text-white/75 max-w-[52ch]">{t.android.lead}</p>
            {app && (
              <ul className="mt-8 grid sm:grid-cols-2 gap-x-8 gap-y-3 max-w-[640px]">
                {((lang === 'ar' && app.features.ar?.length ? app.features.ar : app.features.en) || []).slice(0, 6).map((f) => (
                  <li key={f} className="flex gap-2.5 text-[15px]"><Icon name="check" size={18} className="text-[#7fb0ff] shrink-0 mt-0.5" />{f}</li>
                ))}
              </ul>
            )}
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              {app && <div><p className="text-white/60 text-[13px]">{t.android.once}</p><p className="text-[36px] font-extrabold tnum leading-tight" dir="ltr">{money(app.price_once, app.currency).replace('.000', '')}</p></div>}
              <div className="flex flex-wrap gap-3">
                {app && <Link to={`/checkout/${app.slug}`} className="btn btn-primary">{t.android.buy}</Link>}
                <Link to="/android" className="btn border-white/25 text-white hover:border-white/60">{t.android.more}</Link>
              </div>
            </div>
          </div>
          <Handheld />
        </div>
      </section>

      {/* industries */}
      <section className="py-20">
        <div className="wrap">
          <h2 className="h2 max-w-[22ch]">{t.industries.title}</h2>
          <ul className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
            {t.industries.items.map(([icon, label]) => (
              <li key={label} className="flex items-center gap-3 rounded-xl bg-white border border-line px-4 py-4 text-[15px] font-medium">
                <Icon name={icon} size={22} className="text-signal shrink-0" />{label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* integrations */}
      <section className="bg-white border-y border-line py-20">
        <div className="wrap grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="h2">{t.integrations.title}</h2>
            <p className="mt-4 text-[17px] text-ink-2 max-w-[48ch] leading-relaxed">{t.integrations.body}</p>
          </div>
          <ul className="flex flex-wrap gap-2.5">
            {t.integrations.items.map((x) => <li key={x} className="px-4 py-2.5 rounded-full border border-line bg-paper text-[15px]">{x}</li>)}
          </ul>
        </div>
      </section>

      {/* pricing */}
      <section id="pricing" className="py-20 scroll-mt-16">
        <div className="wrap">
          <div className="text-center mb-10">
            <h2 className="h2">{t.pricing.title}</h2>
            <p className="mt-3 text-[17px] text-ink-2">{t.pricing.body}</p>
          </div>
          <PricingCards />
        </div>
      </section>

      {/* faq */}
      <section id="faq" className="bg-white border-y border-line py-20 scroll-mt-16">
        <div className="wrap grid lg:grid-cols-[1fr_1.6fr] gap-10">
          <h2 className="h2">{t.faq.title}</h2>
          <Faq />
        </div>
      </section>

      {/* demo */}
      <section id="demo" className="py-20 scroll-mt-16 bg-signal text-white">
        <div className="wrap grid lg:grid-cols-[1fr_1.2fr] gap-10 items-start">
          <div>
            <h2 className="h2">{t.demo.title}</h2>
            <p className="mt-4 text-[17px] text-white/85 max-w-[42ch] leading-relaxed">{t.demo.body}</p>
            {cat?.contact?.whatsapp && (
              <a href={waLink(cat.contact.whatsapp)} target="_blank" rel="noopener" className="mt-8 inline-flex items-center gap-2 font-semibold underline underline-offset-4">
                <Icon name="wa" size={20} />{t.footer.whatsapp}
              </a>
            )}
          </div>
          <DemoForm />
        </div>
      </section>
    </>
  );
}

export function AndroidPage() {
  const { t, lang } = useLang();
  const cat = useCatalog();
  const app = cat?.products?.find((p) => p.kind === 'app');
  const feats = app ? ((lang === 'ar' && app.features.ar?.length ? app.features.ar : app.features.en) || []) : [];
  const icons = ['wifiOff', 'printer', 'barcode', 'globe', 'box', 'card', 'register', 'key'];
  return (
    <>
      <section className="bg-ink text-white">
        <div className="wrap grid lg:grid-cols-[1.2fr_auto] gap-12 items-center py-16 lg:py-20">
          <div>
            <h1 className="display text-[40px] sm:text-[56px] max-w-[16ch]">{app ? pick(app, 'name', lang) : t.android.title}</h1>
            <p className="mt-5 text-[18px] text-white/75 max-w-[52ch]">{t.android.lead}</p>
            {app && (
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <div><p className="text-white/60 text-[13px]">{t.android.once}</p><p className="text-[40px] font-extrabold tnum leading-tight" dir="ltr">{money(app.price_once, app.currency).replace('.000', '')}</p></div>
                <Link to={`/checkout/${app.slug}`} className="btn btn-primary">{t.android.buy}</Link>
              </div>
            )}
            <p className="mt-6 text-[14px] text-white/60 max-w-[52ch]">{t.android.devices}</p>
          </div>
          <Handheld />
        </div>
      </section>
      <section className="py-20">
        <div className="wrap">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {feats.map((f, i) => (
              <div key={f} className="rounded-2xl bg-white border border-line p-6">
                <Icon name={icons[i % icons.length]} size={24} className="text-signal" />
                <p className="mt-4 text-[16px] font-semibold leading-snug">{f}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-white border-y border-line py-20">
        <div className="wrap">
          <h2 className="h2">{t.android.how}</h2>
          <ol className="mt-10 grid md:grid-cols-3 gap-6">
            {t.android.steps.map((s, i) => (
              <li key={s} className="relative rounded-2xl border border-line p-6 pt-8">
                <span className="absolute -top-4 start-6 h-9 w-9 rounded-full bg-signal text-white grid place-items-center font-bold tnum">{i + 1}</span>
                <p className="text-[17px] font-semibold leading-snug">{s}</p>
              </li>
            ))}
          </ol>
          {app && <Link to={`/checkout/${app.slug}`} className="btn btn-primary mt-10">{t.android.buy}</Link>}
        </div>
      </section>
      <section className="py-20"><div className="wrap grid lg:grid-cols-[1fr_1.6fr] gap-10"><h2 className="h2">{t.faq.title}</h2><Faq /></div></section>
    </>
  );
}

export function Checkout() {
  const { t, lang } = useLang();
  const c = t.checkout;
  const { slug } = useParams();
  const [q] = useSearchParams();
  const cat = useCatalog();
  const product = cat?.products?.find((p) => p.slug === slug);
  const [chosen, setInterval] = useState(q.get('interval') === 'monthly' ? 'monthly' : 'yearly');
  const [f, setF] = useState({ name: '', company: '', email: '', phone: '' });
  const [state, setState] = useState({ busy: '', error: '' });
  if (!cat) return <div className="min-h-[60vh]" />;
  if (!product) return <div className="wrap py-24 text-center"><p className="text-[18px]">404</p><Link to="/" className="btn btn-line mt-6">{t.order.back}</Link></div>;
  const isApp = product.kind === 'app';
  const periods = isApp ? [] : ['monthly', 'yearly'].filter((k) => product[`price_${k}`] != null);
  const interval = periods.includes(chosen) ? chosen : periods[0] || 'yearly';
  const effInterval = isApp ? 'once' : interval;
  const amount = isApp ? product.price_once : interval === 'yearly' ? product.price_yearly : product.price_monthly;
  const methods = cat.paymentMethods || [];
  const charged = cat.charge?.converted ? `${(Math.ceil(amount * cat.charge.rate * 100) / 100).toFixed(2)} ${cat.charge.currency}` : null;
  const pay = async (method) => {
    setState({ busy: method, error: '' });
    try {
      const r = await post('/api/checkout', { product: product.slug, interval: effInterval, method, lang, ...f });
      window.location.href = r.url;
    } catch (e) { setState({ busy: '', error: e.message }); }
  };
  const field = (k, label, props = {}) => <label className="grid gap-1.5 text-[14px] font-medium">{label}<input className="field" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props} /></label>;
  const ready = f.name.trim() && /\S+@\S+\.\S+/.test(f.email) && f.phone.replace(/\D/g, '').length >= 7;
  return (
    <section className="py-12 lg:py-16">
      <div className="wrap">
        <h1 className="h2 mb-8">{c.title}</h1>
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
          <form className="rounded-2xl bg-white border border-line p-6 sm:p-8 grid gap-4" onSubmit={(e) => { e.preventDefault(); if (ready && methods.length) pay(methods[0]); }}>
            <h2 className="text-[18px] font-bold">{c.yourDetails}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {field('name', c.name, { required: true, autoComplete: 'name' })}
              {field('company', c.company, { autoComplete: 'organization' })}
              {field('email', c.email, { required: true, type: 'email', dir: 'ltr', autoComplete: 'email' })}
              {field('phone', c.phone, { required: true, type: 'tel', dir: 'ltr', autoComplete: 'tel', placeholder: '+965' })}
            </div>
            {state.error && <p className="text-danger text-[14px]" role="alert">{state.error}</p>}
            {methods.length ? (
              <div className="grid gap-3 mt-2">
                {methods.includes('card') && <button type="button" disabled={!ready || !!state.busy} onClick={() => pay('card')} className="btn btn-primary h-14 text-[16px]"><Icon name="card" />{state.busy === 'card' ? '…' : c.card}</button>}
                {methods.includes('paypal') && <button type="button" disabled={!ready || !!state.busy} onClick={() => pay('paypal')} className="btn h-14 text-[16px] bg-[#ffc439] text-[#111] hover:bg-[#f2b92f]">{state.busy === 'paypal' ? '…' : c.paypal}</button>}
                <p className="text-[13px] text-ink-3 inline-flex items-center gap-1.5"><Icon name="shield" size={16} />{c.secure}</p>
              </div>
            ) : (
              <div className="rounded-xl bg-warn-wash text-warn p-4 text-[14px]">{c.notReady} <a href="/#demo" className="font-semibold underline">{t.nav.demo}</a></div>
            )}
          </form>
          <aside className="rounded-2xl bg-white border border-line p-6 sm:p-8 lg:sticky lg:top-24">
            <h2 className="text-[18px] font-bold">{c.summary}</h2>
            <div className="mt-5 flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-[17px]">{pick(product, 'name', lang)}</p>
                <p className="text-[14px] text-ink-3">{pick(product, 'tagline', lang)}</p>
              </div>
              {isApp ? <Icon name="phone" size={28} className="text-signal" /> : <Icon name="register" size={28} className="text-signal" />}
            </div>
            {periods.length > 1 && (
              <div className="mt-5 grid grid-cols-2 gap-2" role="radiogroup">
                {periods.map((k) => (
                  <button key={k} type="button" role="radio" aria-checked={interval === k} onClick={() => setInterval(k)}
                    className={cx('rounded-xl border px-3 py-3 text-start', interval === k ? 'border-signal ring-1 ring-signal bg-sky/50' : 'border-line')}>
                    <span className="block text-[14px] font-semibold">{t.pricing[k]}</span>
                    <span className="block text-[13px] text-ink-3" dir="ltr">{money(k === 'yearly' ? product.price_yearly : product.price_monthly, product.currency)}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-6 pt-5 border-t border-line flex justify-between items-baseline">
              <span className="text-ink-2">{c.billed[effInterval]}</span>
              <span className="text-[28px] font-extrabold tnum" dir="ltr">{money(amount, product.currency)}</span>
            </div>
            {charged && <p className="mt-2 text-[13px] text-ink-3">{fill(c.converted, { amount: charged, original: money(amount, product.currency) })}</p>}
            {isApp && <p className="mt-4 rounded-xl bg-sky text-ink p-3 text-[14px] inline-flex gap-2"><Icon name="key" size={18} className="text-signal shrink-0 mt-0.5" />{c.serialNote}</p>}
            <p className="mt-4 text-[12px] text-ink-3">{c.terms}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}

export function OrderPage() {
  const { t, lang } = useLang();
  const o = t.order;
  const { token } = useParams();
  const [q] = useSearchParams();
  const cat = useCatalog();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [copied, setCopied] = useState(false);
  const load = () => get(`/api/orders/${token}`).then(setOrder).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  const act = async (name, fn) => { setBusy(name); setError(''); try { await fn(); } catch (e) { setError(e.message); } setBusy(''); };
  if (error && !order) return <div className="wrap py-24 text-center"><p className="text-[18px]">{error}</p><Link to="/" className="btn btn-line mt-6">{o.back}</Link></div>;
  if (!order) return <div className="min-h-[60vh]" />;
  const paid = order.status === 'paid';
  const wa = cat?.contact?.whatsapp;
  const copy = async () => { try { await navigator.clipboard.writeText(order.serial); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* */ } };
  return (
    <section className="py-12 lg:py-16">
      <div className="wrap max-w-[760px]">
        <div className={cx('rounded-2xl p-6 sm:p-8 border', paid ? 'bg-white border-line' : 'bg-white border-line')}>
          <div className="flex items-center gap-3">
            <span className={cx('h-11 w-11 rounded-full grid place-items-center', paid ? 'bg-paid-wash text-paid' : order.status === 'canceled' ? 'bg-paper text-ink-3' : 'bg-warn-wash text-warn')}>
              <Icon name={paid ? 'check' : order.status === 'canceled' ? 'x' : 'card'} size={22} />
            </span>
            <div>
              <h1 className="text-[22px] font-extrabold">{paid ? o.paid : order.status === 'canceled' ? o.canceled : o.pending}</h1>
              <p className="text-[14px] text-ink-3" dir="ltr">{fill(o.title, { number: order.number })}</p>
            </div>
          </div>
          {q.get('payment') === 'canceled' && !paid && <p className="mt-5 rounded-xl bg-paper p-3 text-[14px]">{o.canceledPay}</p>}
          {q.get('payment') === 'pending' && !paid && <p className="mt-5 rounded-xl bg-warn-wash text-warn p-3 text-[14px]">{o.notConfirmed}</p>}
          {paid && <p className="mt-5 text-ink-2">{fill(o.thanks, { name: order.customer_name })}</p>}

          {paid && order.serial && (
            <div className="mt-6 rounded-2xl border-2 border-dashed border-signal p-6 text-center">
              <p className="text-[14px] text-ink-3">{o.serial}</p>
              <p className="mt-2 text-[26px] sm:text-[30px] font-extrabold tracking-[0.12em] tnum select-all" dir="ltr" style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>{order.serial}</p>
              <p className="mt-3 text-[14px] text-ink-2 max-w-[46ch] mx-auto">{o.serialHelp}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {wa && <a className="btn bg-[#1fa855] text-white hover:bg-[#168f47]" target="_blank" rel="noopener" href={waLink(wa, fill(o.waMessage, { serial: order.serial, number: order.number }))}><Icon name="wa" />{o.sendCode}</a>}
                <button type="button" onClick={copy} className="btn btn-line"><Icon name={copied ? 'check' : 'copy'} />{copied ? o.copied : o.copy}</button>
              </div>
            </div>
          )}
          {paid && order.kind === 'plan' && (
            <div className="mt-6 rounded-xl bg-sky p-4">
              {order.period_end && <p className="font-semibold">{fill(o.activeUntil, { date: date(order.period_end, lang) })}</p>}
              <p className="text-[14px] text-ink-2 mt-1">{o.planNext}</p>
            </div>
          )}

          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[15px] border-t border-line pt-5">
            <dt className="text-ink-3">{o.product}</dt><dd className="font-medium text-end">{pick(order.product, 'name', lang)}{order.interval !== 'once' && <span className="text-ink-3"> · {t.pricing[order.interval]}</span>}</dd>
            <dt className="text-ink-3">{o.amount}</dt><dd className="font-semibold text-end tnum" dir="ltr">{money(order.amount, order.currency)}</dd>
            <dt className="text-ink-3">{o.date}</dt><dd className="text-end">{date(order.paid_at || order.created_at, lang)}</dd>
          </dl>
          {error && <p className="mt-4 text-danger text-[14px]" role="alert">{error}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            {order.status === 'pending' && <>
              <button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => act('pay', async () => { window.location.href = (await post(`/api/orders/${token}/pay`, { method: cat?.paymentMethods?.[0] })).url; })}><Icon name="card" />{o.payNow}</button>
              <button type="button" className="btn btn-line" disabled={!!busy} onClick={() => act('check', async () => setOrder(await post(`/api/orders/${token}/check`)))}>{o.check}</button>
            </>}
            {order.renewable && <button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => act('renew', async () => { window.location.href = (await post(`/api/orders/${token}/renew`, { method: cat?.paymentMethods?.[0] })).url; })}>{o.renew}</button>}
            <Link to="/" className="btn btn-line">{o.back}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- features: real product screens ----------
function Screen({ src, alt, narrow }) {
  return (
    <figure className={cx('rounded-2xl bg-ink p-2 sm:p-3 shadow-[0_24px_60px_-28px_rgba(15,27,61,.55)]', narrow && 'max-w-[440px] mx-auto')}>
      <div className="flex gap-1.5 px-2 pb-2 sm:pb-3" aria-hidden="true">
        <span className="size-2.5 rounded-full bg-white/25" /><span className="size-2.5 rounded-full bg-white/25" /><span className="size-2.5 rounded-full bg-white/25" />
      </div>
      <img src={`/screens/${src}.webp`} alt={alt} loading="lazy" className="w-full h-auto rounded-lg bg-white" />
    </figure>
  );
}

export function FeaturesPage() {
  const { t } = useLang();
  const f = t.features;
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <>
      <section className="bg-paper border-b border-line">
        <div className="wrap py-16 lg:py-20">
          <div>
            <h1 className="display text-[40px] sm:text-[56px] max-w-[18ch]">{f.title}</h1>
            <p className="mt-5 text-[18px] text-ink-2 max-w-[48ch] leading-relaxed">{f.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/#demo" className="btn btn-primary">{f.ctaBtn}</a>
              <a href="/#pricing" className="btn btn-line">{f.ctaPlans}</a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 border-b border-line bg-white">
        <div className="wrap">
          <h2 className="text-[15px] font-semibold text-ink-2">{f.modulesTitle}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {f.modules.map((m) => <li key={m} className="px-3.5 py-2 rounded-full border border-line text-[14px] bg-paper">{m}</li>)}
          </ul>
        </div>
      </section>

      <div className="py-8">
        {f.shots.map((s, i) => (
          <section key={s.img} className={cx('wrap py-14 lg:py-20 grid gap-10 lg:gap-16 items-center', i % 2 === 1 ? 'lg:grid-cols-[1.5fr_1fr]' : 'lg:grid-cols-[1fr_1.5fr]')}>
            <div className={cx(i % 2 === 1 && 'lg:order-2')}>
              <h2 className="h2">{s.title}</h2>
              <p className="mt-4 text-[17px] text-ink-2 leading-relaxed max-w-[46ch]">{s.body}</p>
              <ul className="mt-6 grid gap-3">
                {s.points.map((p) => (
                  <li key={p} className="flex gap-3 items-start text-[16px]"><Icon name="check" size={20} className="text-signal mt-0.5 shrink-0" />{p}</li>
                ))}
              </ul>
            </div>
            <Screen src={s.img} alt={s.title} narrow={s.img === 'login'} />
          </section>
        ))}
      </div>

      <section className="bg-ink text-white">
        <div className="wrap py-16 flex flex-col sm:flex-row gap-6 sm:items-center justify-between">
          <h2 className="display text-[30px] sm:text-[38px] max-w-[20ch]">{f.cta}</h2>
          <div className="flex flex-wrap gap-3">
            <a href="/#demo" className="btn btn-primary">{f.ctaBtn}</a>
            <a href="/#pricing" className="btn bg-white/10 text-white hover:bg-white/20">{f.ctaPlans}</a>
          </div>
        </div>
      </section>
    </>
  );
}
