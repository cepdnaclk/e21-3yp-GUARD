import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/landing.css';


import cloudImg from '../../assets/Image-1.png';
import dashboardImg from '../../assets/Image-2.png';
import waterImg from '../../assets/Image-3.png';
import feedingImg from '../../assets/Image-4.jpg';
import problemImg from '../../assets/Image-5.jpg';
import guardLogo from '../../assets/guard-logo.png';
import shieldImg from '../../assets/Image.png';
import productVideo from '../../assets/Device_intro.mp4';

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

      {/* Problem Section */}
      <section className="landing-problems" id="problems">
        <div className="problems-container">
          <div className="problems-copy">
            <span className="section-eyebrow">Problems to solve</span>
            <h2>What needs attention in a multi-tank aquarium environment?</h2>
            {/* <img src={problemImg} alt="Problems in Aquarium Management" /> */}
          </div>

          <div className="problems-panel">
            <div className="problem-card problem-card-large">
              <h3>Operational gaps</h3>
              <p>Managing multiple tanks with species-specific needs is harder. Manual testing is reactive, time consuming and sometimes not accurate.</p>
            </div>
            <div className="problem-card">
              <h4>Invisible Threats</h4>
              <p>Critical water parameters change invisibly.</p>
            </div>
            <div className="problem-card">
              <h4>Financial Impact</h4>
              <p>High financial loss from premium fish mortality - e.g., Arowana.</p>
            </div>
            <div className="problem-card">
              <h4>Trust</h4>
              <p>Loss of customer trust and reputation.</p>
            </div>
          </div>
        </div>
      </section>


      {/* About Section */}
      <section className="landing-about" id="about">
        <div className="about-content">
          <div className="about-text">
            <span className="about-topic">G.U.A.R.D.</span>
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
          <h2>Exciting Features</h2>
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
                <p>Keep water moving safely with automated circulation and optional water change control.</p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-image-wrapper">
                <img src={feedingImg} alt="Automated feeding" />
              </div>
              <div className="feature-card-content">
                <h3>Automated feeding</h3>
                <p>Use the dedicated feeder to schedule and deliver food reliably for each tank.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Product Video Section */}
      <section className="landing-product-video">
        <video className="product-video-media" autoPlay muted loop playsInline>
          <source src={productVideo} type="video/mp4" />
        </video>
        <div className="product-video-overlay" />
        <div className="video-content">
          <h2>G.U.A.R.D.</h2>
          <p>Experience the future of aquarium care</p>
        </div>
      </section>

      {/* Mission / Values / Vision
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
      </section> */}

      {/* Why Choose Us */}
      <section className="landing-why-choose-us">
        <h2>WHY CHOOSE GUARD ?</h2>
        <div className="why-choose-us-grid">
          <div className="why-card">
            <div className="why-card-icon"><i className="fa-solid fa-cog" aria-hidden="true"></i></div>
            <div className="why-card-body">
              <h4>Smart Closed-Loop Protection</h4>
              <p>Monitors water conditions and automatically triggers corrective actions to prevent losses.</p>
            </div>
          </div>

          <div className="why-card">
            <div className="why-card-icon"><i className="fa-solid fa-compass" aria-hidden="true"></i></div>
            <div className="why-card-body">
              <h4>Built for Multi-Tank Environments</h4>
              <p>Manage dozens of tanks from a single dashboard with per-tank configuration.</p>
            </div>
          </div>

          <div className="why-card">
            <div className="why-card-icon"><i className="fa-solid fa-plug" aria-hidden="true"></i></div>
            <div className="why-card-body">
              <h4>Plug-and-Play Simplicity</h4>
              <p>Quick setup with minimal wiring and automatic device discovery for fast deployment.</p>
            </div>
          </div>

          <div className="why-card">
            <div className="why-card-icon"><i className="fa-solid fa-sliders" aria-hidden="true"></i></div>
            <div className="why-card-body">
              <h4>Customizable Thresholds</h4>
              <p>Fine-tune alerts per species so each tank keeps ideal water conditions.</p>
            </div>
          </div>


          

          <div className="why-card">
            <div className="why-card-icon"><i className="fa-solid fa-money-bill-wave" aria-hidden="true"></i></div>
            <div className="why-card-body">
              <h4>Cost-Effective</h4>
              <p>Designed to reduce losses while keeping hardware and operational costs low.</p>
            </div>
          </div>

          <div className="why-card">
            <div className="why-card-icon"><i className="fa-solid fa-seedling" aria-hidden="true"></i></div>
            <div className="why-card-body">
              <h4>Scalable & Future-Ready</h4>
              <p>Easily expand with more tanks and sensors without replacing existing devices.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer" id="contacts">
        <div className="footer-inner">
          <div className="footer-brand-block">
            <div className="footer-brand-name">G.U.A.R.D</div>
            <p>
              General Unit for Aquatic Risk Detection helps protect aquarium health
              with smart monitoring, alerts, and automation.
            </p>
          </div>

          <div className="footer-links-block">
            <h3>Quick Links</h3>
            <a href="#about">About</a>
            <a href="#services">Services</a>
            <a href="#problems">Problems</a>
            <a href="#cta">Call to action</a>
          </div>

          <div className="footer-contact-block">
            <h3>Contact</h3>
            <p>Email: guardyp26@gmail.com</p>
            <p>Phone: +94 70 000 0000</p>
            <p>Location: Sri Lanka</p>
          </div>
        </div>

        <div className="footer-divider" />

        <div className="footer-content">
          <p>&copy; {new Date().getFullYear()} G.U.A.R.D. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
