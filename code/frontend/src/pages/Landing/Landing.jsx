import { Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Reveal, ScrollProgress } from '../../utils/animations';
import { deviceRequestApi } from '../../services/api';
// landing.css migrated to Tailwind below. All original color palettes, backgrounds & card hover animations faithfully restored and elevated.
import PublicNav from '../../components/PublicNav';
import '../../styles/navigation.css';

import cloudImg    from '../../assets/Image-1.png';
import dashboardImg from '../../assets/Image-2.png';
import waterImg    from '../../assets/Image-3.png';
import feedingImg  from '../../assets/Image-4.jpg';
import bgProblemImg from '../../assets/Image-5.jpg';
import shieldImg   from '../../assets/Image.png';
import productVideo from '../../assets/Device_intro.mp4';

/* ── Floating particles in hero ── */
function HeroParticles() {
  const particles = Array.from({ length: 18 }, (_, i) => i);
  return (
    <div className="hero-particles absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {particles.map((i) => (
        <span
          key={i}
          className="hero-particle absolute rounded-full bg-sky-400"
          style={{
            left:              `${Math.random() * 100}%`,
            animationDelay:    `${(i * 0.4).toFixed(1)}s`,
            animationDuration: `${6 + (i % 5)}s`,
            width:             `${4 + (i % 4) * 3}px`,
            height:            `${4 + (i % 4) * 3}px`,
            opacity:           0.12 + (i % 4) * 0.06,
          }}
        />
      ))}
    </div>
  );
}
const MOBILE_APP = { to: '/mobile-download', label: 'Download Mobile App' };

/* Download glyph matching the blue app-icon artwork: bars, arrow and tray with a partial progress ring */
function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mobile-app-btn-icon-svg" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="46 17"
        strokeDashoffset="-8"
      />
      <path d="M9 6h6M9 8.4h6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 9.6v6.4m0 0-3-3m3 3 3-3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M7.5 18.4h9" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* ── Shared dark-section input style ── */
const DARK_INPUT = 'w-full bg-white/[0.05] border border-white/10 text-white rounded-lg px-4 py-[0.65rem] text-[0.95rem] outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20 transition-all placeholder:text-slate-500';

