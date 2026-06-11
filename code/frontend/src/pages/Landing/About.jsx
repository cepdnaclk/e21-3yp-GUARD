import { useEffect, useState } from 'react';
import { Reveal, ScrollProgress } from '../../utils/animations';
import '../../styles/landing.css';
import '../../styles/about.css';
import tempSensor from '../../assets/temp.jpg';
import PublicNav from '../../components/PublicNav';

const SENSORS = [
  {
    img: tempSensor,
    alt: 'DS18B20 temperature sensor',
    name: 'DS18B20 Digital Temperature',
    spec: '1-Wire protocol · marine-grade waterproof housing',
  },
  {
    img: '/images/sensors/jsn-sr04t.jpg',
    alt: 'JSN-SR04T ultrasonic water level sensor',
    name: 'JSN-SR04T Water Level',
    spec: 'Non-contact ultrasonic · dual-threshold pump control',
  },
  {
    img: '/images/sensors/tds.jpg',
    alt: 'Analog TDS sensor',
    name: 'Analog TDS Sensor',
    spec: 'ppm output · temperature-compensated firmware',
  },
  {
    img: '/images/sensors/ph4502c.jpg',
    alt: 'pH-4502C gravity pH sensor',
    name: 'Gravity pH Sensor (pH-4502C)',
    spec: 'Electrochemical electrode · 6.5 – 8.5 pH safe range',
  },
  {
    img: '/images/sensors/turbidity.jpg',
    alt: 'Optical turbidity sensor',
    name: 'Optical Turbidity Sensor',
    spec: 'Light-scattering TSS · 20 NTU filter-life threshold',
  },
];

const ACTUATORS = [
  { name: 'Water Inflow / Replenishment Pump', desc: 'Automated evaporation top-off logic', img: tempSensor },
  { name: 'Water Outflow / Drainage Pump', desc: 'Parameter-triggered corrections and flood prevention', img: tempSensor },
  { name: 'Automated Fish Feeder', desc: 'Precision micro servo control using PWM', img: tempSensor },
];

function pairRows(arr) {
  return arr.reduce((rows, item, i, a) => (i % 2 === 0 ? [...rows, a.slice(i, i + 2)] : rows), []);
}

