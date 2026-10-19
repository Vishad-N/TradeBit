import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Privacy from './pages/Privacy.jsx';
import Terms from './pages/Terms.jsx';
import Refund from './pages/Refund.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
// three.js is only needed here, so the Gallery loads on demand and the landing page stays light.
const Gallery = lazy(() => import('./pages/Gallery.jsx'));
import MarketNews from './pages/MarketNews.jsx';
import RiskDisclosure from './pages/RiskDisclosure.jsx';
import Login from './pages/Login.jsx';
import ReadBooks from './pages/ReadBooks/ReadBooks.jsx';
import Mentorship from './pages/Mentorship.jsx';
import Club from './pages/Club.jsx';
import AdminReading from './pages/admin/AdminReading.jsx';
import LegalLayout from './components/LegalLayout.jsx';
import SiteLayout from './components/SiteLayout.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import WhatsAppButton from './components/WhatsAppButton.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { SiteLinksProvider } from './context/SiteLinksContext.jsx';
import { PricingProvider } from './context/PricingContext.jsx';
import OfferBadge from './components/OfferBadge.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SiteLinksProvider>
        <PricingProvider>
        <ScrollToTop />
        <WhatsAppButton />
        <OfferBadge />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<LegalLayout />}>
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/refund" element={<Refund />} />
            <Route path="/risk-disclosure" element={<RiskDisclosure />} />
          </Route>
          <Route element={<SiteLayout />}>
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/market-news" element={<MarketNews />} />
            <Route path="/gallery" element={<Suspense fallback={null}><Gallery /></Suspense>} />
            <Route path="/login" element={<Login />} />
            <Route path="/read/books" element={<ReadBooks />} />
            <Route path="/mentorship" element={<Mentorship />} />
            <Route path="/1-percent-club" element={<Club />} />
            <Route path="/admin/reading" element={<AdminReading />} />
          </Route>
        </Routes>
        </PricingProvider>
        </SiteLinksProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
