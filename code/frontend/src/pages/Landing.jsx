import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/landing.css';


import cloudImg from '../assets/Image-1.png';
import dashboardImg from '../assets/Image-2.png';
import waterImg from '../assets/Image-3.png';
import guardLogo from '../assets/guard-logo.png';
import shieldImg from '../assets/Image.png';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="landing-page">
      {/* Top Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <div className="logo-shield">
            <img src={guardLogo} />
          </div>
          <span className="logo-text">G.U.A.R.D</span>
        </div>
        <div className="landing-nav-links">
          <a href="#about">About</a>
          <a href="#services">Services</a>
          <a href="#cta">Call to action</a>
          <a href="#contacts">Contacts</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero" id="cta">
        <div className="hero-content">
          <h1>Monitor. Analyze. Protect.</h1>
          <p>Let Your Fish Thrive with Smart Water, Zero Stress.</p>
          <div className="hero-actions">
            {user ? (
              <Link to="/dashboard" className="btn btn-primary landing-btn">Go to Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-primary landing-btn">Sign In</Link>
                <Link to="/register" className="btn btn-outline landing-btn-outline">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="landing-about" id="about">
        <div className="about-content">
          <div className="about-text">
            <h2>General Unit for Aquatic Risk Detection.</h2>
            <p>
              GUARD is a modular, IoT-based aquarium monitoring and safety system
              designed specifically for multi-tank pet shop environments.
            </p>
            <p>
              In simple terms, it is a smart monitoring system that continuously
              checks water conditions in aquarium tanks and alerts vendors before fish are harmed.
            </p>
            <div className="iot-badge">IOT</div>
          </div>
          <div className="about-icon-card">
            <div className="about-icon-shield">
              <img src={shieldImg} alt="GUARD Shield" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="landing-features" id="services">
        <div className="features-container">
          <h2>Exciting Features......</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-image-wrapper">
                <img src={cloudImg} alt="Centralized Intelligence" />
              </div>
              <div className="feature-card-content">
                <h3>Centralized Intelligence</h3>
                <p>Alert & notification system, Local LED indicators for an emergency situations</p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-image-wrapper">
                <img src={dashboardImg} alt="Real time Dashboard" />
              </div>
              <div className="feature-card-content">
                <h3>Real time & Historical Dashboard</h3>
                <p>Vendors can monitor their entire aquarium status in a single dashboard in real time based on the measured water parameters.</p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-image-wrapper">
                <img src={waterImg} alt="Automated filtration" />
              </div>
              <div className="feature-card-content">
                <h3>Automated filtration, circulation & optional water change control.</h3>
                <h4>Automated feeding</h4>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission / Values / Vision */}
      <section className="landing-core-values">
        <div className="core-values-grid">
          <div className="value-item">
            <h3>Our Mission</h3>
            <p>Writing for websites is both simple and complex. On the one hand, all you need to do is say what you mean and in your words.</p>
          </div>
          <div className="value-item">
            <h3>Values</h3>
            <p>Are you thinking of keywords you should rank for? Are you including links in your text to additional information?</p>
          </div>
          <div className="value-item">
            <h3>Vision</h3>
            <p>There's a theory that people read in an F-shaped pattern, and that this should influence how you structure content on your website.</p>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="landing-why-choose-us">
        <h2>WHY CHOOSE US ?</h2>
        <div className="why-choose-us-grid">
          <div className="why-item">
            <h4><span className="why-icon">🔹</span>Smart, Closed-Loop Protection</h4>
            <p>Our system continuously monitors water conditions and automatically takes real-time corrective actions to prevent risks.</p>
          </div>
          <div className="why-item">
            <h4><span className="why-icon">🔹</span>Built for Multi-Tank Environments</h4>
            <p>Manage multiple tanks efficiently from a single system designed specifically for aquatic pet shop environments.</p>
          </div>
          <div className="why-item">
            <h4><span className="why-icon">🔹</span>Plug-and-Play Simplicity</h4>
            <p>Quick and easy setup allows you to start using the system without any technical complexity.</p>
          </div>
          <div className="why-item">
            <h4><span className="why-icon">🔹</span>Customizable for Every Species</h4>
            <p>Easily adjust sensor thresholds to create ideal conditions tailored to different aquatic species.</p>
          </div>
          <div className="why-item">
            <h4><span className="why-icon">🔹</span>Cost-Effective Without Compromise</h4>
            <p>Get reliable, high-performance protection at an affordable price suitable for any scale of operation.</p>
          </div>
          <div className="why-item">
            <h4><span className="why-icon">🔹</span>Scalable and Future-Ready</h4>
            <p>Easily expand the system as your business grows by adding more tanks and features without replacing existing hardware.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer" id="contacts">
        <div className="footer-content">
          <p>&copy; {new Date().getFullYear()} G.U.A.R.D. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
