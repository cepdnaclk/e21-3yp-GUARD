import { Link, NavLink } from 'react-router-dom';
import guardLogo from '../assets/guard-logo.png';
import '../styles/navigation.css';

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/login', label: 'Sign In' },
  { to: '/register', label: 'Sign Up' },
];

export default function PublicNav() {
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
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? 'site-nav-link active' : 'site-nav-link')}
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}