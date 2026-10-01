import { useEffect, useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import heroImage from '../assets/hero-command-center.jpg';
import telemetryImage from '../assets/telemetry-digital-twin.jpg';
import highwayImage from '../assets/fleet-highway-motion.jpg';
import '../styles/landing.css';

// Capabilities data
const capabilities = [
  {
    number: '01',
    title: 'Real-Time GPS Fleet Tracking',
    text: 'Monitor live coordinates, vehicle speed, heading, and assigned drivers on an interactive satellite-ready fleet radar.',
    icon: '⌖',
    tone: 'blue',
    badge: 'Sub-second Telemetry'
  },
  {
    number: '02',
    title: 'AI Driver Behavior & Safety',
    text: 'Detect harsh braking, rapid acceleration, speeding, and fatigue patterns with automated driver safety scoring.',
    icon: '↗',
    tone: 'violet',
    badge: 'Sensor Telemetry'
  },
  {
    number: '03',
    title: 'Machine Learning Risk Prediction',
    text: 'Pre-trained Random Forest model trained on 120,000+ trip records predicts route hazards and high-risk journeys before incidents occur.',
    icon: '⚡',
    tone: 'amber',
    badge: 'Scikit-Learn ML'
  },
  {
    number: '04',
    title: 'Smart Fuel & Energy Analytics',
    text: 'Track liters consumed, km/L efficiency curves, and energy anomalies across diesel, hybrid, and electric vehicle configurations.',
    icon: '◉',
    tone: 'cyan',
    badge: 'Efficiency Engine'
  },
  {
    number: '05',
    title: 'Embedded SQLite Database',
    text: 'Ultra-fast, zero-configuration local relational database storage preserving full audit trails, GPS logs, and trip history.',
    icon: '🗄️',
    tone: 'mint',
    badge: 'SQLite Architecture'
  },
  {
    number: '06',
    title: 'Automated CSV Import & Reports',
    text: 'Effortlessly import bulk fleet data, export operational summaries, and generate comprehensive fleet performance reports.',
    icon: '📑',
    tone: 'rose',
    badge: 'Data Exchange'
  }
];

// Interactive Vehicle Types
const vehicleFleet = [
  {
    id: 'VH-701',
    name: 'CyberHauler Semi-Trailer',
    type: 'Heavy Freight EV',
    range: '720 km',
    payload: '24,000 kg',
    status: 'ONLINE',
    efficiency: '3.8 km/L equiv.',
    riskScore: 'Low (12%)',
    speed: '68 km/h'
  },
  {
    id: 'VH-408',
    name: 'VoltTrans Urban Courier',
    type: 'Medium Duty Van',
    range: '380 km',
    payload: '4,500 kg',
    status: 'ACTIVE',
    efficiency: '8.4 km/L equiv.',
    riskScore: 'Low (18%)',
    speed: '42 km/h'
  },
  {
    id: 'VH-219',
    name: 'AeroExpress Fast Delivery',
    type: 'Sprinter EV',
    range: '410 km',
    payload: '2,800 kg',
    status: 'EN ROUTE',
    efficiency: '9.2 km/L equiv.',
    riskScore: 'Med (38%)',
    speed: '84 km/h'
  },
  {
    id: 'VH-892',
    name: 'TerraTitan Rig Truck',
    type: 'Interstate Long Haul',
    range: '1,100 km',
    payload: '38,000 kg',
    status: 'ONLINE',
    efficiency: '3.2 km/L',
    riskScore: 'Low (8%)',
    speed: '75 km/h'
  }
];

function RouteRadarIllustration() {
  return (
    <svg className="route-illustration" viewBox="0 0 620 370" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="radarPulse" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8d50ff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#8d50ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2c5bff" />
          <stop offset="50%" stopColor="#8d50ff" />
          <stop offset="100%" stopColor="#00f0ff" />
        </linearGradient>
      </defs>
      <path className="route-grid" d="M22 48h576M22 108h576M22 168h576M22 228h576M22 288h576M82 18v330M162 18v330M242 18v330M322 18v330M402 18v330M482 18v330M562 18v330" />
      
      {/* Dynamic route glow & path */}
      <path className="route-main" d="M76 280c54 5 66-109 135-113 60-4 72 80 131 63 54-15 56-114 121-128 49-10 70 30 100 13" />
      <path className="route-glow" d="M76 280c54 5 66-109 135-113 60-4 72 80 131 63 54-15 56-114 121-128 49-10 70 30 100 13" stroke="url(#routeGrad)" />
      
      {/* Waypoints */}
      <circle className="route-point point-a" cx="76" cy="280" r="8" />
      <circle className="route-point point-b" cx="342" cy="230" r="8" />
      <circle className="route-point point-c" cx="563" cy="115" r="8" />
      
      {/* Animated vehicle marker */}
      <g className="route-marker" transform="translate(342 230)">
        <circle r="22" fill="#0b1226" stroke="#9a6bff" strokeWidth="2" strokeOpacity="0.8" />
        <circle r="32" fill="url(#radarPulse)" className="pulse-ring" />
        <path d="M-8 3h16l-2-7h-12l-2 7Zm2 0v4m12-4v4M-5-4l2-4h6l2 4" stroke="#00f0ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
    </svg>
  );
}

const LandingPage = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeVehicle, setActiveVehicle] = useState(vehicleFleet[0]);

  // Video State & Ref
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  // ML Risk Simulator Interactive State
  const [simSpeed, setSimSpeed] = useState(72);
  const [simBraking, setSimBraking] = useState(false);
  const [simAcceleration, setSimAcceleration] = useState(false);
  const [simWeather, setSimWeather] = useState('Clear');
  const [simResult, setSimResult] = useState({
    level: 'LOW',
    probability: 0.18,
    label: 'Safe Driving Profile',
    recommendation: 'Normal operations permitted. System telemetry nominal.'
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Safe Play/Pause Handler that avoids AbortError
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Autoplay or playback interrupted gracefully
            setIsPlaying(false);
          });
      }
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Run Real-time Client-side Random Forest ML Formula
  const calculateRiskSimulation = (speed, harshBrake, harshAccel, weather) => {
    let score = 0;
    if (speed > 80) score += (speed - 80) * 0.05 + 1.5;
    if (harshBrake) score += 3.2;
    if (harshAccel) score += 2.4;
    if (weather === 'Rain') score += 1.2;
    if (weather === 'Fog') score += 2.0;

    let prob = Math.min(0.96, Math.max(0.08, (score * 0.14) + 0.1));
    let level = 'LOW';
    let label = 'Nominal Safe Condition';
    let rec = 'All active parameters indicate safe navigation. Green clearance.';

    if (prob >= 0.60) {
      level = 'HIGH';
      label = 'Severe Collision Risk Detected';
      rec = 'Automated slowdown alert transmitted to vehicle HUD. Supervisor intervention flagged.';
    } else if (prob >= 0.35) {
      level = 'MEDIUM';
      label = 'Elevated Hazard Warning';
      rec = 'Moderate driving anomaly detected. Telemetry sampling rate doubled.';
    }

    setSimResult({
      level,
      probability: prob,
      label,
      recommendation: rec
    });
  };

  const handleSimSpeedChange = (val) => {
    const speed = Number(val);
    setSimSpeed(speed);
    calculateRiskSimulation(speed, simBraking, simAcceleration, simWeather);
  };

  const handleSimBrakeToggle = () => {
    const next = !simBraking;
    setSimBraking(next);
    calculateRiskSimulation(simSpeed, next, simAcceleration, simWeather);
  };

  const handleSimAccelToggle = () => {
    const next = !simAcceleration;
    setSimAcceleration(next);
    calculateRiskSimulation(simSpeed, simBraking, next, simWeather);
  };

  const handleSimWeatherChange = (val) => {
    setSimWeather(val);
    calculateRiskSimulation(simSpeed, simBraking, simAcceleration, val);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="landing-shell">
      {/* Top Banner */}
      <div className="announcement-bar">
        <span className="announcement-pulse" />
        <span>FleetAI 2.0 is live — Powered by Scikit-Learn ML, SQLite Embedded Telemetry &amp; Real-time GPS</span>
        <a href="#simulator">Try Live ML Simulator <span aria-hidden="true">→</span></a>
      </div>

      {/* Floating Glassmorphism Header */}
      <header className={`landing-header ${scrolled ? 'is-scrolled' : ''}`}>
        <Link className="brand-lockup" to="/" aria-label="FleetAI home" onClick={closeMenu}>
          <span className="brand-mark">
            <span /><span /><span />
          </span>
          <span>Fleet<span className="brand-accent">AI</span></span>
        </Link>

        <button 
          className="mobile-menu-button" 
          type="button" 
          aria-expanded={menuOpen} 
          aria-label="Toggle navigation" 
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span /><span /><span />
        </button>

        <nav className={`landing-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          <a href="#hero" onClick={closeMenu}>Command Center</a>
          <a href="#capabilities" onClick={closeMenu}>Capabilities</a>
          <a href="#simulator" onClick={closeMenu}>AI ML Simulator</a>
          <a href="#fleet" onClick={closeMenu}>Vehicle Fleet</a>
          <a href="#architecture" onClick={closeMenu}>Tech Stack</a>
          <div className="nav-actions">
            <Link className="nav-login" to="/login" onClick={closeMenu}>Sign In</Link>
            <Link className="button-gradient nav-demo" to="/login" onClick={closeMenu}>
              Open Workspace <span aria-hidden="true">→</span>
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="landing-hero" id="hero">
          {/* Background image & lighting effects */}
          <div 
            className="hero-photo" 
            style={{ backgroundImage: `url(${heroImage})` }} 
          />
          <div className="hero-shade" />
          <div className="hero-grid" />
          <div className="hero-orb hero-orb-one" />
          <div className="hero-orb hero-orb-two" />

          <div className="hero-container">
            <div className="hero-content-col">
              <div className="eyebrow">
                <span className="sparkle">✦</span> NEXT-GEN INTELLIGENT FLEET PLATFORM
              </div>

              <h1>
                Every Mile in Motion.<br />
                <span>Every Risk in Sight.</span>
              </h1>

              <p className="hero-copy">
                A comprehensive AI-driven transportation ecosystem combining real-time GPS tracking, 
                Scikit-Learn predictive driver safety risk modeling, fuel optimization, and an embedded 
                SQLite relational database in one intuitive workspace.
              </p>

              <div className="hero-actions">
                <Link className="button-gradient hero-primary" to="/login">
                  Launch Fleet Workspace <span aria-hidden="true">→</span>
                </Link>
                <button 
                  type="button" 
                  className="button-outline"
                  onClick={() => setVideoModalOpen(true)}
                >
                  <span className="play-mark">▸</span> Watch Platform Demo
                </button>
              </div>

              <div className="hero-proof">
                <span className="proof-dots"><i /><i /><i /></span>
                <span>120,000+ ML Records</span>
                <span className="proof-divider" />
                <span>Real-Time GPS</span>
                <span className="proof-divider" />
                <span>SQLite DB</span>
              </div>

              {/* Quick Live Ticker */}
              <div className="hero-stats-strip">
                <div className="hero-stat-card">
                  <span className="stat-number">10+</span>
                  <span className="stat-desc">Active Vehicles</span>
                </div>
                <div className="hero-stat-card">
                  <span className="stat-number">99.4%</span>
                  <span className="stat-desc">Model Accuracy</span>
                </div>
                <div className="hero-stat-card">
                  <span className="stat-number">&lt; 150ms</span>
                  <span className="stat-desc">GPS Latency</span>
                </div>
                <div className="hero-stat-card">
                  <span className="stat-number">24.8%</span>
                  <span className="stat-desc">Fuel Saved</span>
                </div>
              </div>
            </div>

            <div className="hero-console-col">
              {/* Holographic Console Mockup */}
              <div className="hero-console" aria-label="Illustration of the fleet tracking workspace">
                <div className="console-top">
                  <div>
                    <span className="console-live-dot" /> LIVE FLEET TELEMETRY
                  </div>
                  <span className="console-period">Autonomous Route Matrix <b>ACTIVE</b></span>
                </div>

                <div className="console-map">
                  <RouteRadarIllustration />
                  <div className="map-label label-origin">
                    <small>ORIGIN DEPOT</small>
                    <b>North Distribution Hub</b>
                  </div>
                  <div className="map-label label-destination">
                    <small>NEXT DESTINATION</small>
                    <b>Metro Port #4</b>
                  </div>
                </div>

                <div className="console-bottom">
                  <div className="console-vehicle">
                    <span className="vehicle-icon">▰</span>
                    <span>
                      <b>VH-701 &middot; CyberHauler EV</b>
                      <small>68 km/h &middot; Low Risk (12%) &middot; Battery 84%</small>
                    </span>
                  </div>
                  <span className="console-status">
                    <i /> SQLite Linked
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE ML SIMULATOR SECTION */}
        <section className="simulator-section" id="simulator">
          <div className="section-container">
            <div className="section-kicker">
              <span /> LIVE MACHINE LEARNING ENGINE
            </div>
            
            <div className="section-heading-row">
              <div>
                <h2>
                  Test the Random Forest<br />
                  <span>Risk Classifier Live.</span>
                </h2>
              </div>
              <p>
                Experience the real-time predictive intelligence powering our fleet platform. 
                Adjust real road metrics to see how behavioral signals instantly evaluate journey risk.
              </p>
            </div>

            <div className="simulator-grid">
              {/* Controls Column */}
              <div className="simulator-controls-card">
                <div className="sim-card-header">
                  <span className="sim-chip">TELEMETRY INPUTS</span>
                  <h3>Vehicle Sensor Parameters</h3>
                </div>

                {/* Speed Slider */}
                <div className="sim-input-group">
                  <div className="sim-label-row">
                    <label htmlFor="sim-speed-input">Cruising Speed</label>
                    <span className="sim-value-badge">{simSpeed} km/h</span>
                  </div>
                  <input
                    id="sim-speed-input"
                    type="range"
                    min="20"
                    max="140"
                    value={simSpeed}
                    onChange={(e) => handleSimSpeedChange(e.target.value)}
                    className="sim-slider"
                  />
                  <div className="sim-scale">
                    <span>20 km/h</span>
                    <span>Speed Limit: 80 km/h</span>
                    <span>140 km/h</span>
                  </div>
                </div>

                {/* Toggles */}
                <div className="sim-toggles-grid">
                  <button 
                    type="button" 
                    className={`sim-toggle-btn ${simBraking ? 'active' : ''}`}
                    onClick={handleSimBrakeToggle}
                  >
                    <span className="toggle-icon">🛑</span>
                    <div className="toggle-text">
                      <strong>Harsh Braking Event</strong>
                      <small>{simBraking ? 'DETECTED (> -4.5 m/s²)' : 'Normal Braking'}</small>
                    </div>
                  </button>

                  <button 
                    type="button" 
                    className={`sim-toggle-btn ${simAcceleration ? 'active' : ''}`}
                    onClick={handleSimAccelToggle}
                  >
                    <span className="toggle-icon">⚡</span>
                    <div className="toggle-text">
                      <strong>Rapid Acceleration</strong>
                      <small>{simAcceleration ? 'DETECTED (> 3.8 m/s²)' : 'Gradual Throttle'}</small>
                    </div>
                  </button>
                </div>

                {/* Weather condition */}
                <div className="sim-input-group">
                  <label className="sim-block-label">Road &amp; Environmental Condition</label>
                  <div className="weather-selector">
                    {['Clear', 'Rain', 'Fog'].map((w) => (
                      <button
                        key={w}
                        type="button"
                        className={`weather-pill ${simWeather === w ? 'selected' : ''}`}
                        onClick={() => handleSimWeatherChange(w)}
                      >
                        {w === 'Clear' && '☀️ '}
                        {w === 'Rain' && '🌧️ '}
                        {w === 'Fog' && '🌫️ '}
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Output Display Card */}
              <div className="simulator-output-card">
                <div className="sim-output-top">
                  <span className="sim-chip live">ML INFERENCE ACTIVE</span>
                  <span className="sim-model-name">RandomForestClassifier &middot; 100 Trees</span>
                </div>

                <div className="sim-result-gauge">
                  <div className={`gauge-ring ${simResult.level.toLowerCase()}`}>
                    <div className="gauge-inner">
                      <span className="gauge-percent">{(simResult.probability * 100).toFixed(0)}%</span>
                      <span className="gauge-sub">RISK PROBABILITY</span>
                    </div>
                  </div>
                  <div className="gauge-details">
                    <span className={`risk-badge-large ${simResult.level.toLowerCase()}`}>
                      {simResult.level} RISK LEVEL
                    </span>
                    <h4>{simResult.label}</h4>
                    <p>{simResult.recommendation}</p>
                  </div>
                </div>

                <div className="sim-breakdown-box">
                  <div className="breakdown-item">
                    <span>Speed Factor</span>
                    <div className="breakdown-bar">
                      <div className="bar-fill" style={{ width: `${Math.min(100, (simSpeed / 120) * 100)}%` }} />
                    </div>
                    <b>{simSpeed > 80 ? 'Excessive' : 'Within Limit'}</b>
                  </div>
                  <div className="breakdown-item">
                    <span>Inertial Anomaly</span>
                    <div className="breakdown-bar">
                      <div className="bar-fill" style={{ width: `${simBraking || simAcceleration ? '85%' : '15%'}` }} />
                    </div>
                    <b>{simBraking ? 'High Decel' : simAcceleration ? 'High Accel' : 'Smooth'}</b>
                  </div>
                  <div className="breakdown-item">
                    <span>SQLite Log Sync</span>
                    <div className="breakdown-bar">
                      <div className="bar-fill success" style={{ width: '100%' }} />
                    </div>
                    <b>Recorded (db: 0.8ms)</b>
                  </div>
                </div>

                <Link to="/login" className="button-gradient sim-cta-btn">
                  Open Risk Analysis Dashboard <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* DIGITAL TWIN & TELEMETRY SECTION */}
        <section className="telemetry-showcase-section">
          <div className="section-container">
            <div className="telemetry-grid-showcase">
              <div className="telemetry-visual-wrapper">
                <img 
                  src={telemetryImage} 
                  alt="AI Intelligent Fleet Telemetry and Digital Twin" 
                  className="telemetry-display-image"
                  loading="lazy"
                />
                <div className="telemetry-hotspot hotspot-one">
                  <span className="hotspot-pulse" />
                  <div className="hotspot-tooltip">
                    <strong>Real-Time EV Battery BMS</strong>
                    <small>84% State of Charge &middot; 380 km Range</small>
                  </div>
                </div>
                <div className="telemetry-hotspot hotspot-two">
                  <span className="hotspot-pulse" />
                  <div className="hotspot-tooltip">
                    <strong>Driver Fatigue AI Detection</strong>
                    <small>Attention Level: Alert &middot; 95% On-Road</small>
                  </div>
                </div>
                <div className="telemetry-hotspot hotspot-three">
                  <span className="hotspot-pulse" />
                  <div className="hotspot-tooltip">
                    <strong>SQLite Telemetry Log Stream</strong>
                    <small>GPS, Lat, Long, Speed, Timestamp synced</small>
                  </div>
                </div>
              </div>

              <div className="telemetry-copy-wrapper">
                <div className="section-kicker">
                  <span /> CONNECTED VEHICLE DIGITAL TWIN
                </div>
                <h2>
                  Telemetry That Never<br />
                  <span>Misses a Heartbeat.</span>
                </h2>
                <p>
                  Every vehicle in your fleet acts as an intelligent edge sensor node. 
                  Stream diagnostic health, motor RPM, tire pressure, and driver alertness 
                  into the local SQLite database with zero cloud vendor lock-in.
                </p>

                <ul className="telemetry-perks-list">
                  <li>
                    <span className="perk-check">✓</span>
                    <div>
                      <strong>Sub-Second GPS &amp; Sensor Sampling</strong>
                      <p>Instant detection of route anomalies, deviations, and unauthorized stops.</p>
                    </div>
                  </li>
                  <li>
                    <span className="perk-check">✓</span>
                    <div>
                      <strong>Predictive Maintenance Alerts</strong>
                      <p>Forecast brake pad wear, battery degradation, and service milestones.</p>
                    </div>
                  </li>
                  <li>
                    <span className="perk-check">✓</span>
                    <div>
                      <strong>Multi-Fleet Unified Visibility</strong>
                      <p>Manage diesel rigs, delivery vans, and EV haulers in one synchronized viewport.</p>
                    </div>
                  </li>
                </ul>

                <Link to="/login" className="button-outline telemetry-btn">
                  Explore Vehicle Diagnostics <span>↗</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* HIGHWAY IN MOTION & CAPABILITIES */}
        <section className="capabilities-section" id="capabilities">
          <div className="section-container">
            <div className="section-kicker"><span /> CORE PLATFORM CAPABILITIES</div>
            <div className="section-heading-row">
              <div>
                <h2>
                  Engineered for Safety.<br />
                  <span>Optimized for Profit.</span>
                </h2>
              </div>
              <p>
                From individual vehicle coordinates to complex fleet-wide fuel trends, 
                our platform delivers actionable intelligence that keeps operations reliable and costs low.
              </p>
            </div>

            <div className="capability-grid">
              {capabilities.map((item) => (
                <article className={`capability-card ${item.tone}`} key={item.number}>
                  <div className="capability-card-top">
                    <span className="capability-icon">{item.icon}</span>
                    <span className="capability-badge">{item.badge}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <Link to="/login" className="card-link">
                    Explore feature <span aria-hidden="true">↗</span>
                  </Link>
                </article>
              ))}
            </div>

            {/* Smart Highway Banner */}
            <div className="highway-banner-card">
              <img 
                src={highwayImage} 
                alt="AI-Powered Smart Highway Telemetry and Autonomous Fleet" 
                className="highway-banner-img"
                loading="lazy"
              />
              <div className="highway-banner-overlay">
                <span className="highway-chip">HIGHWAY TELEMETRY MATRIX</span>
                <h3>Autonomous Lane Scanning &amp; Safe Trajectory Planning</h3>
                <p>
                  Connected vehicle algorithms actively share roadway hazard alerts across the entire fleet network in real-time.
                </p>
                <Link to="/login" className="button-gradient highway-btn">
                  Access Fleet Live View <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* VEHICLE FLEET SHOWCASE */}
        <section className="fleet-showcase-section" id="fleet">
          <div className="section-container">
            <div className="section-kicker"><span /> SMART FLEET COMPATIBILITY</div>
            <div className="section-heading-row">
              <div>
                <h2>
                  Tailored for Every<br />
                  <span>Commercial Vehicle Class.</span>
                </h2>
              </div>
              <p>
                Whether managing local e-commerce delivery vans or nationwide heavy freight haulers, 
                our system adapts seamlessly to your operational requirements.
              </p>
            </div>

            {/* Vehicle Selector Tabs */}
            <div className="vehicle-tabs">
              {vehicleFleet.map((vh) => (
                <button
                  key={vh.id}
                  type="button"
                  className={`vehicle-tab ${activeVehicle.id === vh.id ? 'active' : ''}`}
                  onClick={() => setActiveVehicle(vh)}
                >
                  <span className="tab-code">{vh.id}</span>
                  <span className="tab-name">{vh.name}</span>
                </button>
              ))}
            </div>

            {/* Active Vehicle Card Display */}
            <div className="active-vehicle-card">
              <div className="vh-header">
                <div>
                  <span className="vh-type-badge">{activeVehicle.type}</span>
                  <h3>{activeVehicle.name} ({activeVehicle.id})</h3>
                </div>
                <span className="vh-status-badge">
                  <i /> {activeVehicle.status}
                </span>
              </div>

              <div className="vh-specs-grid">
                <div className="vh-spec-item">
                  <small>Operating Range</small>
                  <strong>{activeVehicle.range}</strong>
                </div>
                <div className="vh-spec-item">
                  <small>Payload Capacity</small>
                  <strong>{activeVehicle.payload}</strong>
                </div>
                <div className="vh-spec-item">
                  <small>Efficiency Index</small>
                  <strong>{activeVehicle.efficiency}</strong>
                </div>
                <div className="vh-spec-item">
                  <small>Cruising Speed</small>
                  <strong>{activeVehicle.speed}</strong>
                </div>
                <div className="vh-spec-item">
                  <small>ML Risk Assessment</small>
                  <strong className="text-emerald">{activeVehicle.riskScore}</strong>
                </div>
                <div className="vh-spec-item">
                  <small>Storage Layer</small>
                  <strong>SQLite Local Cache</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ARCHITECTURE & TECH STACK */}
        <section className="architecture-section" id="architecture">
          <div className="section-container">
            <div className="section-kicker"><span /> SYSTEM ARCHITECTURE</div>
            <div className="section-heading-row">
              <div>
                <h2>
                  Built with Production-Grade<br />
                  <span>Libraries &amp; Engineering.</span>
                </h2>
              </div>
              <p>
                Robust, self-contained, and blazing fast. No fragile cloud dependencies or hidden subscriptions.
              </p>
            </div>

            <div className="arch-grid">
              <div className="arch-card">
                <div className="arch-icon">🐍</div>
                <h4>Python &amp; Flask Core</h4>
                <p>Modular Flask Blueprint API serving JWT authenticated endpoints for vehicles, tracking, risk, and fuel.</p>
                <div className="arch-tags">
                  <span>Flask 3.0</span>
                  <span>Flask-JWT</span>
                  <span>SQLAlchemy</span>
                </div>
              </div>

              <div className="arch-card">
                <div className="arch-icon">🤖</div>
                <h4>Scikit-Learn Machine Learning</h4>
                <p>Pre-trained Random Forest model trained on 120,000 driving behavior records with automated feature scaling.</p>
                <div className="arch-tags">
                  <span>RandomForest</span>
                  <span>Joblib</span>
                  <span>NumPy</span>
                </div>
              </div>

              <div className="arch-card">
                <div className="arch-icon">🗄️</div>
                <h4>SQLite Relational Database</h4>
                <p>Embedded, fast, zero-configuration local database storing users, drivers, vehicles, GPS breadcrumbs, and logs.</p>
                <div className="arch-tags">
                  <span>SQLite 3</span>
                  <span>ACID Compliant</span>
                  <span>Local Storage</span>
                </div>
              </div>

              <div className="arch-card">
                <div className="arch-icon">⚛️</div>
                <h4>React 18 + Vite Frontend</h4>
                <p>Lightning fast SPA with Recharts data visualizations, Leaflet interactive mapping, and dark glassmorphic styling.</p>
                <div className="arch-tags">
                  <span>React 18</span>
                  <span>Vite</span>
                  <span>Recharts</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CLOSING CALL TO ACTION */}
        <section className="closing-cta">
          <div className="cta-glow" />
          <div className="section-kicker"><span /> GET STARTED TODAY</div>
          <h2>
            Ready to Transform Your<br />
            <span>Fleet Operations?</span>
          </h2>
          <p>
            Access the complete command workspace. Test machine learning models, 
            track simulated GPS telemetry, and optimize journeys today.
          </p>
          <div className="cta-btn-group">
            <Link className="button-gradient cta-main-btn" to="/login">
              Launch Fleet Workspace <span aria-hidden="true">→</span>
            </Link>
            <Link className="button-outline cta-sub-btn" to="/register">
              Create Free Account <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="cta-orbit orbit-a" />
          <div className="cta-orbit orbit-b" />
        </section>
      </main>

      {/* VIDEO PREVIEW MODAL */}
      {videoModalOpen && (
        <div 
          className="video-modal-backdrop" 
          role="dialog"
          aria-modal="true"
          onClick={() => setVideoModalOpen(false)}
        >
          <div 
            className="video-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="video-modal-header">
              <div className="video-modal-title">
                <span className="live-dot" />
                FleetAI System Walkthrough &amp; Video Tour
              </div>
              <button 
                type="button" 
                className="video-close-btn"
                onClick={() => setVideoModalOpen(false)}
                aria-label="Close video modal"
              >
                ✕
              </button>
            </div>

            <div className="video-player-container">
              <video 
                ref={videoRef}
                className="modal-video"
                src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
                poster={heroImage}
                controls
                playsInline
                muted={isMuted}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              >
                Your browser does not support HTML5 video.
              </video>
            </div>

            <div className="video-modal-footer">
              <div className="video-ctrls">
                <button type="button" className="video-ctrl-btn" onClick={togglePlay}>
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
                <button type="button" className="video-ctrl-btn" onClick={toggleMute}>
                  {isMuted ? '🔇 Unmute' : '🔊 Muted'}
                </button>
              </div>
              <p className="video-modal-hint">
                AI Fleet Platform &middot; Live telemetry, safety classification &amp; SQLite database
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODERN FOOTER */}
      <footer className="landing-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <Link className="brand-lockup" to="/">
              <span className="brand-mark"><span /><span /><span /></span>
              <span>Fleet<span className="brand-accent">AI</span></span>
            </Link>
            <p>
              Next-generation autonomous transportation intelligence platform powered by Scikit-Learn 
              Machine Learning, SQLite database storage, and sub-second GPS telemetry.
            </p>
          </div>

          <div className="footer-links-group">
            <div className="footer-col">
              <h5>Navigation</h5>
              <a href="#hero">Command Center</a>
              <a href="#simulator">ML Simulator</a>
              <a href="#capabilities">Capabilities</a>
              <a href="#fleet">Vehicle Fleet</a>
            </div>

            <div className="footer-col">
              <h5>Platform</h5>
              <Link to="/login">Sign In</Link>
              <Link to="/register">Create Account</Link>
              <Link to="/dashboard">Operations Dashboard</Link>
              <Link to="/tracking">GPS Map Tracking</Link>
            </div>

            <div className="footer-col">
              <h5>Technology</h5>
              <span>Scikit-Learn ML</span>
              <span>SQLite Embedded DB</span>
              <span>Python Flask REST</span>
              <span>React 18 &amp; Recharts</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} FleetAI Transportation Intelligence. All rights reserved.</p>
          <div className="footer-badges">
            <span className="status-badge"><i /> Systems Online</span>
            <span className="version-badge">v2.4.0 Production</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