export default function Landing() {
  const { user } = useAuth();
  const location = useLocation();
  const [pageReady, setPageReady] = useState(false);
  const [orderForm, setOrderForm] = useState({
    name: '', email: '', contactNo: '', numberOfDevices: 1, notes: ''
  });
  const [orderBusy,        setOrderBusy]        = useState(false);
  const [orderSuccess,     setOrderSuccess]     = useState(false);
  const [orderError,       setOrderError]       = useState('');
  const [showOrderModal,   setShowOrderModal]   = useState(false);

  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowOrderModal(false);
      }
    }
    if (showOrderModal) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOrderModal]);

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    setOrderBusy(true); setOrderError('');
    try {
      await deviceRequestApi.create(orderForm);
      setOrderSuccess(true);
    } catch (err) {
      setOrderError(err.message || 'Failed to submit request.');
    } finally {
      setOrderBusy(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setPageReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (location.hash === '#contacts') {
      document.getElementById('contacts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  return (
    <div
      className={`font-sans text-[#1e293b] bg-white min-h-screen flex flex-col ${pageReady ? 'page-ready' : 'page-loading'}`}
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* Custom Keyframe Animations */}
      <style>{`
        @keyframes float-particle {
          0%   { transform: translateY(0) scale(1); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(-100vh) scale(0.6); opacity: 0; }
        }
        .hero-particle { animation: float-particle linear infinite; }

        .page-loading { opacity: 0; }
        .page-ready   { opacity: 1; transition: opacity 0.5s ease; }

        .hero-content-animated  { animation: reveal-up 0.7s 0.1s both; }
        .hero-title-animated    { animation: reveal-up 0.7s 0.2s both; }
        .hero-sub-animated      { animation: reveal-up 0.7s 0.35s both; }
        .hero-actions-animated  { animation: reveal-up 0.7s 0.5s both; }
        @keyframes reveal-up {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes scroll-bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(10px); }
        }
        .hero-scroll-indicator {
          position: absolute; bottom: 2rem; left: 50%; transform: translateX(-50%);
        }
        .hero-scroll-dot {
          display: block; width: 28px; height: 48px; border: 2px solid rgba(255,255,255,0.4);
          border-radius: 14px; position: relative; animation: scroll-bounce 1.8s ease-in-out infinite;
        }
        .hero-scroll-dot::after {
          content: ''; display: block; width: 6px; height: 6px; background: #fff;
          border-radius: 50%; position: absolute; left: 50%; top: 6px; transform: translateX(-50%);
        }
      `}</style>

      <ScrollProgress />
      <PublicNav />

      {/* ── 1. Hero ── */}
      <section
        className="relative flex items-center justify-center min-h-[85vh] bg-[#0d1627] text-white text-center py-32 px-6 overflow-hidden"
        id="cta"
      >
        <HeroParticles />
        <div className="hero-content hero-content-animated relative z-10 max-w-[750px] mx-auto px-4">
          <h1 className="hero-title-animated text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-4 tracking-tight">
            Monitor. Analyze. Protect.
          </h1>
          <p className="hero-sub-animated text-lg sm:text-xl md:text-2xl text-[#e2e8f0] mb-10 max-w-[550px] mx-auto leading-relaxed">
            Let Your Fish Thrive with Smart Water, Zero Stress.
          </p>
          <div className="hero-actions hero-actions-animated flex gap-4 justify-center flex-wrap">
            {user ? (
              <Link
                to="/dashboard"
                className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-8 py-3 rounded-[20px] font-semibold text-base no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(2,132,199,0.25)] active:translate-y-0 active:scale-[0.995]"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-8 py-3 rounded-[20px] font-semibold text-base no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(2,132,199,0.25)] active:translate-y-0 active:scale-[0.995]"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-white text-[#0f172a] hover:bg-[#f1f5f9] hover:text-[#0284c7] px-8 py-3 rounded-[20px] font-semibold text-base no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(2,132,199,0.12)] active:translate-y-0 active:scale-[0.995]"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
          <div className="hero-mobile-app-cta hero-actions-animated">
            <Link to={MOBILE_APP.to} className="mobile-app-btn">
              <span className="mobile-app-btn-icon" aria-hidden="true">
                <DownloadIcon />
              </span>
              <span className="mobile-app-btn-label">{MOBILE_APP.label}</span>
            </Link>
          </div>
        </div>
        <div className="hero-scroll-indicator" aria-hidden="true">
          <span className="hero-scroll-dot" />
        </div>
      </section>

      {/* ── 2. Problems ── */}
      <section className="relative py-20 px-6 md:px-16 overflow-hidden" id="problems">
        {/* Background Image & Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
          style={{ backgroundImage: `url(${bgProblemImg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(3,18,26,0.65)] to-[rgba(3,18,26,0.75)] z-0" />

        <div className="relative z-10 max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-stretch">
          <Reveal direction="left">
            <div className="text-white py-4">
              <span className="text-[#7cc6e8] text-2xl md:text-3xl font-bold tracking-widest uppercase mb-4 block">
                Problems to solve
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4 max-w-[20ch]">
                What needs attention in a multi-tank aquarium environment?
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-3 align-content-center">
            {[
              { title: 'Operational gaps', text: 'Managing multiple tanks with species-specific needs is harder. Manual testing is reactive, time consuming and sometimes not accurate.', h3: true },
              { title: 'Invisible Threats', text: 'Critical water parameters change invisibly.' },
              { title: 'Financial Impact', text: 'High financial loss from premium fish mortality - e.g., Arowana.' },
              { title: 'Trust', text: 'Loss of customer trust and reputation.' },
            ].map((card, i) => (
              <Reveal key={card.title} direction="right" delay={i * 100}>
                <div className="bg-transparent text-white border-3 border-white/20 rounded-[14px] p-5 shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition-all duration-200 hover:bg-[#0b3658] hover:border-[rgba(3,27,59,0.40)] hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgb(7,32,61)] group cursor-pointer">
                  {card.h3 ? (
                    <h3 className="text-xl font-bold mb-1.5 leading-snug group-hover:text-white">{card.title}</h3>
                  ) : (
                    <h4 className="text-xl font-bold mb-1.5 leading-snug group-hover:text-white">{card.title}</h4>
                  )}
                  <p className="text-[#cbd5e1] text-sm md:text-[0.92rem] leading-relaxed group-hover:text-white/90 m-0">
                    {card.text}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. About ── */}
      <section className="bg-[#f0f7fb] py-24 px-6 md:px-16" id="about">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center gap-12 md:gap-16">
          <Reveal direction="left" className="flex-1">
            <div>
              <span className="text-5xl md:text-6xl font-bold text-[#046998] mb-2 block">
                G.U.A.R.D.
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-[#1e293b] mb-6 leading-tight">
                General Unit for Aquatic Risk Detection.
              </h2>
              <p className="text-[#334155] text-base leading-relaxed mb-4">
                GUARD is a modular, IoT-based aquarium monitoring and safety system
                designed specifically for multi-tank pet shop environments.
              </p>
              <p className="text-[#334155] text-base leading-relaxed mb-6">
                In simple terms, it is a smart monitoring system that continuously
                checks water conditions in aquarium tanks and alerts vendors before fish are harmed.
              </p>
              <div className="inline-block bg-black text-white px-3 py-1 rounded font-bold text-xs tracking-wider">
                IOT
              </div>
            </div>
          </Reveal>
          <Reveal direction="right" className="flex-1 w-full">
            <div className="bg-[#1e293b] rounded-xl p-8 flex items-center justify-center min-h-[300px] shadow-xl">
              <img src={shieldImg} alt="GUARD Shield" className="max-w-[220px] object-contain" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 4. Features ── */}
      <section className="bg-[#0d1627] py-20 px-6 md:px-16" id="services">
        <div className="max-w-[1200px] mx-auto">
          <Reveal>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-12">
              Exciting Features
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { src: cloudImg,     alt: 'Centralized Intelligence', title: 'Centralized Intelligence', desc: 'Alert & notification system, Local LED indicators for an emergency situations' },
              { src: dashboardImg, alt: 'Real time Dashboard', title: 'Real time & Historical Dashboard', desc: 'Vendors can monitor their entire aquarium status in a single dashboard in real time based on the measured water parameters.' },
              { src: waterImg,     alt: 'Water pump circulation', title: 'Water pump circulation & optional water change control.', desc: 'Keep water moving safely with automated circulation and optional water change control.' },
              { src: feedingImg,   alt: 'Automated feeding', title: 'Automated feeding', desc: 'Use the dedicated feeder to schedule and deliver food reliably for each tank.' },
            ].map((f, i) => (
              <Reveal key={f.title} direction="scale" delay={i * 100}>
                <div className="bg-[#d6eaf5] rounded-xl overflow-hidden shadow-md flex flex-col transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(2,6,23,0.12)] group">
                  <div className="h-[200px] overflow-hidden">
                    <img
                      src={f.src}
                      alt={f.alt}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-106"
                    />
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-[#0f172a] mb-3">{f.title}</h3>
                    <p className="text-[#64748b] text-sm leading-relaxed m-0">{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Product Video ── */}
      <section className="relative min-h-[85vh] overflow-hidden flex items-center justify-center py-24 px-6 bg-[#0d1627]">
        <video className="absolute inset-0 w-full h-full object-cover object-center" autoPlay muted loop playsInline>
          <source src={productVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(13,22,39,0.45)] to-[rgba(13,22,39,0.70)]" />
        <Reveal className="relative z-10">
          <div className="max-w-[900px] mx-auto text-center text-white px-4">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-4">G.U.A.R.D.</h2>
            <p className="text-xl md:text-2xl text-[#e2e8f0] max-w-2xl mx-auto m-0">Experience the future of aquarium care</p>
          </div>
        </Reveal>
      </section>

      {/* ── 6. Why Choose Us ── */}
      <section className="bg-white py-24 px-6 md:px-16 text-center">
        <Reveal>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#0f172a] mb-12 tracking-tight uppercase">
            WHY CHOOSE GUARD ?
          </h2>
        </Reveal>
        <div className="max-w-[1300px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
          {[
            { icon: 'fa-cog', title: 'Smart Closed-Loop Protection', desc: 'Monitors water conditions and automatically triggers corrective actions to prevent losses.' },
            { icon: 'fa-compass', title: 'Built for Multi-Tank Environments', desc: 'Manage dozens of tanks from a single dashboard with per-tank configuration.' },
            { icon: 'fa-plug', title: 'Plug-and-Play Simplicity', desc: 'Quick setup with minimal wiring and automatic device discovery for fast deployment.' },
            { icon: 'fa-sliders', title: 'Customizable Thresholds', desc: 'Fine-tune alerts per species so each tank keeps ideal water conditions.' },
            { icon: 'fa-money-bill-wave', title: 'Cost-Effective', desc: 'Designed to reduce losses while keeping hardware and operational costs low.' },
            { icon: 'fa-seedling', title: 'Scalable & Future-Ready', desc: 'Easily expand with more tanks and sensors without replacing existing devices.' },
          ].map((w, i) => (
            <Reveal key={w.title} direction="up" delay={i * 80}>
              <div className="bg-[#0b3658] text-white rounded-xl p-5 flex items-start gap-4 shadow-[0_6px_18px_rgba(3,37,65,0.12)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_30px_rgba(3,37,65,0.18)] hover:brightness-105 cursor-pointer group">
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center text-xl transition-colors duration-200 group-hover:bg-white/15">
                  <i className={`fa-solid ${w.icon} text-white/90 group-hover:text-[#7cc6e8] transition-colors duration-200`} aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-base md:text-lg font-bold mb-1 text-white group-hover:text-white m-0">{w.title}</h4>
                  <p className="text-white/90 text-sm leading-snug m-0">{w.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── 7. How It Works ── */}
      <section className="bg-[#c8e5f1] py-24 px-6 md:px-16 text-center" id="how-it-works">
        <div className="max-w-[1200px] mx-auto">
          <Reveal>
            <div>
              <span className="text-[#37a8e9] text-lg font-bold tracking-widest uppercase block mb-1.5">
                EASY STEPS
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#0f172a] mb-12">
                HOW TO CONNECT
              </h2>
            </div>
          </Reveal>

          <div className="relative max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Connecting line on desktop */}
            <div className="hidden lg:block absolute top-[44px] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-[rgba(124,183,216,0.15)] via-[rgba(124,183,216,0.65)] to-[rgba(124,183,216,0.15)] z-0" />

            {[
              'Get Your Registered Device',
              'Connect to the Wifi',
              'Login using the Registered User Logins',
              'Monitor your Aquarium',
            ].map((step, i) => (
              <Reveal key={step} direction="up" delay={i * 130}>
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="w-[92px] h-[92px] rounded-full border-3 border-[#8db9d3] bg-white text-[#0b3658] text-3xl font-extrabold flex items-center justify-center shadow-[0_10px_24px_rgba(11,54,88,0.08)] mb-2">
                    {i + 1}
                  </div>
                  <h3 className="text-base font-bold text-[#1e293b] leading-snug m-0">{step}</h3>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Order Section ── */}
      <section className="bg-[#0d1627] text-white py-24 px-6 md:px-16" id="order">
        <div ref={containerRef} className="max-w-[600px] mx-auto text-center relative">
          <Reveal>
            <div className="mb-8">
              <span className="text-[#7cc6e8] text-3xl md:text-4xl font-bold block mb-2">Order GUARD</span>
              <h2 className="text-3xl md:text-4xl font-extrabold mt-2 text-white">Bring Smart Protection to Your Aquarium</h2>
              <p className="text-[#cbd5e1] mt-3 text-lg max-w-[600px] mx-auto mb-8 leading-relaxed">
                Join other aquarium owners who use GUARD to automate monitoring and protect their aquatic life from sudden water changes.
              </p>
              <button
                onClick={() => setShowOrderModal(!showOrderModal)}
                className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-xl font-bold px-10 py-4 rounded-full border-none cursor-pointer shadow-[0_8px_20px_rgba(14,165,233,0.3)] transition-all duration-300 hover:scale-105 inline-block"
              >
                {showOrderModal ? 'Close Request Form' : 'Get Started with GUARD'}
              </button>
            </div>
          </Reveal>

          {/* Expanding Card */}
          <div style={{ maxHeight: showOrderModal ? '1200px' : '0px', opacity: showOrderModal ? 1 : 0, overflow: 'hidden', transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)', textAlign: 'left', marginTop: '1.5rem' }}>
            <div className="bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08] rounded-[24px] p-8 md:p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] text-white">
              <div className="text-center mb-8">
                <h3 className="text-2xl md:text-3xl font-extrabold m-0 text-white">Get Started with GUARD</h3>
                <p className="text-[#cbd5e1] mt-2 text-sm md:text-base">
                  Fill out the form below to request GUARD devices for your aquarium ecosystem.
                </p>
              </div>

              {orderSuccess ? (
                <div className="text-center py-6">
                  <div className="text-5xl text-green-400 mb-4">✓</div>
                  <h3 className="text-2xl mb-2 text-white">Request Submitted!</h3>
                  <p className="text-slate-400">
                    Thank you for your interest. We will contact you soon to finalize your order.
                  </p>
                  <button
                    type="button"
                    className="mt-6 border border-white/20 text-white hover:bg-white/10 px-6 py-2 rounded.lg font-semibold transition-colors"
                    onClick={() => {
                      setOrderSuccess(false);
                      setOrderForm({ name: '', email: '', contactNo: '', numberOfDevices: 1, notes: '' });
                    }}
                  >
                    Submit Another Request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleOrderSubmit} className="flex flex-col gap-5">
                  {orderError && <p className="text-red-400 text-sm font-semibold m-0">{orderError}</p>}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[#cbd5e1] text-sm font-semibold">Full Name *</label>
                    <input
                      type="text"
                      className={DARK_INPUT}
                      value={orderForm.name}
                      onChange={(e) => setOrderForm({ ...orderForm, name: e.target.value })}
                      required
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[#cbd5e1] text-sm font-semibold">Email Address *</label>
                    <input
                      type="email"
                      className={DARK_INPUT}
                      value={orderForm.email}
                      onChange={(e) => setOrderForm({ ...orderForm, email: e.target.value })}
                      required
                      placeholder="john@example.com"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[#cbd5e1] text-sm font-semibold">Contact Number *</label>
                    <input
                      type="text"
                      className={DARK_INPUT}
                      value={orderForm.contactNo}
                      onChange={(e) => setOrderForm({ ...orderForm, contactNo: e.target.value })}
                      required
                      placeholder="+94 77 123 4567"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[#cbd5e1] text-sm font-semibold">Number of Devices Needed * (Max 20)</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      className={DARK_INPUT}
                      value={orderForm.numberOfDevices}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setOrderForm({ ...orderForm, numberOfDevices: val > 20 ? 20 : val < 1 ? 1 : val || '' });
                      }}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[#cbd5e1] text-sm font-semibold">Special Notes / Requirements</label>
                    <textarea
                      rows="3"
                      className={`${DARK_INPUT} resize-y`}
                      value={orderForm.notes}
                      onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                      placeholder="Tell us about your setup (number of tanks, species, etc.)"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold py-3.5 rounded-lg border-none cursor-pointer mt-2 text-base transition-colors disabled:opacity-60"
                    disabled={orderBusy}
                  >
                    {orderBusy ? 'Submitting...' : 'Submit Request'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. Footer ── */}
      <footer className="bg-[#0d1627] text-white border-t border-white/10 pt-16 pb-8 px-6 md:px-16" id="contacts">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr] gap-10 mb-12">
          <div>
            <div className="text-2xl font-extrabold text-[#7cc6e8] tracking-wider mb-4">G.U.A.R.D</div>
            <p className="text-[#cbd5e1] text-sm leading-relaxed m-0 max-w-[360px]">
              General Unit for Aquatic Risk Detection helps protect aquarium health
              with smart monitoring, alerts, and automation.
            </p>
          </div>

          <div>
            <h3 className="text-base font-bold text-white mb-4">Quick Links</h3>
            <div className="flex flex-col gap-2">
              <a href="#about" className="text-[#cbd5e1] hover:text-[#7cc6e8] text-sm no-underline transition-colors">About</a>
              <a href="#services" className="text-[#cbd5e1] hover:text-[#7cc6e8] text-sm no-underline transition-colors">Services</a>
              <a href="#problems" className="text-[#cbd5e1] hover:text-[#7cc6e8] text-sm no-underline transition-colors">Problems</a>
              <a href="#cta" className="text-[#cbd5e1] hover:text-[#7cc6e8] text-sm no-underline transition-colors">Call to action</a>
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-white mb-4">Contact</h3>
            <p className="text-[#cbd5e1] text-sm mb-1.5 m-0">Email: guardyp26@gmail.com</p>
            <p className="text-[#cbd5e1] text-sm mb-1.5 m-0">Phone: +94 70 000 0000</p>
            <p className="text-[#cbd5e1] text-sm m-0">Location: Sri Lanka</p>
          </div>
        </div>

        <div className="border-t border-white/10 max-w-[1100px] mx-auto pt-6 text-center text-slate-400 text-sm">
          <p className="m-0">&copy; {new Date().getFullYear()} G.U.A.R.D. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
