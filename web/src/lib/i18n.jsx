import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { content } from '../site/content.js';

const KEY = 'naqdix_lang';
const initial = () => {
  const q = new URLSearchParams(window.location.search).get('lang');
  if (q === 'ar' || q === 'en') return q;
  try { const s = localStorage.getItem(KEY); if (s === 'ar' || s === 'en') return s; } catch { /* */ }
  return (navigator.language || '').startsWith('ar') ? 'ar' : 'en';
};
const Ctx = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(initial);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try { localStorage.setItem(KEY, lang); } catch { /* */ }
  }, [lang]);
  const value = useMemo(() => ({ lang, setLang, t: content[lang], ar: lang === 'ar' }), [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useLang = () => useContext(Ctx);
/** Pick the Arabic field of a product when the site is in Arabic. */
export const pick = (obj, field, lang) => (lang === 'ar' && obj?.[`${field}_ar`]) || obj?.[field] || '';
