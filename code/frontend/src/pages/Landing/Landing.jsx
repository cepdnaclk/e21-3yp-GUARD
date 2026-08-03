import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Reveal, ScrollProgress } from '../../utils/animations';

import PublicNav from '../../components/PublicNav';
import '../../styles/navigation.css';

import mockupImg   from '../../assets/Mockup.png';
import mockupTankImg from '../../assets/mockup_tank.png';
import thresholdImg from '../../assets/Threshold_Compare_2to1.png';
import telemetryImg from '../../assets/Telemetry_Card.png';
import telegramAlertsImg from '../../assets/Telegram_Alerts_Simple.png';
import analyticsImg from '../../assets/Historical_Analytics.png';
import pumpFeederImg from '../../assets/Pump_Feeder_2to1.png';
import productVideo from '../../assets/Device_intro.mp4';

/* ── Floating water bubbles in hero ── */
const BUBBLE_PRESETS = [
  { left: '5%',  delay: '0s',    duration: '7s',   size: '14px' },
  { left: '12%', delay: '1.5s',  duration: '9s',   size: '22px' },
  { left: '20%', delay: '0.8s',  duration: '6s',   size: '10px' },
  { left: '28%', delay: '3.2s',  duration: '10s',  size: '18px' },
  { left: '35%', delay: '2.1s',  duration: '8s',   size: '12px' },
  { left: '42%', delay: '0.4s',  duration: '7.5s', size: '26px' },
  { left: '50%', delay: '4.0s',  duration: '11s',  size: '16px' },
  { left: '58%', delay: '1.1s',  duration: '6.5s', size: '20px' },
  { left: '66%', delay: '2.8s',  duration: '9.5s', size: '10px' },
  { left: '74%', delay: '0.2s',  duration: '8.5s', size: '24px' },
  { left: '82%', delay: '3.6s',  duration: '7s',   size: '14px' },
  { left: '90%', delay: '1.9s',  duration: '10.5s',size: '18px' },
  { left: '95%', delay: '4.5s',  duration: '8s',   size: '12px' },
];

function HeroParticles() {
  return (
    <div className="hero-particles absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {BUBBLE_PRESETS.map((b, i) => (
        <span
          key={i}
          className="hero-particle"
          style={{
            left: b.left,
            animationDelay: b.delay,
            animationDuration: b.duration,
            width: b.size,
            height: b.size,
          }}
        />
      ))}
    </div>
  );
}

