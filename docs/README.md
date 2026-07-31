---
layout: home
permalink: index.html
repository-name: e21-3yp-GUARD
title: GUARD - Modular Aquarium Management System
---

<a id="top"></a>

<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap');

  :root {
    --g-bg: #060c16;
    --g-card: rgba(255, 255, 255, 0.038);
    --g-card-hover: rgba(255, 255, 255, 0.07);
    --g-border: rgba(14, 165, 233, 0.18);
    --g-border-hover: rgba(14, 165, 233, 0.45);
    --g-cyan: #06b6d4;
    --g-sky: #0ea5e9;
    --g-sky-light: #38bdf8;
    --g-emerald: #10b981;
    --g-rose: #ef4444;
    --g-amber: #f59e0b;
    --g-text: #f0f6fc;
    --g-muted: #94a3b8;
    --g-subtle: #64748b;
    --g-glow: rgba(14, 165, 233, 0.22);
  }

  * { box-sizing: border-box; }

  html {
    scroll-behavior: smooth;
  }

  body {
    background: var(--g-bg) !important;
    color: var(--g-text) !important;
    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif !important;
    margin: 0;
    padding: 0;
    line-height: 1.6;
    background-image: 
      radial-gradient(ellipse 70% 50% at 10% 10%, rgba(14, 165, 233, 0.14) 0%, transparent 65%),
      radial-gradient(ellipse 60% 50% at 90% 20%, rgba(6, 182, 212, 0.12) 0%, transparent 65%),
      radial-gradient(ellipse 80% 60% at 50% 90%, rgba(16, 185, 129, 0.08) 0%, transparent 70%) !important;
    background-attachment: fixed !important;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: 'Space Grotesk', sans-serif !important;
    color: #ffffff !important;
    letter-spacing: -0.02em;
  }

  p, li, td, th {
    color: var(--g-text);
  }

  a {
    color: var(--g-sky-light);
    text-decoration: none;
    transition: all 0.2s ease;
  }
  a:hover {
    color: #ffffff;
    text-shadow: 0 0 8px rgba(56, 189, 248, 0.5);
  }

  /* ── Keyframe Animations ─────────────────────────────── */
  @keyframes g-float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-12px) rotate(3deg); }
  }

  @keyframes g-pulse-glow {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.04); }
  }

  @keyframes g-radar {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes g-stream-flow {
    0% { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }

  /* ── Sticky Top Bar ─────────────────────────────── */
  .g-navbar {
    position: sticky;
    top: 0;
    z-index: 1000;
    background: rgba(6, 12, 22, 0.82);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border-bottom: 1px solid var(--g-border);
    padding: 14px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .g-nav-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 800;
    font-size: 1.25rem;
    font-family: 'Space Grotesk', sans-serif;
    color: #ffffff;
  }

  .g-nav-logo {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--g-sky), var(--g-cyan));
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 14px var(--g-glow);
  }

  .g-nav-links {
    display: flex;
    align-items: center;
    gap: 24px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .g-nav-links a {
    font-size: 0.92rem;
    font-weight: 500;
    color: var(--g-muted);
  }
  .g-nav-links a:hover {
    color: #ffffff;
  }

  .g-nav-btn {
    padding: 8px 18px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--g-sky) 0%, var(--g-cyan) 100%);
    color: #ffffff !important;
    font-weight: 600;
    font-size: 0.88rem;
    box-shadow: 0 4px 14px rgba(14, 165, 233, 0.35);
    transition: all 0.25s ease;
  }
  .g-nav-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(14, 165, 233, 0.55);
  }

  /* ── Main Container ─────────────────────────────── */
  .g-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
  }

  /* ── Hero Section ─────────────────────────────── */
  .g-hero {
    position: relative;
    overflow: hidden;
    border-radius: 28px;
    border: 1px solid var(--g-border);
    background: linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(6, 12, 22, 0.6) 100%);
    backdrop-filter: blur(20px);
    padding: 64px 48px;
    margin: 32px 0 48px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  .g-hero-orb {
    position: absolute;
    top: -80px; right: -80px;
    width: 320px; height: 320px;
    background: radial-gradient(circle, rgba(14, 165, 233, 0.25) 0%, transparent 70%);
    border-radius: 50%;
    animation: g-float 8s ease-in-out infinite;
    pointer-events: none;
  }

  .g-hero-grid {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 40px;
    align-items: center;
    position: relative;
    z-index: 2;
  }

  @media (max-width: 900px) {
    .g-hero-grid { grid-template-columns: 1fr; }
    .g-nav-links { display: none; }
  }

  .g-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    border-radius: 20px;
    background: rgba(14, 165, 233, 0.12);
    border: 1px solid rgba(14, 165, 233, 0.3);
    color: var(--g-sky-light);
    font-size: 0.82rem;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 16px;
  }

  .g-badge-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--g-emerald);
    box-shadow: 0 0 8px var(--g-emerald);
    animation: g-pulse-glow 2s infinite;
  }

  .g-hero-title {
    font-size: clamp(2.2rem, 5vw, 3.2rem);
    font-weight: 900;
    line-height: 1.12;
    margin: 0 0 20px;
    background: linear-gradient(135deg, #ffffff 30%, var(--g-sky-light) 70%, var(--g-cyan) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .g-tagline-bullets {
    list-style: none;
    padding: 0;
    margin: 0 0 24px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .g-tagline-bullets li {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.05rem;
    font-weight: 600;
    color: #e2e8f0;
  }

  .g-hero-summary {
    color: var(--g-muted);
    font-size: 1.05rem;
    line-height: 1.7;
    margin-bottom: 32px;
  }

  .g-cta-group {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  .g-btn-primary {
    padding: 14px 28px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--g-sky) 0%, var(--g-cyan) 100%);
    color: #ffffff !important;
    font-weight: 700;
    font-size: 1rem;
    box-shadow: 0 6px 24px rgba(14, 165, 233, 0.4);
    transition: all 0.25s ease;
  }
  .g-btn-primary:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 30px rgba(14, 165, 233, 0.6);
  }

  .g-btn-secondary {
    padding: 14px 28px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--g-border);
    color: #ffffff !important;
    font-weight: 600;
    font-size: 1rem;
    transition: all 0.25s ease;
  }
  .g-btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--g-sky-light);
    transform: translateY(-3px);
  }

  .g-hero-card {
    background: rgba(13, 22, 39, 0.75);
    border: 1px solid var(--g-border);
    border-radius: 20px;
    padding: 24px;
    backdrop-filter: blur(16px);
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
  }

  .g-card-stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  .g-card-stat:last-child { border-bottom: none; }

  .g-stat-label { font-size: 0.88rem; color: var(--g-muted); }
  .g-stat-val { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--g-sky-light); }

  /* ── Section Titles ─────────────────────────────── */
  .g-section-header {
    text-align: center;
    margin: 64px 0 36px;
  }

  .g-section-title {
    font-size: clamp(1.8rem, 3.5vw, 2.5rem);
    font-weight: 800;
    margin: 0 0 12px;
  }

  .g-section-sub {
    color: var(--g-muted);
    font-size: 1.05rem;
    max-width: 680px;
    margin: 0 auto;
  }

  /* ── Value Proposition (3x2 Grid) ─────────────────────────────── */
  .g-grid-3x2 {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 24px;
    margin-bottom: 64px;
  }

  .g-val-card {
    background: var(--g-card);
    border: 1px solid var(--g-border);
    border-radius: 20px;
    padding: 30px;
    backdrop-filter: blur(16px);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  .g-val-card:hover {
    background: var(--g-card-hover);
    border-color: var(--g-border-hover);
    transform: translateY(-6px);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4), 0 0 20px var(--g-glow);
  }

  .g-val-icon {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(6, 182, 212, 0.1));
    border: 1px solid rgba(14, 165, 233, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    margin-bottom: 20px;
  }

  .g-val-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0 0 10px;
    color: #ffffff;
  }

  .g-val-desc {
    color: var(--g-muted);
    font-size: 0.95rem;
    line-height: 1.6;
    margin: 0;
  }

  /* ── Visual & Motion Gallery ─────────────────────────────── */
  .g-gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    margin-bottom: 48px;
  }

  .g-gallery-card {
    background: var(--g-card);
    border: 1px solid var(--g-border);
    border-radius: 18px;
    overflow: hidden;
    backdrop-filter: blur(14px);
    transition: all 0.3s ease;
  }
  .g-gallery-card:hover {
    border-color: var(--g-sky-light);
    transform: scale(1.02);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  }

  .g-gallery-img {
    width: 100%;
    height: 200px;
    object-fit: cover;
    display: block;
    border-bottom: 1px solid var(--g-border);
  }

  .g-gallery-caption {
    padding: 16px;
  }
  .g-gallery-title {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0 0 4px;
    color: #ffffff;
  }
  .g-gallery-sub {
    font-size: 0.85rem;
    color: var(--g-muted);
  }

  .g-video-container {
    background: var(--g-card);
    border: 1px solid var(--g-border);
    border-radius: 24px;
    padding: 24px;
    backdrop-filter: blur(18px);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    margin-bottom: 64px;
  }

  .g-video-wrap {
    position: relative;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .g-video-wrap video {
    width: 100%;
    max-height: 520px;
    display: block;
    background: #000;
  }

  /* ── System Architecture & Pipeline ─────────────────────────────── */
  .g-arch-box {
    background: var(--g-card);
    border: 1px solid var(--g-border);
    border-radius: 24px;
    padding: 40px;
    backdrop-filter: blur(18px);
    margin-bottom: 64px;
  }

  .g-arch-flow {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin: 32px 0;
  }

  .g-flow-node {
    flex: 1;
    min-width: 160px;
    background: rgba(14, 165, 233, 0.06);
    border: 1px solid rgba(14, 165, 233, 0.25);
    border-radius: 16px;
    padding: 20px 16px;
    text-align: center;
    transition: all 0.3s ease;
  }
  .g-flow-node:hover {
    border-color: var(--g-sky-light);
    background: rgba(14, 165, 233, 0.12);
    transform: translateY(-4px);
  }

  .g-flow-node-title {
    font-weight: 700;
    font-size: 1rem;
    color: #ffffff;
    margin-bottom: 6px;
  }
  .g-flow-node-desc {
    font-size: 0.82rem;
    color: var(--g-muted);
  }

  .g-flow-arrow {
    color: var(--g-sky-light);
    font-size: 1.5rem;
    font-weight: 900;
  }

  /* ── Operational Pipeline Steps ─────────────────────────────── */
  .g-pipeline-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 64px;
  }

  .g-pipeline-step {
    background: var(--g-card);
    border: 1px solid var(--g-border);
    border-radius: 18px;
    padding: 20px 24px;
    display: flex;
    align-items: center;
    gap: 20px;
    backdrop-filter: blur(14px);
    transition: all 0.25s ease;
  }
  .g-pipeline-step:hover {
    border-color: var(--g-border-hover);
    transform: translateX(6px);
  }

  .g-step-num {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--g-sky), var(--g-cyan));
    color: #ffffff;
    font-weight: 800;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 0 12px var(--g-glow);
  }

  .g-step-content {
    flex: 1;
  }
  .g-step-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 4px;
  }
  .g-step-desc {
    font-size: 0.92rem;
    color: var(--g-muted);
    margin: 0;
  }

  /* ── Tech Stack Matrix & Rigid BOM Table ─────────────────────────────── */
  .g-stack-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    margin-bottom: 48px;
  }

  .g-stack-card {
    background: var(--g-card);
    border: 1px solid var(--g-border);
    border-radius: 18px;
    padding: 24px;
    backdrop-filter: blur(14px);
  }
  .g-stack-cat {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--g-sky-light);
    font-weight: 700;
    margin-bottom: 12px;
  }
  .g-stack-items {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .g-stack-items li {
    font-size: 0.95rem;
    color: #ffffff;
    font-weight: 500;
  }

  /* Rigid Bordered BOM Table */
  .g-table-wrap {
    overflow-x: auto;
    margin-bottom: 64px;
    border-radius: 18px;
    border: 1px solid var(--g-border);
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4);
  }

  .g-bom-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--g-card);
    backdrop-filter: blur(16px);
    font-size: 0.95rem;
  }

  .g-bom-table th, .g-bom-table td {
    padding: 16px 20px;
    text-align: left;
    border-bottom: 1px solid rgba(14, 165, 233, 0.15);
    border-right: 1px solid rgba(14, 165, 233, 0.15);
  }
  .g-bom-table th:last-child, .g-bom-table td:last-child {
    border-right: none;
  }

  .g-bom-table th {
    background: rgba(14, 165, 233, 0.12);
    color: #ffffff;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.85rem;
    letter-spacing: 1px;
  }

  .g-bom-table tr:last-child td {
    border-bottom: none;
  }

  .g-bom-table tr:hover td {
    background: rgba(255, 255, 255, 0.04);
  }

  .g-total-row td {
    font-weight: 800;
    color: var(--g-sky-light);
    background: rgba(14, 165, 233, 0.1) !important;
  }

  /* ── Metadata & Footer ─────────────────────────────── */
  .g-footer {
    border-top: 1px solid var(--g-border);
    background: rgba(4, 9, 17, 0.95);
    padding: 48px 0 32px;
    margin-top: 64px;
  }

  .g-footer-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 32px;
    margin-bottom: 36px;
  }

  .g-footer-brand {
    font-weight: 800;
    font-size: 1.3rem;
    color: #ffffff;
    margin-bottom: 12px;
  }

  .g-footer-desc {
    color: var(--g-muted);
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .g-footer-title {
    font-size: 1rem;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 16px;
  }

  .g-footer-links {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .g-footer-links a {
    color: var(--g-muted);
    font-size: 0.9rem;
  }
  .g-footer-links a:hover {
    color: #ffffff;
  }

  .g-bottom-bar {
    text-align: center;
    padding-top: 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    color: var(--g-subtle);
    font-size: 0.85rem;
  }
</style>

<!-- ── STICKY TOP BAR NAV ─────────────────────────────── -->
<nav class="g-navbar">
  <div class="g-nav-brand">
    <div class="g-nav-logo">🛡️</div>
    <span>GUARD</span>
  </div>
  <ul class="g-nav-links">
    <li><a href="#overview">Overview</a></li>
    <li><a href="#features">Capabilities</a></li>
    <li><a href="#gallery">Gallery & Reels</a></li>
    <li><a href="#architecture">Architecture</a></li>
    <li><a href="#pipeline">Pipeline</a></li>
    <li><a href="#pragmatics">Stack & BOM</a></li>
    <li><a href="#team">Team</a></li>
  </ul>
  <a href="https://github.com/cepdnaclk/e21-3yp-GUARD" target="_blank" class="g-nav-btn">GitHub Repo ↗</a>
</nav>

<div class="g-container">

  <!-- ── HERO SECTION ─────────────────────────────── -->
  <section class="g-hero" id="overview">
    <div class="g-hero-orb"></div>
    <div class="g-hero-grid">
      <div>
        <div class="g-badge">
          <span class="g-badge-dot"></span>
          Modular IoT Platform
        </div>
        <h1 class="g-hero-title">GUARD: Modular IoT Aquarium & Water Quality System</h1>
        
        <ul class="g-tagline-bullets">
          <li>⚡ Real-Time Multi-Parameter Telemetry Acquisition</li>
          <li>🤖 Autonomous Hysteresis-Driven Actuator Control</li>
          <li>🛡️ Multi-Tier Fail-Safe Cutoffs & Alert Engine</li>
        </ul>

        <p class="g-hero-summary">
          GUARD is an industrial-grade, modular IoT framework engineered for continuous water quality monitoring and dynamic aquatic ecosystem management. Powered by ESP32 microcontrollers, high-throughput MQTT streaming, and a hybrid database persistence engine, GUARD delivers real-time telemetry, automated feeding and pumping, and instant multi-channel alert notifications.
        </p>

        <div class="g-cta-group">
          <a href="https://github.com/cepdnaclk/e21-3yp-GUARD" target="_blank" class="g-btn-primary">View GitHub Repository ↗</a>
          <a href="#architecture" class="g-btn-secondary">Explore Architecture ↓</a>
        </div>
      </div>

      <div>
        <div class="g-hero-card">
          <h3 style="margin-top:0; font-size:1.15rem; color:#fff;">Live Telemetry Monitor</h3>
          <div class="g-card-stat">
            <span class="g-stat-label">Water Temperature</span>
            <span class="g-stat-val" style="color:#38bdf8;">26.5 °C</span>
          </div>
          <div class="g-card-stat">
            <span class="g-stat-label">pH Level</span>
            <span class="g-stat-val" style="color:#10b981;">7.4 pH</span>
          </div>
          <div class="g-card-stat">
            <span class="g-stat-label">Total Dissolved Solids</span>
            <span class="g-stat-val" style="color:#06b6d4;">340 ppm</span>
          </div>
          <div class="g-card-stat">
            <span class="g-stat-label">Water Depth Level</span>
            <span class="g-stat-val" style="color:#38bdf8;">85.0 %</span>
          </div>
          <div class="g-card-stat">
            <span class="g-stat-label">Actuator Status</span>
            <span class="g-stat-val" style="color:#10b981;">ACTIVE (PUMP ON)</span>
          </div>
          <div class="g-card-stat">
            <span class="g-stat-label">System Health</span>
            <span class="g-stat-val" style="color:#10b981;">NOMINAL 🟢</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ── VALUE PROPOSITION (3x2 GRID) ─────────────────────────────── -->
  <section id="features">
    <div class="g-section-header">
      <h2 class="g-section-title">Core Engineering Capabilities</h2>
      <p class="g-section-sub">Engineered to eliminate manual monitoring friction and protect aquatic ecosystems round-the-clock.</p>
    </div>

    <div class="g-grid-3x2">
      <div class="g-val-card">
        <div class="g-val-icon">🛰️</div>
        <h3 class="g-val-title">Multi-Sensor Telemetry Stream</h3>
        <p class="g-val-desc">Continuous high-frequency acquisition of Temperature (DS18B20), pH, TDS, Turbidity, and Ultrasonic Water Level measurements with hardware-level noise filtering.</p>
      </div>

      <div class="g-val-card">
        <div class="g-val-icon">⚙️</div>
        <h3 class="g-val-title">Autonomous Control Engine</h3>
        <p class="g-val-desc">Deadband hysteresis control loops prevent relay chattering while automatically switching heaters, water pumps, air pumps, and servo feeders based on target thresholds.</p>
      </div>

      <div class="g-val-card">
        <div class="g-val-icon">💾</div>
        <h3 class="g-val-title">Dual-Layer Database Engine</h3>
        <p class="g-val-desc">Combines MongoDB via Prisma for rapid application state & device mapping with InfluxDB time-series storage for long-term telemetry analytics.</p>
      </div>

      <div class="g-val-card">
        <div class="g-val-icon">🚨</div>
        <h3 class="g-val-title">Multi-Channel Alert Dispatch</h3>
        <p class="g-val-desc">Real-time push notifications via WebSockets (Socket.IO), automated email dispatch, and instant Telegram Bot alerts with configurable spam suppression windows.</p>
      </div>

      <div class="g-val-card">
        <div class="g-val-icon">📱</div>
        <h3 class="g-val-title">Cross-Platform Control Clients</h3>
        <p class="g-val-desc">Sleek React 18 Tailwind web dashboard combined with an Expo React Native mobile app supporting live charts, interactive controls, and role-based access.</p>
      </div>

      <div class="g-val-card">
        <div class="g-val-icon">🔒</div>
        <h3 class="g-val-title">Fail-Safe Emergency Cutoffs</h3>
        <p class="g-val-desc">Automatic hardware cutoffs trigger immediate fail-safe state during probe disconnections, out-of-bounds readings, or power loss recovery.</p>
      </div>
    </div>
  </section>

  <!-- ── VISUAL & MOTION VIDEO SHOWCASE ─────────────────────────────── -->
  <section id="gallery">
    <div class="g-section-header">
      <h2 class="g-section-title">Visual Gallery & Motion Demonstrations</h2>
      <p class="g-section-sub">Explore physical hardware assembly, CAD renders, and motion video reels of the operational system.</p>
    </div>

    <!-- Motion Video Reel Section -->
    <div class="g-video-container">
      <h3 style="margin-top:0; color:#fff; font-size:1.3rem; margin-bottom:16px;">🎥 Live System Operational Demonstration</h3>
      <div class="g-video-wrap">
        <video controls autoplay loop muted poster="images/dashboard.png">
          <source src="images/Device_intro.mp4" type="video/mp4">
          Your browser does not support HTML5 video playback.
        </video>
      </div>
      <p style="color:var(--g-muted); font-size:0.9rem; margin-top:14px; text-align:center;">
        Video: Real-time telemetry ingestion, relay actuation response, and mobile dashboard synchronization.
      </p>
    </div>

    <!-- Concept Renders Grid -->
    <h3 style="color:#ffffff; font-size:1.3rem; margin-bottom:20px;">System CAD & Concept Renders</h3>
    <div class="g-gallery-grid">
      <div class="g-gallery-card">
        <img src="images/Image.png" alt="Concept Render 1" class="g-gallery-img">
        <div class="g-gallery-caption">
          <div class="g-gallery-title">Modular Enclosure Overview</div>
          <div class="g-gallery-sub">Waterproof IP65 Central Control Unit setup</div>
        </div>
      </div>
      <div class="g-gallery-card">
        <img src="images/Image-1.png" alt="Concept Render 2" class="g-gallery-img">
        <div class="g-gallery-caption">
          <div class="g-gallery-title">Sensor Probe Mounting</div>
          <div class="g-gallery-sub">Isolated probe array placement for accuracy</div>
        </div>
      </div>
      <div class="g-gallery-card">
        <img src="images/Image-2.png" alt="Concept Render 3" class="g-gallery-img">
        <div class="g-gallery-caption">
          <div class="g-gallery-title">Actuator Relay Subsystem</div>
          <div class="g-gallery-sub">Optocoupled relay isolation for AC pumps & heaters</div>
        </div>
      </div>
      <div class="g-gallery-card">
        <img src="images/Image-3.png" alt="Concept Render 4" class="g-gallery-img">
        <div class="g-gallery-caption">
          <div class="g-gallery-title">Automated Feeder Mechanism</div>
          <div class="g-gallery-sub">Servo-driven dispense mechanism</div>
        </div>
      </div>
    </div>

    <!-- Physical Hardware Photos Grid -->
    <h3 style="color:#ffffff; font-size:1.3rem; margin-bottom:20px;">Physical Hardware & Sensor Array</h3>
    <div class="g-gallery-grid">
      <div class="g-gallery-card">
        <img src="images/temp.jpg" alt="DS18B20 Temp Sensor" class="g-gallery-img">
        <div class="g-gallery-caption">
          <div class="g-gallery-title">DS18B20 Temperature Sensor</div>
          <div class="g-gallery-sub">Submersible stainless steel thermal probe</div>
        </div>
      </div>
      <div class="g-gallery-card">
        <img src="images/ph.jpg" alt="pH Sensor" class="g-gallery-img">
        <div class="g-gallery-caption">
          <div class="g-gallery-title">Gravity pH Sensor Probe</div>
          <div class="g-gallery-sub">Precision analog pH signal conditioner</div>
        </div>
      </div>
      <div class="g-gallery-card">
        <img src="images/tds.jpg" alt="TDS Sensor" class="g-gallery-img">
        <div class="g-gallery-caption">
          <div class="g-gallery-title">TDS / EC Sensor Probe</div>
          <div class="g-gallery-sub">Water purity & electrical conductivity sensing</div>
        </div>
      </div>
      <div class="g-gallery-card">
        <img src="images/ultrasonic.jpg" alt="Ultrasonic Level Sensor" class="g-gallery-img">
        <div class="g-gallery-caption">
          <div class="g-gallery-title">Ultrasonic Water Level Probe</div>
          <div class="g-gallery-sub">Non-contact tank height measurement</div>
        </div>
      </div>
    </div>
  </section>

  <!-- ── SYSTEM ARCHITECTURE ─────────────────────────────── -->
  <section id="architecture">
    <div class="g-section-header">
      <h2 class="g-section-title">System Architecture</h2>
      <p class="g-section-sub">Distributed end-to-end IoT flow connecting hardware edge nodes, MQTT broker services, and cloud storage.</p>
    </div>

    <div class="g-arch-box">
      <div class="g-arch-flow">
        <div class="g-flow-node">
          <div class="g-flow-node-title">🔌 ESP32 Edge Node</div>
          <div class="g-flow-node-desc">Sensors $\rightarrow$ ADC $\rightarrow$ Hysteresis Control</div>
        </div>
        <div class="g-flow-arrow">➔</div>
        <div class="g-flow-node">
          <div class="g-flow-node-title">📡 MQTT Broker</div>
          <div class="g-flow-node-desc">TLS Encrypted Telemetry & Command Topics</div>
        </div>
        <div class="g-flow-arrow">➔</div>
        <div class="g-flow-node">
          <div class="g-flow-node-title">⚡ Express Backend</div>
          <div class="g-flow-node-desc">Ingestion $\rightarrow$ Rules Engine $\rightarrow$ Alert Dispatcher</div>
        </div>
        <div class="g-flow-arrow">➔</div>
        <div class="g-flow-node">
          <div class="g-flow-node-title">💾 InfluxDB + Mongo</div>
          <div class="g-flow-node-desc">Time-series history & MongoDB application state</div>
        </div>
        <div class="g-flow-arrow">➔</div>
        <div class="g-flow-node">
          <div class="g-flow-node-title">💻 Web & Mobile App</div>
          <div class="g-flow-node-desc">Socket.IO Live Charts & Remote Control</div>
        </div>
      </div>

      <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:16px; padding:24px; margin-top:24px;">
        <h4 style="margin-top:0; color:var(--g-sky-light);">Architectural Blueprint Overview</h4>
        <p style="font-size:0.95rem; color:var(--g-muted); margin-bottom:0;">
          The system operates on an event-driven architecture. The ESP32 edge microcontroller reads analog/digital sensor signals, performs local calibration and noise filtering, and streams JSON telemetry payloads over MQTT topics. The Node.js/Express backend consumes these topics, updates device state in MongoDB via Prisma, logs historical records in InfluxDB, and broadcasts live telemetry packets over WebSockets to connected Web and Mobile clients.
        </p>
      </div>
    </div>
  </section>

  <!-- ── OPERATIONAL PIPELINE ─────────────────────────────── -->
  <section id="pipeline">
    <div class="g-section-header">
      <h2 class="g-section-title">Operational Data Pipeline</h2>
      <p class="g-section-sub">Step-by-step sequence of how telemetry moves from physical probes to actionable user insights.</p>
    </div>

    <div class="g-pipeline-list">
      <div class="g-pipeline-step">
        <div class="g-step-num">1</div>
        <div class="g-step-content">
          <div class="g-step-title">Sensor Acquisition & Analog Calibration</div>
          <div class="g-step-desc">Probes sample physical water metrics (Temperature, pH, TDS, Depth). ESP32 ADC converts raw signals using linear calibration curves.</div>
        </div>
      </div>

      <div class="g-pipeline-step">
        <div class="g-step-num">2</div>
        <div class="g-step-content">
          <div class="g-step-title">Edge Filtering & Hysteresis Processing</div>
          <div class="g-step-desc">Moving average digital filters eliminate transient electrical noise. Hysteresis bounds prevent rapid relay toggling.</div>
        </div>
      </div>

      <div class="g-pipeline-step">
        <div class="g-step-num">3</div>
        <div class="g-step-content">
          <div class="g-step-title">Safe Threshold Evaluation</div>
          <div class="g-step-desc">Readings are continuously validated against user-defined upper/lower bounds stored in non-volatile flash memory.</div>
        </div>
      </div>

      <div class="g-pipeline-step">
        <div class="g-step-num">4</div>
        <div class="g-step-content">
          <div class="g-step-title">Actuator Control & Relay Switching</div>
          <div class="g-step-desc">If metrics breach target thresholds, the control loop triggers relays to activate heaters, water pumps, or automated feeders.</div>
        </div>
      </div>

      <div class="g-pipeline-step">
        <div class="g-step-num">5</div>
        <div class="g-step-content">
          <div class="g-step-title">Telemetry Ingestion & Hybrid Persistence</div>
          <div class="g-step-desc">Data packets stream to MQTT topics. The backend writes active tank status to MongoDB and time-series history to InfluxDB.</div>
        </div>
      </div>

      <div class="g-pipeline-step">
        <div class="g-step-num">6</div>
        <div class="g-step-content">
          <div class="g-step-title">Real-Time UI Push & Multi-Channel Alerts</div>
          <div class="g-step-desc">Live WebSocket streams update React charts immediately. If critical breaches persist, instant Email and Telegram alerts dispatch to operators.</div>
        </div>
      </div>
    </div>
  </section>

  <!-- ── PRAGMATICS: TECH STACK & BILL OF MATERIALS ─────────────────────────────── -->
  <section id="pragmatics">
    <div class="g-section-header">
      <h2 class="g-section-title">Pragmatics & Bill of Materials</h2>
      <p class="g-section-sub">Comprehensive technical implementation stack and transparent hardware cost distribution.</p>
    </div>

    <!-- Tech Stack Matrix -->
    <div class="g-stack-grid">
      <div class="g-stack-card">
        <div class="g-stack-cat">Frontend Layer</div>
        <ul class="g-stack-items">
          <li>React 18 & Vite</li>
          <li>Tailwind CSS & Glassmorphism</li>
          <li>Recharts & ECharts</li>
          <li>Socket.IO Client</li>
        </ul>
      </div>

      <div class="g-stack-card">
        <div class="g-stack-cat">Backend Service</div>
        <ul class="g-stack-items">
          <li>Node.js & Express</li>
          <li>Prisma ORM & MongoDB</li>
          <li>InfluxDB Time-Series</li>
          <li>MQTT Ingestion Engine</li>
        </ul>
      </div>

      <div class="g-stack-card">
        <div class="g-stack-cat">Embedded Firmware</div>
        <ul class="g-stack-items">
          <li>C++ / Arduino Framework</li>
          <li>ESP32 Dual-Core CPU</li>
          <li>PubSubClient MQTT</li>
          <li>Preferences Flash Storage</li>
        </ul>
      </div>

      <div class="g-stack-card">
        <div class="g-stack-cat">Mobile & Alerts</div>
        <ul class="g-stack-items">
          <li>Expo React Native</li>
          <li>Telegram Bot API</li>
          <li>Nodemailer Service</li>
          <li>JWT & Role Security</li>
        </ul>
      </div>
    </div>

    <!-- Rigid Bordered BOM Table -->
    <h3 style="color:#ffffff; font-size:1.3rem; margin-bottom:16px;">Hardware Bill of Materials (BOM)</h3>
    <div class="g-table-wrap">
      <table class="g-bom-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Component Item</th>
            <th>Specification / Details</th>
            <th>Qty</th>
            <th>Unit Cost (LKR)</th>
            <th>Total (LKR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>ESP32 Development Board</td>
            <td>Dual-core 240MHz, Wi-Fi/BLE microcontroller</td>
            <td>1</td>
            <td>4,000</td>
            <td>4,000</td>
          </tr>
          <tr>
            <td>2</td>
            <td>DS18B20 Temperature Sensor</td>
            <td>Waterproof stainless steel thermal probe</td>
            <td>1</td>
            <td>800</td>
            <td>800</td>
          </tr>
          <tr>
            <td>3</td>
            <td>Gravity pH Sensor Module</td>
            <td>DFRobot / pH-4502C analog conditioner probe</td>
            <td>1</td>
            <td>5,000</td>
            <td>5,000</td>
          </tr>
          <tr>
            <td>4</td>
            <td>ORP Sensor Module</td>
            <td>Oxidation-Reduction Potential probe</td>
            <td>1</td>
            <td>6,000</td>
            <td>6,000</td>
          </tr>
          <tr>
            <td>5</td>
            <td>EC Electrical Conductivity Sensor</td>
            <td>Water salinity / EC measurement module</td>
            <td>1</td>
            <td>6,500</td>
            <td>6,500</td>
          </tr>
          <tr>
            <td>6</td>
            <td>TDS Sensor Module</td>
            <td>Total Dissolved Solids analog probe</td>
            <td>1</td>
            <td>2,500</td>
            <td>2,500</td>
          </tr>
          <tr>
            <td>7</td>
            <td>Ultrasonic / Float Level Switch</td>
            <td>Water level detection sensor</td>
            <td>1</td>
            <td>600</td>
            <td>600</td>
          </tr>
          <tr>
            <td>8</td>
            <td>Optocoupled Relay Module</td>
            <td>4-Channel 5V relay board for AC appliances</td>
            <td>1</td>
            <td>1,200</td>
            <td>1,200</td>
          </tr>
          <tr>
            <td>9</td>
            <td>Power Supply & Regulators</td>
            <td>12V DC Adapter, LM2596 Buck Converter</td>
            <td>1</td>
            <td>3,000</td>
            <td>3,000</td>
          </tr>
          <tr>
            <td>10</td>
            <td>Enclosure & Wiring Accessories</td>
            <td>Waterproof IP65 junction box, terminal blocks</td>
            <td>-</td>
            <td>2,000</td>
            <td>2,000</td>
          </tr>
          <tr class="g-total-row">
            <td colspan="5" style="text-align:right;">ESTIMATED TOTAL HARDWARE COST:</td>
            <td>34,600 LKR</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- ── METADATA & FOOTER ─────────────────────────────── -->
  <footer class="g-footer" id="team">
    <div class="g-container">
      <div class="g-footer-grid">
        <div>
          <div class="g-footer-brand">🛡️ GUARD System</div>
          <p class="g-footer-desc">
            Modular IoT Aquarium & Water Quality Management System.<br>
            Developed at the Department of Computer Engineering, Faculty of Engineering, University of Peradeniya.
          </p>
        </div>

        <div>
          <div class="g-footer-title">Engineering Team</div>
          <ul class="g-footer-links">
            <li>• Ravindu Ashan (<a href="mailto:e21039@eng.pdn.ac.lk">e21039@eng.pdn.ac.lk</a>)</li>
            <li>• Shashika Sathsarani (<a href="mailto:e21362@eng.pdn.ac.lk">e21362@eng.pdn.ac.lk</a>)</li>
            <li>• Thisen Lakdinu (<a href="mailto:e21231@eng.pdn.ac.lk">e21231@eng.pdn.ac.lk</a>)</li>
          </ul>
        </div>

        <div>
          <div class="g-footer-title">Quick Resources</div>
          <ul class="g-footer-links">
            <li><a href="https://github.com/cepdnaclk/e21-3yp-GUARD" target="_blank">GitHub Code Repository ↗</a></li>
            <li><a href="http://www.ce.pdn.ac.lk/" target="_blank">Department of Computer Engineering ↗</a></li>
            <li><a href="https://eng.pdn.ac.lk/" target="_blank">Faculty of Engineering, Peradeniya ↗</a></li>
          </ul>
        </div>
      </div>

      <div class="g-bottom-bar">
        © 2026 e21-3yp-GUARD Team. Released under the MIT License. | <a href="#top" style="color:var(--g-sky-light);">Back to Top ↑</a>
      </div>
    </div>
  </footer>

</div>
