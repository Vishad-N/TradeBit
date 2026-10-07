import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Privacy from './pages/Privacy.jsx';
import Terms from './pages/Terms.jsx';
import RiskDisclosure from './pages/RiskDisclosure.jsx';
import Login from './pages/Login.jsx';
import ReadBooks from './pages/ReadBooks/ReadBooks.jsx';
import Mentorship from './pages/Mentorship.jsx';
import AdminReading from './pages/admin/AdminReading.jsx';
import LegalLayout from './components/LegalLayout.jsx';
import SiteLayout from './components/SiteLayout.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<LegalLayout />}>
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/risk-disclosure" element={<RiskDisclosure />} />
          </Route>
          <Route element={<SiteLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/read/books" element={<ReadBooks />} />
            <Route path="/mentorship" element={<Mentorship />} />
            <Route path="/admin/reading" element={<AdminReading />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
