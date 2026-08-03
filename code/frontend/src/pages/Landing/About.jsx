import { useEffect, useState } from 'react';
import { Reveal, ScrollProgress } from '../../utils/animations';
import PublicNav from '../../components/PublicNav';
import tempSensor from '../../assets/temp.jpg';
import tdsSensor from '../../assets/tds.jpg';
import ultrasonicSensor from '../../assets/ultrasonic.jpg';
import phsensor from '../../assets/ph.jpg';
import turbiditySensor from '../../assets/turbidity.jpg';
import pump from '../../assets/pump.jpeg';
import feeder from '../../assets/feeder.jpeg';

import dashboardDark from '../../assets/dashboard_dark.png';
import dashboardWhite from '../../assets/dashboard_white.png';

const SENSORS = [
  {
    img: tempSensor,
    alt: 'DS18B20 temperature sensor',
    name: 'DS18B20 Digital Temperature',
    spec: '1-Wire protocol · marine-grade waterproof housing',
  },
  {
    img: ultrasonicSensor,
    alt: 'JSN-SR04T ultrasonic water level sensor',
    name: 'JSN-SR04T Water Level',
    spec: 'Non-contact ultrasonic · dual-threshold pump control',
  },
  {
    img: tdsSensor,
    alt: 'Analog TDS sensor',
    name: 'Analog TDS Sensor',
    spec: 'ppm output · temperature-compensated firmware',
  },
  {
    img: phsensor,
    alt: 'pH-4502C gravity pH sensor',
    name: 'Gravity pH Sensor (pH-4502C)',
    spec: 'Electrochemical electrode · 6.5 – 8.5 pH safe range',
  },
  {
    img: turbiditySensor,
    alt: 'Optical turbidity sensor',
    name: 'Optical Turbidity Sensor',
    spec: 'Light-scattering TSS · 20 NTU filter-life threshold',
  },
];

const ACTUATORS = [
  { name: 'Water Inflow and Outflow Pump', desc: 'Automated evaporation top-off logic/Parameter-triggered corrections and flood prevention', img: pump },
  { name: 'Automated Fish Feeder', desc: 'Precision micro servo control using PWM', img: feeder },
];

function pairRows(arr) {
  return arr.reduce((rows, item, i, a) => (i % 2 === 0 ? [...rows, a.slice(i, i + 2)] : rows), []);
}