/* ── Scroll-synced 3D mockup animation ── */
function ScrollSyncedMockup() {
  const containerRef = useRef(null);
  const [transformStyle, setTransformStyle] = useState({
    transform: 'perspective(1200px) rotateY(-8deg) rotateX(6deg) translateY(0px) scale(0.95)',
    opacity: 0.85,
  });

  useEffect(() => {
    let animationFrameId;

    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Progress ratio: 0 when element enters viewport bottom, 1 when near top
      const progress = Math.min(Math.max((windowHeight - rect.top) / (windowHeight + rect.height), 0), 1);

      // Interpolate 3D rotation, float translation, and slide left (translateX) synced with scroll
      const translateX = 60 - progress * 90;
      const rotateY = -10 + progress * 12;
      const rotateX = 6 - progress * 8;
      const translateY = 15 - progress * 35;
      const opacity = Math.min(progress * 2.2, 1);

      setTransformStyle({
        transform: `perspective(1200px) translateX(${translateX.toFixed(2)}px) translateY(${translateY.toFixed(2)}px) rotateY(${rotateY.toFixed(2)}deg) rotateX(${rotateX.toFixed(2)}deg) scale(1)`,
        opacity,
        transition: 'transform 0.15s ease-out, opacity 0.3s ease-out',
      });
    };

    const onScroll = () => {
      animationFrameId = requestAnimationFrame(handleScroll);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} className="flex-1 w-full flex items-center justify-center p-2 relative">
      <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/20 via-cyan-400/10 to-transparent rounded-3xl blur-3xl opacity-60 pointer-events-none" />
      <img
        src={mockupTankImg}
        alt="G.U.A.R.D System Mockup"
        className="w-full max-w-[560px] h-auto object-contain drop-shadow-[0_25px_60px_rgba(14,165,233,0.35)] relative z-10"
        style={transformStyle}
      />
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const location = useLocation();
  const [pageReady, setPageReady] = useState(false);

  /* ── Order G.U.A.R.D state & form handlers ── */
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState({
    name: '',
    email: '',
    contactNo: '',
    numberOfDevices: 1,
    notes: '',
  });
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderError, setOrderError] = useState('');

  const DARK_INPUT =
    'w-full bg-slate-950/90 border border-slate-700/80 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all font-sans text-sm';

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    setOrderError('');
    setOrderBusy(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setOrderSuccess(true);
    } catch (err) {
      setOrderError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setOrderBusy(false);
    }
  };

  const scrollToSection = (id) => (e) => {
    if (e) e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    window.history.pushState(null, '', `#${id}`);
  };

  useEffect(() => {
    const t = setTimeout(() => setPageReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const el = document.getElementById(targetId);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    }
  }, [location.hash]);

  return (
    <div
      className={`font-sans text-[#1e293b] bg-[#090e17] min-h-screen flex flex-col ${pageReady ? 'page-ready' : 'page-loading'}`}
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <PublicNav />
      {/* Custom Keyframe Animations */}
      <style>{`
        @keyframes rise-bubble {
          0% {
            transform: translateY(0) translateX(0) scale(0.6);
            opacity: 0;
          }
          15% {
            opacity: 0.35;
          }
          50% {
            transform: translateY(-45vh) translateX(15px) scale(1.1);
            opacity: 0.45;
          }
          85% {
            opacity: 0.35;
          }
          100% {
            transform: translateY(-90vh) translateX(-15px) scale(1.3);
            opacity: 0;
          }
        }

        .hero-particle {
          position: absolute;
          bottom: -30px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.5), rgba(56, 189, 248, 0.2) 60%, rgba(14, 165, 233, 0.03));
          border: 1px solid rgba(255, 255, 255, 0.25);
          box-shadow: 0 0 6px rgba(56, 189, 248, 0.25), inset 0 0 3px rgba(255, 255, 255, 0.4);
          animation: rise-bubble ease-in-out infinite;
          pointer-events: none;
        }

        .page-loading { opacity: 0; }
        .page-ready   { opacity: 1; transition: opacity 0.5s ease; }

        .hero-title-animated {
          animation: reveal-up 0.7s 0.2s both;
        }
        .hero-sub-animated {
          animation: reveal-up 0.7s 0.35s both;
        }
        .hero-actions-animated {
          animation: reveal-up 0.7s 0.5s both;
        }
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

      {/* ── 1. Hero ── */}
      <section
        className="relative flex items-center justify-center min-h-[88vh] bg-gradient-to-b from-[#090e17] via-[#0d172a] to-[#090e17] text-white text-center py-32 px-6 overflow-hidden"
      >
        <HeroParticles />
        <div className="relative z-10 max-w-[850px] mx-auto px-4">
          <div className="inline-block bg-sky-500/10 border border-sky-400/30 text-sky-300 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold tracking-wider uppercase mb-6 backdrop-blur-md">
            Next-Generation Smart IoT Aquarium Ecosystem
          </div>
          <h1 className="hero-title-animated text-4xl sm:text-6xl md:text-7xl font-extrabold leading-tight mb-6 tracking-tight">
            Monitor. Analyze.{' '}
            <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">
              Protect.
            </span>
          </h1>
          <p className="hero-sub-animated text-lg sm:text-xl md:text-2xl text-[#cbd5e1] mb-10 max-w-[650px] mx-auto leading-relaxed font-light">
            Let Your Aquatic Life Thrive with Real-Time Telemetry, Automated Protection, and Zero Stress.
          </p>
          <div className="hero-actions-animated flex gap-4 justify-center flex-wrap">
            {user ? (
              <Link
                to="/dashboard"
                className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white px-9 py-3.5 rounded-full font-bold text-base no-underline shadow-[0_10px_30px_rgba(14,165,233,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(14,165,233,0.5)] active:translate-y-0"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white px-9 py-3.5 rounded-full font-bold text-base no-underline shadow-[0_10px_30px_rgba(14,165,233,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(14,165,233,0.5)] active:translate-y-0"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/25 px-9 py-3.5 rounded-full font-bold text-base no-underline backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/40 active:translate-y-0"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-scroll-indicator" aria-hidden="true">
          <span className="hero-scroll-dot" />
        </div>
      </section>

      {/* ── 2. About System ── */}
      <section className="bg-gradient-to-b from-[#090e17] to-[#0d1627] py-24 px-6 md:px-16 overflow-hidden" id="about">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center gap-12 md:gap-16">
          <Reveal direction="left" className="flex-1">
            <div>
              <span className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent mb-2 block">
                G.U.A.R.D.
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 leading-tight">
                General Unit for Aquatic Risk Detection.
              </h2>
              <p className="text-[#cbd5e1] text-base md:text-lg leading-relaxed mb-4">
                GUARD is a modular, IoT-based aquarium monitoring and safety system designed specifically for multi-tank pet shops, hatcheries, and aquatic enthusiast environments.
              </p>
              <p className="text-[#94a3b8] text-base leading-relaxed mb-6">
                In simple terms, it is a smart 24/7 Guardian that continuously checks critical water parameters and alerts you instantly before fish are ever harmed.
              </p>
              <div className="inline-block bg-sky-500/20 border border-sky-400/40 text-sky-300 px-4 py-1.5 rounded-lg font-bold text-xs tracking-wider uppercase">
                IoT Powered • Closed-Loop Safety
              </div>
            </div>
          </Reveal>
          <ScrollSyncedMockup />
        </div>
      </section>

      {/* ── 3. Exciting Features ── */}
      <section className="bg-[#090e17] py-24 px-6 md:px-16" id="services">
        <div className="max-w-[1200px] mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <span className="text-sky-400 text-sm font-bold tracking-widest uppercase block mb-2">
                REVOLUTIONARY CAPABILITIES
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white">
                Exciting Features
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                src: telemetryImg,
                title: 'Real-Time Multi-Sensor Telemetry',
                desc: 'Continuous sampling of Temperature (°C), pH, TDS (ppm), Turbidity (NTU), and Water Level (cm) via connected ESP32 sensor node.'
              },
              {
                src: mockupImg,
                title: 'Centralized Multi-Tank Dashboard',
                desc: 'Monitor multiple aquarium tanks simultaneously in real time with status gauges and instant threshold status indicators.'
              },
              {
                src: pumpFeederImg,
                title: 'Automated Water Circulation & Feeding Control',
                desc: 'Automated relay control for water pump circulation and scheduled feeder control to maintain water quality and feeding routine.'
              },
              {
                src: thresholdImg,
                title: 'Species-Tuned Water Quality Thresholds',
                desc: 'Configurable safe parameter limits (Min/Max thresholds) customized specifically for different fish species to prevent physiological stress.'
              },
              {
                src: telegramAlertsImg,
                title: 'Instant Multi-Channel Alerts',
                desc: 'Instant automated Telegram bot messages and email notifications delivered directly to your devices the moment water parameters breach configured threshold limits.'
              },
              {
                src: analyticsImg,
                title: 'Historical Data Analytics',
                desc: 'Explore historical time-series water quality trends stored in InfluxDB with interactive charts and 1-click downloadable CSV reports.'
              },
            ].map((f, i) => (
              <Reveal key={f.title} direction="scale" delay={i * 80}>
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col h-full transition-all duration-300 hover:-translate-y-2 hover:border-sky-500/40 hover:shadow-[0_20px_40px_rgba(14,165,233,0.15)] group">
                  <div className="h-[190px] overflow-hidden bg-slate-950/50">
                    <img
                      src={f.src}
                      alt={f.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                    />
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2.5 group-hover:text-sky-400 transition-colors">
                        {f.title}
                      </h3>
                      <p className="text-slate-400 text-sm leading-relaxed m-0">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Product Showcase Video ── */}
      <section className="relative min-h-[80vh] overflow-hidden flex items-center justify-center py-24 px-6 bg-[#090e17]">
        <video className="absolute inset-0 w-full h-full object-cover object-center" autoPlay muted loop playsInline>
          <source src={productVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(9,14,23,0.7)] via-[rgba(9,14,23,0.5)] to-[rgba(9,14,23,0.85)]" />
        <Reveal className="relative z-10">
          <div className="max-w-[900px] mx-auto text-center text-white px-4">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-4 uppercase">
              WHY CHOOSE GUARD ?
            </h2>
            <p className="text-xl md:text-2xl text-[#e2e8f0] max-w-2xl mx-auto font-light">
              Experience the Future of Smart Aquarium Management
            </p>
          </div>
        </Reveal>
      </section>

      {/* ── 5. Why Choose G.U.A.R.D Cards ── */}
      <section className="bg-gradient-to-b from-[#090e17] to-[#0d1627] py-20 px-6 md:px-16">
        <div className="max-w-[1300px] mx-auto text-center">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left items-stretch">
            {[
              { icon: 'fa-cog', title: 'Smart Closed-Loop Protection', desc: 'Monitors water conditions and automatically triggers corrective relay actions to prevent fish mortality.' },
              { icon: 'fa-compass', title: 'Built for Multi-Tank Ecosystems', desc: 'Manage dozens of individual tanks seamlessly from a single dashboard with custom per-tank limits.' },
              { icon: 'fa-plug', title: 'Plug-and-Play Simplicity', desc: 'Fast setup with pre-calibrated sensors, minimal wiring, and instant device discovery.' },
              { icon: 'fa-sliders', title: 'Customizable Species Thresholds', desc: 'Fine-tune temperature, pH, TDS, and turbidity limits for specific fish species.' },
              { icon: 'fa-money-bill-wave', title: 'High ROI & Cost Effective', desc: 'Eliminates costly fish mortality while maintaining low hardware and operational costs.' },
              { icon: 'fa-seedling', title: 'Scalable & Future-Ready', desc: 'Expand easily with additional tanks and sensors without replacing existing hardware.' },
            ].map((w, i) => (
              <Reveal key={w.title} direction="up" delay={i * 80} className="h-full">
                <div className="bg-slate-900/90 border border-slate-800 text-white rounded-2xl p-6 flex flex-col justify-between h-full shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:border-sky-500/40 hover:shadow-[0_12px_30px_rgba(14,165,233,0.18)] cursor-pointer group">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-xl transition-colors duration-200 group-hover:bg-sky-500/20">
                      <i className={`fa-solid ${w.icon} text-sky-400 group-hover:text-cyan-300 transition-colors duration-200`} aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white group-hover:text-sky-300 transition-colors m-0 mb-1">
                        {w.title}
                      </h4>
                      <p className="text-slate-400 text-sm leading-relaxed m-0">
                        {w.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. How To Connect (Steps from Begin to End) ── */}
      <section className="bg-[#090e17] py-24 px-6 md:px-16 text-center" id="how-it-works">
        <div className="max-w-[1200px] mx-auto">
          <Reveal>
            <div>
              <span className="text-sky-400 text-sm font-bold tracking-widest uppercase block mb-2">
                BEGIN TO END SETUP
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-16">
                HOW TO CONNECT
              </h2>
            </div>
          </Reveal>

          <div className="relative max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Connecting line on desktop */}
            <div className="hidden lg:block absolute top-[44px] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-sky-500/10 via-sky-400/50 to-sky-500/10 z-0" />

            {[
              {
                step: '1',
                title: 'Mount Sensors & Hardware',
                desc: 'Attach G.U.A.R.D water quality sensors (Temp, pH, TDS, Turbidity) and connect pumps/feeder to your tank.'
              },
              {
                step: '2',
                title: 'Power Up & Connect Wi-Fi',
                desc: 'Turn on the smart IoT unit and connect it to your local 2.4GHz Wi-Fi network via the setup wizard.'
              },
              {
                step: '3',
                title: 'Register & Link Device',
                desc: 'Sign up on the G.U.A.R.D web/mobile app and claim your device using its unique product key.'
              },
              {
                step: '4',
                title: 'Live Telemetry & Protection',
                desc: 'Monitor live tank stats, configure custom species thresholds, and enjoy continuous automated protection.'
              },
            ].map((s, i) => (
              <Reveal key={s.step} direction="up" delay={i * 120}>
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="w-[88px] h-[88px] rounded-full border-2 border-sky-400 bg-slate-900 text-sky-400 text-3xl font-extrabold flex items-center justify-center shadow-[0_10px_25px_rgba(14,165,233,0.25)] mb-3">
                    {s.step}
                  </div>
                  <h3 className="text-lg font-bold text-white leading-snug m-0">{s.title}</h3>
                  <p className="text-slate-400 text-xs md:text-sm leading-relaxed m-0">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Call to Action / Order G.U.A.R.D Section ── */}
      <section className="bg-gradient-to-b from-[#090e17] via-[#0b1322] to-[#060911] text-white py-20 px-6 md:px-16 text-center relative overflow-hidden" id="order">
        <div className="absolute inset-0 bg-radial-gradient from-sky-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-[800px] mx-auto relative z-10">
          <Reveal direction="up">
            <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl border border-sky-500/20 rounded-3xl p-10 md:p-14 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
              <span className="text-xs font-bold uppercase tracking-widest text-sky-400 bg-sky-500/10 border border-sky-500/20 px-4 py-1.5 rounded-full inline-block mb-4">
                Deploy in Your Hatchery
              </span>
              <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight m-0">
                Ready to Automate Your Aquaculture?
              </h2>
              <p className="text-slate-300 mt-4 text-base md:text-lg max-w-[620px] mx-auto mb-8 leading-relaxed">
                Join commercial hatcheries &amp; aquarium operators using G.U.A.R.D to continuously monitor telemetry, eliminate water quality loss, and control actuators remotely.
              </p>
              <button
                onClick={() => setShowOrderModal(!showOrderModal)}
                className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-lg font-bold px-9 py-4 rounded-full border-none cursor-pointer shadow-[0_8px_25px_rgba(14,165,233,0.35)] transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
              >
                <span>{showOrderModal ? 'Close Request Form' : 'Get Started with G.U.A.R.D'}</span>
                <span className="text-xl">→</span>
              </button>

              {/* Expanding Order Request Card */}
              <div
                style={{
                  maxHeight: showOrderModal ? '1200px' : '0px',
                  opacity: showOrderModal ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  textAlign: 'left',
                  marginTop: showOrderModal ? '2rem' : '0',
                }}
              >
                <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 md:p-8 shadow-2xl text-white">
                  <div className="text-center mb-6">
                    <h3 className="text-xl md:text-2xl font-bold m-0 text-white">Order G.U.A.R.D Hardware Nodes</h3>
                    <p className="text-slate-400 mt-1.5 text-xs md:text-sm">
                      Submit your requirements below and our team will get in touch with a customized hardware quote &amp; deployment plan.
                    </p>
                  </div>

                  {orderSuccess ? (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-500/40">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <h3 className="text-xl font-bold mb-2 text-white">Request Submitted Successfully!</h3>
                      <p className="text-slate-400 text-sm max-w-[420px] mx-auto">
                        Thank you! Team 08 will review your requirements and reach out via email/phone shortly.
                      </p>
                      <button
                        type="button"
                        className="mt-5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                        onClick={() => {
                          setOrderSuccess(false);
                          setOrderForm({ name: '', email: '', contactNo: '', numberOfDevices: 1, notes: '' });
                        }}
                      >
                        Submit Another Request
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleOrderSubmit} className="flex flex-col gap-4">
                      {orderError && <p className="text-red-400 text-xs font-semibold m-0">{orderError}</p>}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-slate-300 text-xs font-semibold">Full Name *</label>
                          <input
                            type="text"
                            className={DARK_INPUT}
                            value={orderForm.name}
                            onChange={(e) => setOrderForm({ ...orderForm, name: e.target.value })}
                            required
                            placeholder="John Doe"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-slate-300 text-xs font-semibold">Email Address *</label>
                          <input
                            type="email"
                            className={DARK_INPUT}
                            value={orderForm.email}
                            onChange={(e) => setOrderForm({ ...orderForm, email: e.target.value })}
                            required
                            placeholder="john@example.com"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-slate-300 text-xs font-semibold">Contact Number *</label>
                          <input
                            type="text"
                            className={DARK_INPUT}
                            value={orderForm.contactNo}
                            onChange={(e) => setOrderForm({ ...orderForm, contactNo: e.target.value })}
                            required
                            placeholder="+94 77 123 4567"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-slate-300 text-xs font-semibold">Number of Devices Needed * (Max 20)</label>
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
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-slate-300 text-xs font-semibold">Special Notes / Requirements</label>
                        <textarea
                          rows="3"
                          className={`${DARK_INPUT} resize-y`}
                          value={orderForm.notes}
                          onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                          placeholder="Tell us about your aquarium / hatchery setup (number of tanks, target species, actuator preferences, etc.)"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold py-3.5 rounded-lg border-none cursor-pointer mt-2 text-sm md:text-base transition-all shadow-lg disabled:opacity-60"
                        disabled={orderBusy}
                      >
                        {orderBusy ? 'Submitting Request...' : 'Submit Hardware Request'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 8. Footer ── */}
      <footer className="bg-[#060911] text-white border-t border-slate-800 pt-16 pb-8 px-6 md:px-16" id="contacts">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1.1fr_1fr] gap-8 mb-12">
          <div>
            <div className="text-2xl font-extrabold bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent tracking-wider mb-4">
              G.U.A.R.D
            </div>
            <p className="text-slate-400 text-sm leading-relaxed m-0 max-w-[360px]">
              General Unit for Aquatic Risk Detection helps protect aquarium health with smart monitoring, instant alerts, and automated protection.
            </p>
          </div>

          <div>
            <h3 className="text-base font-bold text-white mb-4">Quick Links</h3>
            <div className="flex flex-col gap-2.5">
              <Link to="/about" className="text-slate-400 hover:text-sky-400 text-sm no-underline transition-colors">
                About System
              </Link>
              <a
                href="#services"
                onClick={scrollToSection('services')}
                className="text-slate-400 hover:text-sky-400 text-sm no-underline transition-colors cursor-pointer"
              >
                Exciting Features
              </a>
              <a
                href="#how-it-works"
                onClick={scrollToSection('how-it-works')}
                className="text-slate-400 hover:text-sky-400 text-sm no-underline transition-colors cursor-pointer"
              >
                How to Connect
              </a>
              <a
                href="#order"
                onClick={scrollToSection('order')}
                className="text-slate-400 hover:text-sky-400 text-sm no-underline transition-colors cursor-pointer"
              >
                Order G.U.A.R.D
              </a>
              <a
                href="https://cepdnaclk.github.io/e21-3yp-GUARD/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-cyan-300 font-semibold text-sm no-underline transition-colors flex items-center gap-1.5"
              >
                GitHub Pages)↗
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-white mb-4">Downloads</h3>
            <div className="flex flex-col gap-2.5">
              <a
                href="https://drive.google.com/uc?export=download&id=1JOS3uGWiJEPekHrz9HF-d42750VWIrLt"
                target="_blank"
                rel="noopener noreferrer"
                download
                className="text-slate-400 hover:text-sky-400 text-sm no-underline transition-colors flex items-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>User Manual (Hardware)</span>
              </a>
              <a
                href="https://drive.google.com/uc?export=download&id=1pJbCoCFuLEz7tZp47iNzlGxMiktU6Fu-"
                target="_blank"
                rel="noopener noreferrer"
                download
                className="text-slate-400 hover:text-sky-400 text-sm no-underline transition-colors flex items-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>User Manual (Software)</span>
              </a>
              <a
                href="https://drive.google.com/uc?export=download&id=1pJbCoCFuLEz7tZp47iNzlGxMiktU6Fu-"
                target="_blank"
                rel="noopener noreferrer"
                download
                className="text-slate-400 hover:text-sky-400 text-sm no-underline transition-colors flex items-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Quick Start Guide</span>
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-white mb-4">Contact Us</h3>
            <p className="text-slate-400 text-sm mb-2 select-text">
              Email:{' '}
              <a
                href="mailto:guardyp26@gmail.com"
                className="text-sky-400 hover:underline font-medium select-text"
              >
                guardyp26@gmail.com
              </a>
            </p>
            <p className="text-slate-400 text-sm mb-2 select-text">Phone: +94 70 195 0219</p>
            <p className="text-slate-400 text-sm select-text">Location: Sri Lanka</p>
          </div>
        </div>

        <div className="border-t border-slate-800/80 max-w-[1100px] mx-auto pt-6 text-center text-slate-500 text-sm">
          <p className="m-0">&copy; {new Date().getFullYear()} G.U.A.R.D. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
