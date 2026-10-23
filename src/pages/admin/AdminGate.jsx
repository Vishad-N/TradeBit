import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import '../../styles/courses.css';

// Same rules as the Reading admin: log in first, then admins only. The server enforces the role on every request too.
export default function AdminGate({ title, children }) {
  const { user, loading, isAdmin } = useAuth();
  const next = encodeURIComponent(useLocation().pathname);
  if (loading) return <section className="rd-section"><p role="status">Loading…</p></section>;
  if (!user) {
    return (
      <section className="rd-section rd-narrow">
        <span className="label">Admin</span><h1 className="h-l rd-title">{title}</h1>
        <div className="rd-card"><p>Please log in with an admin account.</p><Link className="btn btn-lime" to={`/login?next=${next}`}>Login to Continue <span className="ar">→</span></Link></div>
      </section>
    );
  }
  if (!isAdmin) {
    return (
      <section className="rd-section rd-narrow">
        <span className="label">Admin</span><h1 className="h-l rd-title">{title}</h1>
        <div className="rd-card"><p role="alert">You do not have permission to view this page.</p><Link className="btn btn-dark" to="/courses">Back to Courses</Link></div>
      </section>
    );
  }
  return children;
}
