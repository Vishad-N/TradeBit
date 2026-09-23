import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Privacy from './pages/Privacy.jsx';
import Terms from './pages/Terms.jsx';
import RiskDisclosure from './pages/RiskDisclosure.jsx';
import LegalLayout from './components/LegalLayout.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<LegalLayout />}>
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/risk-disclosure" element={<RiskDisclosure />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