export default function About() {
  const [pageReady, setPageReady] = useState(false);

  /* Page-load fade-in */
  useEffect(() => {
    const t = setTimeout(() => setPageReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`landing-page ${pageReady ? 'page-ready' : 'page-loading'}`}>
      <ScrollProgress />
      <PublicNav />

      {/* ── Hero / Intro ── */}
      <section className="landing-about" id="about-page">
        <div className="about-content">
          <div className="about-text about-text-animated">
            <span className="about-topic about-topic-animated">GUARD</span>
            <h2 className="about-h2-animated">General Unit for Aquatic Risk Detection.</h2>
            <p className="about-p-animated">
              GUARD is an integrated ecosystem combining software, hardware, sensors and actuators to
              help aquaculture operators monitor water quality, automate feeding and respond to risks.
            </p>
          </div>
        </div>

        <div className="hero-buttons hero-buttons-animated" role="navigation" aria-label="About features">
          {['hardware', 'sensors', 'actuators', 'software'].map((id, i) => (
            <a
              key={id}
              href={`#${id}`}
              className="hero-button"
              style={{ animationDelay: `${0.55 + i * 0.1}s` }}
            >
              <div className="hero-button-icon" />
              <div className="hero-button-body">
                <h4>{id.charAt(0).toUpperCase() + id.slice(1)}</h4>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ── Hardware ── */}
      <section className="about-hardware" id="hardware">
        <div className="hardware-content">
          <Reveal direction="up">
            <span className="section-label hardware-label">Hardware</span>
            <h2>Controller and power architecture built for stable field operation</h2>
            <p className="section-sub hardware-sub">
              The hardware layer pairs a low-power dual-core controller with regulated power, local
              threshold storage and time sync for resilient offline-safe operation.
            </p>
          </Reveal>

          <div className="hardware-card-grid">
            {[
              { icon: 'MCU', title: 'Controller', desc: 'Dual-core ESP32 microcontroller tuned with low-power radio transmission settings using WIFI_POWER_8_5dBm to reduce brownout crashes.' },
              { icon: 'PWR', title: 'Power System', desc: '12V DC primary input is regulated through LM2596 buck converters to safely supply the controller and peripheral components.' },
              { icon: 'RTC', title: 'Storage & Time', desc: 'Preferences.h stores user thresholds locally for offline safety, while NTP keeps the system time synchronized.' },
            ].map((card, i) => (
              <Reveal key={card.title} direction="up" delay={i * 120}>
                <div className="hardware-card">
                  <div className="hardware-card-icon">{card.icon}</div>
                  <h3>{card.title}</h3>
                  <p>{card.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sensors ── */}
      <section className="about-sensors" id="sensors">
        <div className="sensors-content">
          <Reveal direction="left">
            <span className="section-label">Sensors</span>
            <h2>Real-time water quality intelligence</h2>
            <p className="section-sub">
              Five precision sensors continuously sample key water parameters, feeding the risk engine
              and dashboard 24/7.
            </p>
          </Reveal>

          {pairRows(SENSORS).map((pair, rowIdx) => (
            <div className="sensor-row" key={rowIdx}>
              {pair.map((sensor, i) => (
                <Reveal key={sensor.name} direction="scale" delay={i * 120}>
                  <div className="sensor-card">
                    <div className="sensor-photo">
                      <img src={sensor.img} alt={sensor.alt} />
                    </div>
                    <div className="sensor-body">
                      <p className="sensor-name">{sensor.name}</p>
                      <p className="sensor-spec">{sensor.spec}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
              {pair.length === 1 && <div className="sensor-card-empty" />}
            </div>
          ))}
        </div>
      </section>

      {/* ── Actuators ── */}
      <section className="about-sensors" id="actuators">
        <div className="sensors-content">
          <Reveal direction="right">
            <span className="section-label">Actuators</span>
            <h2>Automated actuators for control and response</h2>
            <p className="section-sub">
              Actuators automate water flow, drainage and feeding to keep systems within safe parameters.
            </p>
          </Reveal>

          {pairRows(ACTUATORS).map((pair, rowIdx) => (
            <div className="sensor-row" key={rowIdx}>
              {pair.map((act, i) => (
                <Reveal key={act.name} direction="scale" delay={i * 120}>
                  <div className="sensor-card">
                    <div className="sensor-photo">
                      <img src={act.img} alt={act.name} />
                    </div>
                    <div className="sensor-body">
                      <p className="sensor-name">{act.name}</p>
                      <p className="sensor-spec">{act.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
              {pair.length === 1 && <div className="sensor-card-empty" />}
            </div>
          ))}
        </div>
      </section>

      {/* ── Software ── */}
      <section className="about-software" id="software">
        <div className="software-content">
          <Reveal direction="left" className="software-copy">
            <span className="section-label software-label">Software</span>
            <h2>Connected management tools for the full GUARD workflow</h2>
            <p className="software-sub">
              It includes a management system for device and tank management, worker management, a
              notification system, actuator control, and historical value analysis.
            </p>
          </Reveal>

          <Reveal direction="right" className="software-visual">
            <div className="software-image-placeholder">
              <div className="software-image-glow" />
              <div className="software-image-label">
                <span>Image placeholder</span>
                <p>Replace this with a software dashboard or platform illustration.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer" id="contacts">
        <div className="footer-inner">
          <div className="footer-brand-block">
            <div className="footer-brand-name">G.U.A.R.D</div>
            <p>
              General Unit for Aquatic Risk Detection helps protect aquarium health with smart
              monitoring, alerts, and automation.
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
            <p>Phone: +94 70 195 0210</p>
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
