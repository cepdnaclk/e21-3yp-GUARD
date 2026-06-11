import { Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Reveal, ScrollProgress } from '../../utils/animations';
import { deviceRequestApi } from '../../services/api';
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
  const [orderForm, setOrderForm] = useState({
    name: '',
    email: '',
    contactNo: '',
    numberOfDevices: 1,
    notes: ''
  });
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);

  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowOrderModal(false);
      }
    }
    if (showOrderModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOrderModal]);

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    setOrderBusy(true);
    setOrderError('');
    try {
      await deviceRequestApi.create(orderForm);
      setOrderSuccess(true);
    } catch (err) {
      setOrderError(err.message || 'Failed to submit request.');
    } finally {
      setOrderBusy(false);
    }
  };

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
              { src: waterImg, alt: 'Water pump circulation', title: 'Water pump circulation & optional water change control.', desc: 'Keep water moving safely with automated circulation and optional water change control.' },
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

      {/* ── Order Section ── */}
      <section className="landing-order" id="order" style={{ padding: '6rem 4rem', background: 'var(--c-0d1627)', color: '#fff' }}>
        <div ref={containerRef} style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <Reveal>
            <div style={{ marginBottom: '2rem' }}>
              <span className="section-eyebrow" style={{ fontSize: '2.5rem', color: '#7cc6e8', fontWeight: 'bold' }}>Order GUARD</span>
              <h2 style={{ fontSize: '2.5rem', marginTop: '0.5rem', fontWeight: 800 }}>Bring Smart Protection to Your Aquarium</h2>
              <p style={{ color: '#cbd5e1', marginTop: '0.5rem', fontSize: '1.1rem', maxWidth: '600px', margin: '0.5rem auto 2rem' }}>
                Join other aquarium owners who use GUARD to automate monitoring and protect their aquatic life from sudden water changes.
              </p>
              
              <button
                onClick={() => setShowOrderModal(!showOrderModal)}
                className="btn btn-primary"
                style={{
                  background: 'var(--c-0ea5e9)',
                  color: '#fff',
                  fontSize: '1.2rem',
                  padding: '1rem 2.5rem',
                  borderRadius: '30px',
                  fontWeight: '700',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(14, 165, 233, 0.3)',
                  transition: 'all 0.3s ease',
                  width: 'fit-content',
                  display: 'inline-block'
                }}
              >
                {showOrderModal ? 'Close Request Form' : 'Get Started with GUARD'}
              </button>
            </div>
          </Reveal>

          {/* Expanding Card */}
          <div style={{
            maxHeight: showOrderModal ? '1200px' : '0px',
            opacity: showOrderModal ? 1 : 0,
            overflow: 'hidden',
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            textAlign: 'left',
            marginTop: '1.5rem'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '24px',
              padding: '2.5rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              color: '#fff'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Get Started with GUARD</h3>
                <p style={{ color: '#cbd5e1', marginTop: '0.5rem', fontSize: '0.95rem' }}>
                  Fill out the form below to request GUARD devices for your aquarium ecosystem.
                </p>
              </div>

              {orderSuccess ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div style={{ fontSize: '3.5rem', color: 'var(--c-22c55e)', marginBottom: '1rem' }}>✓</div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Request Submitted!</h3>
                  <p style={{ color: '#94a3b8' }}>
                    Thank you for your interest. We will contact you soon to finalize your order.
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ marginTop: '1.5rem', color: '#fff', borderColor: 'rgba(255,255,255,0.2)', width: 'fit-content', display: 'inline-block' }}
                    onClick={() => {
                      setOrderSuccess(false);
                      setOrderForm({ name: '', email: '', contactNo: '', numberOfDevices: 1, notes: '' });
                    }}
                  >
                    Submit Another Request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleOrderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {orderError && <p className="error-msg" style={{ margin: 0 }}>{orderError}</p>}
                  
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 600 }}>Full Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                      value={orderForm.name}
                      onChange={(e) => setOrderForm({ ...orderForm, name: e.target.value })}
                      required
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 600 }}>Email Address *</label>
                    <input
                      type="email"
                      className="form-input"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                      value={orderForm.email}
                      onChange={(e) => setOrderForm({ ...orderForm, email: e.target.value })}
                      required
                      placeholder="john@example.com"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 600 }}>Contact Number *</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                      value={orderForm.contactNo}
                      onChange={(e) => setOrderForm({ ...orderForm, contactNo: e.target.value })}
                      required
                      placeholder="+94 77 123 4567"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 600 }}>Number of Devices Needed * (Max 20)</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      className="form-input"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                      value={orderForm.numberOfDevices}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setOrderForm({ ...orderForm, numberOfDevices: val > 20 ? 20 : val < 1 ? 1 : val || '' });
                      }}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 600 }}>Special Notes / Requirements</label>
                    <textarea
                      rows="3"
                      className="form-input"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', width: '100%', padding: '0.6rem 0.75rem', fontFamily: 'inherit' }}
                      value={orderForm.notes}
                      onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                      placeholder="Tell us about your setup (number of tanks, species, etc.)"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={orderBusy}
                    style={{ background: 'var(--c-0ea5e9)', color: '#fff', marginTop: '0.5rem', width: '100%', borderRadius: '8px', fontWeight: 'bold' }}
                  >
                    {orderBusy ? 'Submitting...' : 'Submit Request'}
                  </button>
                </form>
              )}
            </div>
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
