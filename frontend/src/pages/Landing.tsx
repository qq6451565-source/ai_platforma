import { Link } from "react-router-dom";
import "./Landing.css";

const sidebarItems = [
  { label: "Home", target: "#home" },
  { label: "Work", target: "#work" },
  { label: "Contact", target: "#contact" },
  { label: "About", target: "#about" },
];

const LandingPage = () => {
  return (
    <div className="landing-page">
      <div className="landing-aurora landing-aurora-cyan" />
      <div className="landing-aurora landing-aurora-magenta" />
      <div className="landing-grid" />
      <div className="landing-particles" />

      <aside className="landing-sidebar glass-card">
        <div className="landing-logo">NeonLab</div>
        <nav>
          {sidebarItems.map((item) => (
            <a key={item.label} href={item.target} className="landing-sidebar-link">
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      <main className="landing-main glass-card">
        <section className="landing-hero" id="home">
          <div className="landing-hero-copy">
            <p className="landing-badge">Future Interface</p>
            <h1>Beyond Imagination</h1>
            <p className="landing-description">
              Build immersive digital products with premium visuals, cinematic depth,
              and next-gen interaction language.
            </p>
            <p className="landing-description">
              A neon-gradient playground where bold ideas turn into high-tech user
              experiences.
            </p>
            <div className="landing-actions">
              <Link to="/login" className="landing-btn landing-btn-primary">
                Explore Now
              </Link>
              <Link to="/register" className="landing-btn landing-btn-outline">
                View Demo
              </Link>
            </div>

            <div className="landing-meta">
              <article className="glass-mini-card">
                <span>Realtime Vision</span>
                <strong>98.7%</strong>
              </article>
              <article className="glass-mini-card">
                <span>Neural Uptime</span>
                <strong>24/7</strong>
              </article>
              <article className="glass-mini-card">
                <span>Latency</span>
                <strong>12ms</strong>
              </article>
            </div>
          </div>

          <div className="landing-hero-visual" aria-label="Holographic portrait illustration">
            <div className="hologram-core">
              <div className="hologram-ring hologram-ring-cyan" />
              <div className="hologram-ring hologram-ring-magenta" />
              <div className="hologram-scanline" />
              <div className="hologram-avatar">
                <div className="hologram-face" />
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="work">
          <div className="landing-section-header">
            <p className="landing-section-kicker">Work</p>
            <h2>Projects that glow with intelligence</h2>
          </div>
          <div className="landing-section-grid">
            <article className="glass-feature-card">
              <h3>Immersive Live Rooms</h3>
              <p>Multi-stream classrooms with holographic overlays and realtime telemetry.</p>
            </article>
            <article className="glass-feature-card">
              <h3>AI Study Signals</h3>
              <p>Insightful dashboards that track focus, progress, and adaptive learning.</p>
            </article>
            <article className="glass-feature-card">
              <h3>Neon Operations</h3>
              <p>Unified admin control for assignments, assessments, and attendance.</p>
            </article>
          </div>
        </section>

        <section className="landing-section" id="about">
          <div className="landing-section-header">
            <p className="landing-section-kicker">About</p>
            <h2>Crafted for premium education experiences</h2>
          </div>
          <div className="landing-section-stack">
            <div className="glass-feature-card">
              <h3>Human-centered glow</h3>
              <p>Balanced contrast, layered depth, and spacious layouts keep focus on learning.</p>
            </div>
            <div className="glass-feature-card">
              <h3>Security & compliance</h3>
              <p>Face verification and proctoring flows are designed for trust and clarity.</p>
            </div>
          </div>
        </section>

        <section className="landing-section landing-contact" id="contact">
          <div className="landing-section-header">
            <p className="landing-section-kicker">Contact</p>
            <h2>Ready to explore the future?</h2>
          </div>
          <div className="landing-contact-card glass-card">
            <div>
              <h3>Start with a guided tour</h3>
              <p>Let our team walk you through the neon roadmap and immersive features.</p>
            </div>
            <div className="landing-actions">
              <Link to="/register" className="landing-btn landing-btn-primary">
                Book a Session
              </Link>
              <Link to="/login" className="landing-btn landing-btn-outline">
                Ask a Question
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
