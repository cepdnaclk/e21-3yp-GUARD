import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import guardLogo from '../assets/guard-logo.png';
import { useTheme } from '../context/ThemeContext';
import '../styles/navigation.css';

function RoundedMobileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mobile-app-btn-icon-svg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="3" width="12" height="18" rx="3" ry="3" />
      <path d="M12 17h.01" />
      <path d="M12 7v5m-2.5-2.5L12 12l2.5-2.5" />
    </svg>
  );
}

export default function PublicNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const contactActive = location.pathname === '/' && location.hash === '#contacts';

  function handleNavClick(targetPath) {
    if (location.pathname === targetPath) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }

  function handleContactClick(e) {
    e.preventDefault();
    if (location.pathname === '/') {
      document.getElementById('contacts')?.scrollIntoView({ behavior: 'smooth' });
      window.history.pushState(null, '', '#contacts');
    } else {
      navigate('/#contacts');
    }
  }

  return (
    <nav className="site-nav" aria-label="Primary">
      <Link
        to="/"
        className="site-nav-brand"
        aria-label="Go to home page"
        onClick={() => handleNavClick('/')}
      >
        <span className="site-nav-logo">
          <img src={guardLogo} alt="G.U.A.R.D logo" />
        </span>
        <span className="site-nav-title">G.U.A.R.D</span>
      </Link>

      <div className="site-nav-links">
        <NavLink
          to="/"
          end
          className={({ isActive }) => (isActive && !contactActive ? 'site-nav-link active' : 'site-nav-link')}
          onClick={() => handleNavClick('/')}
        >
          Home
        </NavLink>
        <NavLink
          to="/about"
          className={({ isActive }) => (isActive ? 'site-nav-link active' : 'site-nav-link')}
          onClick={() => handleNavClick('/about')}
        >
          About
        </NavLink>
        <a
          href="/#contacts"
          onClick={handleContactClick}
          className={contactActive ? 'site-nav-link active' : 'site-nav-link'}
        >
          Contact
        </a>
      </div>

      <div className="site-nav-actions">
        <Link to="/mobile-download" className="mobile-app-btn">
          <span className="mobile-app-btn-icon" aria-hidden="true">
            <RoundedMobileIcon />
          </span>
          <span className="mobile-app-btn-label">Download Mobile App</span>
        </Link>
        <NavLink to="/login" className="site-nav-link site-nav-btn-outline">
          Sign In
        </NavLink>
        <NavLink to="/register" className="site-nav-link site-nav-btn-solid">
          Sign Up
        </NavLink>
      </div>
    </nav>
  );
}