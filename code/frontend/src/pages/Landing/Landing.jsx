import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Reveal, ScrollProgress } from '../../utils/animations';
import '../../styles/landing.css';
import PublicNav from '../../components/PublicNav';

import cloudImg from '../../assets/Image-1.png';
import dashboardImg from '../../assets/Image-2.png';
import waterImg from '../../assets/Image-3.png';
import feedingImg from '../../assets/Image-4.jpg';
import shieldImg from '../../assets/Image.png';
import productVideo from '../../assets/Device_intro.mp4';

/* ── Floating particles in hero ── */
function HeroParticles() {
  const particles = Array.from({ length: 18 }, (_, i) => i);
  return (
    <div className="hero-particles" aria-hidden="true">
      {particles.map((i) => (
        <span
          key={i}
          className="hero-particle"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${(i * 0.4).toFixed(1)}s`,
            animationDuration: `${6 + (i % 5)}s`,
            width: `${4 + (i % 4) * 3}px`,
            height: `${4 + (i % 4) * 3}px`,
            opacity: 0.12 + (i % 4) * 0.06,
          }}
        />
      ))}
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const location = useLocation();
  const [pageReady, setPageReady] = useState(false);

  /* Page-load fade-in */
  useEffect(() => {
    const t = setTimeout(() => setPageReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  /* Hash scroll */
  useEffect(() => {
    if (location.hash === '#contacts') {
      const footer = document.getElementById('contacts');
      footer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  return (
    <div className={`landing-page ${pageReady ? 'page-ready' : 'page-loading'}`}>
      <ScrollProgress />
      <PublicNav />

      {/* ── Hero ── */}
      <section className="landing-hero" id="cta">
        <HeroParticles />
        <div className="hero-content hero-content-animated">
          <h1 className="hero-title-animated">Monitor. Analyze. Protect.</h1>
          <p className="hero-sub-animated">Let Your Fish Thrive with Smart Water, Zero Stress.</p>
          <div className="hero-actions hero-actions-animated">
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
        <div className="hero-scroll-indicator" aria-hidden="true">
          <span className="hero-scroll-dot" />
        </div>
      </section>

      {/* ── Problems ── */}
      <section className="landing-problems" id="problems">
        <div className="problems-container">
          <Reveal direction="left">
            <div className="problems-copy">
              <span className="section-eyebrow">Problems to solve</span>
              <h2>What needs attention in a multi-tank aquarium environment?</h2>
            </div>
          </Reveal>

          <div className="problems-panel">
            {[
              { tag: 'h3', title: 'Operational gaps', text: 'Managing multiple tanks with species-specific needs is harder. Manual testing is reactive, time consuming and sometimes not accurate.', large: true },
              { tag: 'h4', title: 'Invisible Threats', text: 'Critical water parameters change invisibly.' },
              { tag: 'h4', title: 'Financial Impact', text: 'High financial loss from premium fish mortality - e.g., Arowana.' },
              { tag: 'h4', title: 'Trust', text: 'Loss of customer trust and reputation.' },
            ].map((card, i) => (
              <Reveal key={card.title} direction="right" delay={i * 100}>
                <div className={`problem-card${card.large ? ' problem-card-large' : ''}`}>
                  {card.tag === 'h3' ? <h3>{card.title}</h3> : <h4>{card.title}</h4>}
                  <p>{card.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section className="landing-about" id="about">
        <div className="about-content">
          <Reveal direction="left" className="about-text-wrapper">
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
          </Reveal>
          <Reveal direction="right" className="about-card-wrapper">
            <div className="about-icon-card">
              <div className="about-icon-shield">
                <img src={shieldImg} alt="GUARD Shield" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="landing-features" id="services">
        <div className="features-container">
          <Reveal>
            <h2>Exciting Features</h2>
          </Reveal>
          <div className="features-grid">
            {[
              { src: cloudImg, alt: 'Centralized Intelligence', title: 'Centralized Intelligence', desc: 'Alert & notification system, Local LED indicators for an emergency situations' },
              { src: dashboardImg, alt: 'Real time Dashboard', title: 'Real time & Historical Dashboard', desc: 'Vendors can monitor their entire aquarium status in a single dashboard in real time based on the measured water parameters.' },
              { src: waterImg, alt: 'Automated filtration', title: 'Automated filtration, circulation & optional water change control.', desc: 'Keep water moving safely with automated circulation and optional water change control.' },
              { src: feedingImg, alt: 'Automated feeding', title: 'Automated feeding', desc: 'Use the dedicated feeder to schedule and deliver food reliably for each tank.' },
            ].map((f, i) => (
              <Reveal key={f.title} direction="scale" delay={i * 100}>
                <div className="feature-card">
                  <div className="feature-image-wrapper">
                    <img src={f.src} alt={f.alt} />
                  </div>
                  <div className="feature-card-content">
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product Video ── */}
      <section className="landing-product-video">
        <video className="product-video-media" autoPlay muted loop playsInline>
          <source src={productVideo} type="video/mp4" />
        </video>
        <div className="product-video-overlay" />
        <Reveal className="video-content-wrapper">
          <div className="video-content">
            <h2>G.U.A.R.D.</h2>
            <p>Experience the future of aquarium care</p>
          </div>
        </Reveal>
      </section>

      {/* ── Why Choose Us ── */}
      <section className="landing-why-choose-us">
        <Reveal>
          <h2>WHY CHOOSE GUARD ?</h2>
        </Reveal>
        <div className="why-choose-us-grid">
          {[
            { icon: 'fa-cog', title: 'Smart Closed-Loop Protection', desc: 'Monitors water conditions and automatically triggers corrective actions to prevent losses.' },
            { icon: 'fa-compass', title: 'Built for Multi-Tank Environments', desc: 'Manage dozens of tanks from a single dashboard with per-tank configuration.' },
            { icon: 'fa-plug', title: 'Plug-and-Play Simplicity', desc: 'Quick setup with minimal wiring and automatic device discovery for fast deployment.' },
            { icon: 'fa-sliders', title: 'Customizable Thresholds', desc: 'Fine-tune alerts per species so each tank keeps ideal water conditions.' },
            { icon: 'fa-money-bill-wave', title: 'Cost-Effective', desc: 'Designed to reduce losses while keeping hardware and operational costs low.' },
            { icon: 'fa-seedling', title: 'Scalable & Future-Ready', desc: 'Easily expand with more tanks and sensors without replacing existing devices.' },
          ].map((w, i) => (
            <Reveal key={w.title} direction="up" delay={i * 80}>
              <div className="why-card">
                <div className="why-card-icon"><i className={`fa-solid ${w.icon}`} aria-hidden="true"></i></div>
                <div className="why-card-body">
                  <h4>{w.title}</h4>
                  <p>{w.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="landing-how-it-works" id="how-it-works">
        <div className="how-it-works-container">
          <Reveal>
            <span className="section-eyebrow how-it-works-eyebrow">EASY STEPS</span>
            <h2>HOW TO CONNECT</h2>
          </Reveal>

          <div className="how-it-works-steps">
            {[
              'Get Your Registered Device',
              'Connect to the Wifi',
              'Login using the Registered User Logins',
              'Monitor your Aquarium',
            ].map((step, i) => (
              <Reveal key={step} direction="up" delay={i * 130}>
                <div className="how-step">
                  <div className="how-step-circle">{i + 1}</div>
                  <div className="how-step-content">
                    <h3>{step}</h3>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
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
