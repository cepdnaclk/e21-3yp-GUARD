import { Link, NavLink, useLocation } from 'react-router-dom';
import guardLogo from '../assets/guard-logo.png';
import '../styles/navigation.css';

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: { pathname: '/', hash: '#contacts' }, label: 'Contact' },
  { to: '/login', label: 'Sign In' },
  { to: '/register', label: 'Sign Up' },
];

export default function PublicNav() {
  const location = useLocation();
  const contactActive = location.pathname === '/' && location.hash === '#contacts';

  return (
    <nav className="site-nav" aria-label="Primary">
      <Link to="/" className="site-nav-brand" aria-label="Go to home page">
        <span className="site-nav-logo">
          <img src={guardLogo} alt="G.U.A.R.D logo" />
        </span>
        <span className="site-nav-title">G.U.A.R.D</span>
      </Link>

      <div className="site-nav-links">
        {NAV_ITEMS.map((item) => (
          item.label === 'Contact' ? (
            <Link
              key={item.label}
              to="/#contacts"
              className={contactActive ? 'site-nav-link active' : 'site-nav-link'}
            >
              {item.label}
            </Link>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'site-nav-link active' : 'site-nav-link')}
            >
              {item.label}
            </NavLink>
          )
        ))}
      </div>
    </nav>
  );
}