export default function About() {
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPageReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`font-sans text-[#1e293b] bg-white min-h-screen flex flex-col ${pageReady ? 'page-ready' : 'page-loading'}`}
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <PublicNav />
      <style>{`
        .page-loading { opacity: 0; }
        .page-ready   { opacity: 1; transition: opacity 0.5s ease; }
      `}</style>

      <ScrollProgress />

      {/* ── Hero / Intro ── */}
      <section className="py-[6rem] px-[4rem] bg-gradient-to-b from-[#0d1627] to-[#0f2744] text-white" id="about-page">
        <div className="max-w-[1100px] mx-auto text-center mb-12">
          <div className="max-w-[750px] mx-auto">
            <span className="text-xs font-bold uppercase tracking-[1.5px] text-sky-400 block mb-2">GUARD</span>
            <h2 className="text-[2.5rem] font-extrabold leading-[1.15] mb-4">General Unit for Aquatic Risk Detection.</h2>
            <p className="text-white/80 text-[1.1rem] leading-relaxed">
              GUARD is an integrated ecosystem combining software, hardware, sensors and actuators to
              help aquaculture operators monitor water quality, automate feeding and respond to risks.
            </p>
          </div>
        </div>

        <div className="max-w-[900px] mx-auto grid grid-cols-4 gap-4 max-[768px]:grid-cols-2" role="navigation" aria-label="About features">
          {['hardware', 'sensors', 'actuators', 'software'].map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex items-center gap-3 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-sky-400/40 rounded-xl p-4 no-underline text-white transition-all hover:-translate-y-1"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
              <div>
                <h4 className="font-bold text-[0.95rem] capitalize m-0">{id}</h4>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ── Hardware ── */}
      <section className="py-[6rem] px-[4rem] bg-[#f8fafc]" id="hardware">
        <div className="max-w-[1100px] mx-auto">
          <Reveal direction="up">
            <div className="mb-10 text-center">
              <span className="text-xs font-bold uppercase tracking-[1.5px] text-sky-500 block mb-2">Hardware</span>
              <h2 className="text-[2rem] font-extrabold text-[#0f172a] mb-3">Controller and power architecture built for stable field operation</h2>
              <p className="text-[#475569] text-[1rem] max-w-[700px] mx-auto">
                The hardware layer pairs a low-power dual-core controller with regulated power, local
                threshold storage and time sync for resilient offline-safe operation.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
            {[
              { icon: 'MCU', title: 'Controller', desc: 'Dual-core ESP32 microcontroller tuned with low-power radio transmission settings using WIFI_POWER_8_5dBm to reduce brownout crashes.' },
              { icon: 'PWR', title: 'Power System', desc: '12V DC primary input is regulated through LM2596 buck converters to safely supply the controller and peripheral components.' },
              { icon: 'RTC', title: 'Storage & Time', desc: 'Preferences.h stores user thresholds locally for offline safety, while NTP keeps the system time synchronized.' },
            ].map((card, i) => (
              <Reveal key={card.title} direction="up" delay={i * 120}>
                <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-[#e2e8f0] h-full flex flex-col">
                  <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 font-bold text-[0.95rem] flex items-center justify-center mb-4 border border-sky-100">
                    {card.icon}
                  </div>
                  <h3 className="text-[1.15rem] font-bold text-[#0f172a] mb-2">{card.title}</h3>
                  <p className="text-[#475569] text-[0.9rem] leading-relaxed m-0 flex-1">{card.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sensors ── */}
      <section className="py-[6rem] px-[4rem] bg-white" id="sensors">
        <div className="max-w-[1100px] mx-auto">
          <Reveal direction="left">
            <div className="mb-10">
              <span className="text-xs font-bold uppercase tracking-[1.5px] text-sky-500 block mb-2">Sensors</span>
              <h2 className="text-[2rem] font-extrabold text-[#0f172a] mb-3">Real-time water quality intelligence</h2>
              <p className="text-[#475569] text-[1rem]">
                Five precision sensors continuously sample key water parameters, feeding the risk engine and dashboard 24/7.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
            {SENSORS.map((s, i) => (
              <Reveal key={s.name} direction="up" delay={i * 100}>
                <div className="bg-[#f8fafc] rounded-2xl p-6 border border-[#e2e8f0] h-full flex flex-col items-center text-center">
                  <img src={s.img} alt={s.alt} className="w-24 h-24 object-contain mb-4 rounded-xl shadow-sm" />
                  <h3 className="text-[1.1rem] font-bold text-[#0f172a] mb-2">{s.name}</h3>
                  <p className="text-[#475569] text-[0.88rem] leading-relaxed m-0">{s.spec}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Actuators ── */}
      <section className="py-[6rem] px-[4rem] bg-[#f8fafc]" id="actuators">
        <div className="max-w-[1100px] mx-auto">
          <Reveal direction="up">
            <div className="mb-10 text-center">
              <span className="text-xs font-bold uppercase tracking-[1.5px] text-sky-500 block mb-2">Actuators</span>
              <h2 className="text-[2rem] font-extrabold text-[#0f172a] mb-3">Automated physical controls</h2>
              <p className="text-[#475569] text-[1rem] max-w-[700px] mx-auto">
                Relay drivers and servos enable automated water replenishment and feeding schedules.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 gap-6 max-[768px]:grid-cols-1">
            {ACTUATORS.map((a, i) => (
              <Reveal key={a.name} direction="up" delay={i * 120}>
                <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-[#e2e8f0] flex gap-6 items-center">
                  <img src={a.img} alt={a.name} className="w-28 h-28 object-contain rounded-xl border border-slate-100 p-2" />
                  <div>
                    <h3 className="text-[1.15rem] font-bold text-[#0f172a] mb-2">{a.name}</h3>
                    <p className="text-[#475569] text-[0.9rem] leading-relaxed m-0">{a.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Software ── */}
      <section className="py-[6rem] px-[4rem] bg-white" id="software">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-12 items-center">
          <Reveal direction="left">
            <div>
              <span className="text-xs font-bold uppercase tracking-[1.5px] text-sky-500 block mb-2">Software Ecosystem</span>
              <h2 className="text-[2rem] font-extrabold text-[#0f172a] mb-4 leading-[1.2]">Connected management tools for the full GUARD workflow</h2>
              <p className="text-[#475569] text-[1rem] leading-relaxed m-0">
                It includes a comprehensive management system for device and tank tracking, worker management, instant notification alerts, actuator controls, and historical time-series analytics.
              </p>
            </div>
          </Reveal>

          <Reveal direction="right">
            <div className="relative rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-[#cbd5e1] group cursor-pointer">
              <img
                src={dashboardDark}
                alt="GUARD Software Dashboard Illustration (Dark)"
                className="w-full h-auto block transition-all duration-700 ease-in-out group-hover:scale-102"
              />
              <img
                src={dashboardWhite}
                alt="GUARD Software Dashboard Illustration (White)"
                className="w-full h-auto block absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 ease-in-out group-hover:scale-102"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#0d1627] text-white border-t border-white/[0.08]" id="contacts">
        <div className="max-w-[1100px] mx-auto px-8 py-14 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1.1fr_1fr] gap-8">
          <div>
            <div className="text-[1.5rem] font-extrabold text-sky-400 tracking-[1px] mb-4">G.U.A.R.D</div>
            <p className="text-slate-400 text-[0.9rem] leading-relaxed">
              General Unit for Aquatic Risk Detection helps protect aquarium health with smart monitoring, alerts, and automation.
            </p>
          </div>
          <div>
            <h3 className="text-[1rem] font-bold mb-4">Quick Links</h3>
            <div className="flex flex-col gap-2">
              <a href="#hardware" className="text-slate-400 hover:text-sky-400 text-[0.9rem] no-underline transition-colors">Hardware Architecture</a>
              <a href="#sensors" className="text-slate-400 hover:text-sky-400 text-[0.9rem] no-underline transition-colors">Sensors & Actuators</a>
              <a href="#software" className="text-slate-400 hover:text-sky-400 text-[0.9rem] no-underline transition-colors">Software Dashboard</a>
              <a
                href="https://cepdnaclk.github.io/e21-3yp-GUARD/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-cyan-300 font-semibold text-[0.9rem] no-underline transition-colors mt-1"
              >
                GitHub Pages)↗
              </a>
            </div>
          </div>
          <div>
            <h3 className="text-[1rem] font-bold mb-4">Downloads</h3>
            <div className="flex flex-col gap-2">
              <a
                href="https://drive.google.com/uc?export=download&id=1JOS3uGWiJEPekHrz9HF-d42750VWIrLt"
                target="_blank"
                rel="noopener noreferrer"
                download
                className="text-slate-400 hover:text-sky-400 text-[0.9rem] no-underline transition-colors flex items-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>User Manual (Hardware)</span>
              </a>
              <a
                href="https://drive.google.com/uc?export=download&id=1pJbCoCFuLEz7tZp47iNzlGxMiktU6Fu-"
                target="_blank"
                rel="noopener noreferrer"
                download
                className="text-slate-400 hover:text-sky-400 text-[0.9rem] no-underline transition-colors flex items-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>User Manual (Software)</span>
              </a>
              <a
                href="https://drive.google.com/uc?export=download&id=1pJbCoCFuLEz7tZp47iNzlGxMiktU6Fu-"
                target="_blank"
                rel="noopener noreferrer"
                download
                className="text-slate-400 hover:text-sky-400 text-[0.9rem] no-underline transition-colors flex items-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Quick Start Guide</span>
              </a>
            </div>
          </div>
          <div>
            <h3 className="text-[1rem] font-bold mb-4">Contact</h3>
            <p className="text-slate-400 text-[0.9rem] mb-1.5 select-text">
              Email:{' '}
              <a href="mailto:guardyp26@gmail.com" className="text-sky-400 hover:underline font-medium select-text">
                guardyp26@gmail.com
              </a>
            </p>
            <p className="text-slate-400 text-[0.9rem] mb-1.5 select-text">Phone: +94 70 195 0219</p>
            <p className="text-slate-400 text-[0.9rem] select-text">Location: Sri Lanka</p>
          </div>
        </div>
        <div className="border-t border-white/[0.08] mx-8" />
        <div className="max-w-[1100px] mx-auto px-8 py-5 text-center text-slate-500 text-[0.85rem]">
          <p>© {new Date().getFullYear()} G.U.A.R.D. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
