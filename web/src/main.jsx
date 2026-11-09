import { StrictMode, lazy, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import './styles.css';
import { LangProvider } from './lib/i18n.jsx';
import { CatalogProvider, Header, Footer, WhatsAppButton } from './site/parts.jsx';
import { Home, AndroidPage, Checkout, OrderPage } from './site/pages.jsx';

const Admin = lazy(() => import('./admin/Admin.jsx'));

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { if (!window.location.hash) window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Site() {
  return (
    <LangProvider>
      <CatalogProvider>
        <ScrollTop />
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/android" element={<AndroidPage />} />
            <Route path="/checkout/:slug" element={<Checkout />} />
            <Route path="/order/:token" element={<OrderPage />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
        <Footer />
        <WhatsAppButton />
      </CatalogProvider>
    </LangProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<Suspense fallback={null}><Admin /></Suspense>} />
        <Route path="/*" element={<Site />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
