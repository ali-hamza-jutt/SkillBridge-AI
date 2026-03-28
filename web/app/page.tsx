import Link from "next/link";

export default function Home() {
  return (
    <main className="app-root">
      <header className="topbar-wrap">
        <div className="site-shell topbar">
          <Link href="/" className="site-brand brand-mark">SkillBridge</Link>

          <nav className="main-nav" aria-label="Primary Navigation">
            <Link href="#" className="nav-link">Hire Freelancers</Link>
            <Link href="#" className="nav-link">Find Work</Link>
            <Link href="#" className="nav-link">Why SkillBridge</Link>
            <Link href="/login" className="nav-link">Login</Link>
          </nav>

          <Link href="/signup" className="btn btn-primary">Post a Job</Link>
        </div>
      </header>

      <div className="site-shell landing-stack">
        <section className="surface-card hero-panel hero-panel-xl animate-rise">
          <div className="hero-grid">
            <div>
              <p className="section-kicker">Find Top Talent In Minutes</p>
              <h1 className="hero-title mt-3">Where great freelancers and bold projects meet.</h1>
              <p className="hero-subtitle mt-4">
                SkillBridge helps companies hire skilled professionals faster and empowers freelancers
                to discover high-quality opportunities across top domains.
              </p>

              <div className="hero-cta-row mt-8">
                <Link href="/signup" className="btn btn-primary">I Need Freelancer</Link>
                <Link href="/signup" className="btn btn-secondary">I Need Work</Link>
              </div>

              <div className="chip-row mt-6">
                <span className="chip">Verified Profiles</span>
                <span className="chip">Real-Time Updates</span>
                <span className="chip">Secure Payments Ready</span>
              </div>
            </div>

            <div className="hero-art" aria-hidden="true">
              <div className="hero-art-orb"></div>
              <div className="hero-art-card hero-art-card-main">
                <p className="hero-art-title">Frontend Developer</p>
                <p className="hero-art-meta">React, Next.js, TypeScript</p>
                <p className="hero-art-price">$35/hr</p>
              </div>
              <div className="hero-art-card hero-art-card-top">
                <p className="hero-art-meta">Bid Received</p>
                <p className="hero-art-title">+12 New Proposals</p>
              </div>
              <div className="hero-art-card hero-art-card-bottom">
                <p className="hero-art-meta">Task Status</p>
                <p className="hero-art-title">Assigned in 2h</p>
              </div>
            </div>
          </div>
        </section>

        <section className="trusted-strip animate-rise">
          <p className="trusted-title">Trusted by fast-growing teams</p>
          <div className="trusted-logos" role="list" aria-label="Trusted client logos">
            <span className="logo-pill" role="listitem">Nexa Labs</span>
            <span className="logo-pill" role="listitem">CloudForge</span>
            <span className="logo-pill" role="listitem">Volt Commerce</span>
            <span className="logo-pill" role="listitem">PixelNest</span>
            <span className="logo-pill" role="listitem">DataBloom</span>
          </div>
        </section>

        <section className="section-block">
          <p className="section-kicker">Popular Domains</p>
          <h2 className="section-title mt-2">Discover talent across high-demand skills</h2>
          <div className="grid-3 mt-5">
            <article className="feature-card">
              <h3 className="feature-title">Web Development</h3>
              <p className="feature-text">Frontend, backend, full-stack, and API experts for modern products.</p>
            </article>
            <article className="feature-card">
              <h3 className="feature-title">Mobile Apps</h3>
              <p className="feature-text">Cross-platform and native app developers for iOS and Android launches.</p>
            </article>
            <article className="feature-card">
              <h3 className="feature-title">UI/UX Design</h3>
              <p className="feature-text">Designers for product strategy, wireframes, design systems, and prototypes.</p>
            </article>
            <article className="feature-card">
              <h3 className="feature-title">AI and Data</h3>
              <p className="feature-text">Machine learning, analytics, and data engineering specialists.</p>
            </article>
            <article className="feature-card">
              <h3 className="feature-title">DevOps and Cloud</h3>
              <p className="feature-text">CI/CD, containerization, infra automation, and cloud architecture support.</p>
            </article>
            <article className="feature-card">
              <h3 className="feature-title">Content and Marketing</h3>
              <p className="feature-text">SEO strategists, content writers, and performance marketing professionals.</p>
            </article>
          </div>
        </section>

        <section className="section-block">
          <p className="section-kicker">Testimonials</p>
          <h2 className="section-title mt-2">People love building with SkillBridge</h2>
          <div className="testimonial-grid mt-5">
            <article className="testimonial-card">
              <p className="testimonial-text">"We hired a backend engineer in less than 24 hours and shipped our milestone ahead of time."</p>
              <div className="testimonial-user">
                <span className="avatar-pill">AR</span>
                <div>
                  <p className="testimonial-name">Ariana Ross</p>
                  <p className="testimonial-role">Product Lead, Nexa Labs</p>
                </div>
              </div>
            </article>

            <article className="testimonial-card">
              <p className="testimonial-text">"The workflow from posting task to assignment feels smooth, especially with realtime updates."</p>
              <div className="testimonial-user">
                <span className="avatar-pill">DK</span>
                <div>
                  <p className="testimonial-name">Dev Khanna</p>
                  <p className="testimonial-role">Founder, CloudForge</p>
                </div>
              </div>
            </article>

            <article className="testimonial-card">
              <p className="testimonial-text">"As a freelancer, I found relevant projects quickly and got clear communication from clients."</p>
              <div className="testimonial-user">
                <span className="avatar-pill">LM</span>
                <div>
                  <p className="testimonial-name">Lina Martin</p>
                  <p className="testimonial-role">Freelance UI Engineer</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <footer className="site-footer">
          <div>
            <p className="site-brand">SkillBridge</p>
            <p className="muted-copy mt-2">Built to connect ambitious teams with exceptional global talent.</p>
          </div>

          <div className="footer-links">
            <Link href="#" className="footer-link">About</Link>
            <Link href="#" className="footer-link">Pricing</Link>
            <Link href="#" className="footer-link">Support</Link>
            <Link href="#" className="footer-link">Privacy</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
