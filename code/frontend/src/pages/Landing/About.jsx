import '../../styles/landing.css';
import '../../styles/about.css';
import tempSensor from '../../assets/temp.jpg'
import PublicNav from '../../components/PublicNav';

export default function About() {
	return (
		<div className="landing-page">
			<PublicNav />

			<section className="landing-about" id="about-page">
				<div className="about-content">
					<div className="about-text">
						<span className="about-topic">GUARD</span>
						<h2>General Unit for Aquatic Risk Detection.</h2>
						<p>
							GUARD is an integrated ecosystem combining software, hardware, sensors and actuators to
							help aquaculture operators monitor water quality, automate feeding and respond to risks.
						</p>
					</div>
				</div>

				<div className="hero-buttons" role="navigation" aria-label="About features">
					<a href="#hardware" className="hero-button">
						<div className="hero-button-icon"></div>
						<div className="hero-button-body">
							<h4>Hardware</h4>
						</div>
					</a>

					<a href="#sensors" className="hero-button">
						<div className="hero-button-icon"></div>
						<div className="hero-button-body">
							<h4>Sensors</h4>
						</div>
					</a>

					<a href="#actuators" className="hero-button">
						<div className="hero-button-icon"></div>
						<div className="hero-button-body">
							<h4>Actuators</h4>
						</div>
					</a>

					<a href="#software" className="hero-button">
						<div className="hero-button-icon"></div>
						<div className="hero-button-body">
							<h4>Software</h4>
						</div>
					</a>
				</div>
            </section>

			<section className="about-hardware" id="hardware">
				<div className="hardware-content">
					<span className="section-label hardware-label">Hardware</span>
					<h2>Controller and power architecture built for stable field operation</h2>
					<p className="section-sub hardware-sub">
						The hardware layer pairs a low-power dual-core controller with regulated power, local threshold storage and time sync for resilient offline-safe operation.
					</p>

					<div className="hardware-card-grid">
						<div className="hardware-card">
							<div className="hardware-card-icon">MCU</div>
							<h3>Controller</h3>
							<p>
								Dual-core ESP32 microcontroller tuned with low-power radio transmission settings using WIFI_POWER_8_5dBm to reduce brownout crashes.
							</p>
						</div>

						<div className="hardware-card">
							<div className="hardware-card-icon">PWR</div>
							<h3>Power System</h3>
							<p>
								12V DC primary input is regulated through LM2596 buck converters to safely supply the controller and peripheral components.
							</p>
						</div>

						<div className="hardware-card">
							<div className="hardware-card-icon">RTC</div>
							<h3>Storage &amp; Time</h3>
							<p>
								Preferences.h stores user thresholds locally for offline safety, while NTP keeps the system time synchronized.
							</p>
						</div>
					</div>
				</div>
			</section>

			<section className="about-sensors" id="sensors">
				<div className="sensors-content">
					<span className="section-label">Sensors</span>
					<h2>Real-time water quality intelligence</h2>
					<p className="section-sub">
						Five precision sensors continuously sample key water parameters, feeding the risk engine and dashboard 24/7.
					</p>

					{[
						{
							img: tempSensor,
							alt: "DS18B20 temperature sensor",
							name: "DS18B20 Digital Temperature",
							spec: "1-Wire protocol · marine-grade waterproof housing",
						},
						{
							img: "/images/sensors/jsn-sr04t.jpg",
							alt: "JSN-SR04T ultrasonic water level sensor",
							name: "JSN-SR04T Water Level",
							spec: "Non-contact ultrasonic · dual-threshold pump control",
							
						},
						{
							img: "/images/sensors/tds.jpg",
							alt: "Analog TDS sensor",
							name: "Analog TDS Sensor",
							spec: "ppm output · temperature-compensated firmware",
						},
						{
							img: "/images/sensors/ph4502c.jpg",
							alt: "pH-4502C gravity pH sensor",
							name: "Gravity pH Sensor (pH-4502C)",
							spec: "Electrochemical electrode · 6.5 – 8.5 pH safe range",
							
						},
						{
							img: "/images/sensors/turbidity.jpg",
							alt: "Optical turbidity sensor",
							name: "Optical Turbidity Sensor",
							spec: "Light-scattering TSS · 20 NTU filter-life threshold",
							
						},
					].reduce((rows, item, i, arr) =>
						i % 2 === 0 ? [...rows, arr.slice(i, i + 2)] : rows, []
					).map((pair, rowIdx) => (
						<div className="sensor-row" key={rowIdx}>
							{pair.map((sensor) => (
								<div className="sensor-card" key={sensor.name}>
									<div className="sensor-photo">
										<img src={sensor.img} alt={sensor.alt} />
									</div>
									<div className="sensor-body">
										<p className="sensor-name">{sensor.name}</p>
										<p className="sensor-spec">{sensor.spec}</p>
										
									</div>
								</div>
							))}
							{pair.length === 1 && <div className="sensor-card-empty" />}
						</div>
					))}
				</div>
			</section>

			<section className="about-sensors" id="actuators">
				<div className="sensors-content">
					<span className="section-label">Actuators</span>
					<h2>Automated actuators for control and response</h2>
					<p className="section-sub">
						Actuators automate water flow, drainage and feeding to keep systems within safe parameters.
					</p>

					{[
						{
							name: "Water Inflow / Replenishment Pump",
							desc: "Automated evaporation top-off logic",
							img: tempSensor,
						},
						{
							name: "Water Outflow / Drainage Pump",
							desc: "Parameter-triggered corrections and flood prevention",
							img: tempSensor,
						},
						{
							name: "Automated Fish Feeder",
							desc: "Precision micro servo control using PWM",
							img: tempSensor,
						},
					].reduce((rows, item, i, arr) =>
						i % 2 === 0 ? [...rows, arr.slice(i, i + 2)] : rows, []
					).map((pair, rowIdx) => (
						<div className="sensor-row" key={rowIdx}>
							{pair.map((act) => (
								<div className="sensor-card" key={act.name}>
									<div className="sensor-photo">
										<img src={act.img} alt={act.name} />
									</div>
									<div className="sensor-body">
										<p className="sensor-name">{act.name}</p>
										<p className="sensor-spec">{act.desc}</p>
									</div>
								</div>
							))}
							{pair.length === 1 && <div className="sensor-card-empty" />}
						</div>
					))}
				</div>
			</section>

			<section className="about-software" id="software">
				<div className="software-content">
					<div className="software-copy">
						<span className="section-label software-label">Software</span>
						<h2>Connected management tools for the full GUARD workflow</h2>
						<p className="software-sub">
							It includes a management system for device and tank management, worker management, a notification system, actuator control, and historical value analysis.
						</p>
					</div>

					<div className="software-visual" aria-label="Software image placeholder">
						<div className="software-image-placeholder">
							<div className="software-image-glow" />
							<div className="software-image-label">
								<span>Image placeholder</span>
								<p>Replace this with a software dashboard or platform illustration.</p>
							</div>
						</div>
					</div>
				</div>
			</section>

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
