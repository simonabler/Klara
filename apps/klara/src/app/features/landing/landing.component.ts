import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page">

      <!-- ══ HEADER ══ -->
      <header class="site-header">
        <div class="header-inner">
          <div class="logo-group">
            <svg width="28" height="28" viewBox="0 0 44 44" fill="none">
              <rect x="2" y="2" width="22" height="28" rx="5" fill="#2E3F5C"/>
              <rect x="16" y="8" width="18" height="18" rx="4" fill="#7BAABA"/>
              <rect x="22" y="24" width="12" height="12" rx="3" fill="#D4B896" opacity=".9"/>
            </svg>
            <span class="logo-name">klara</span>
          </div>
          <nav class="header-nav">
            @if (isLoggedIn) {
              <a routerLink="/app" class="btn-header btn-header--primary">Zur App</a>
            } @else {
              <a routerLink="/login" class="btn-header">Anmelden</a>
            }
          </nav>
        </div>
      </header>

      <!-- ══ HERO ══ -->
      <section class="hero">
        <div class="hero-inner">
          <p class="overline">Für Lehrkräfte</p>
          <h1 class="hero-headline">
            Schüler dokumentieren.<br>
            <em>Klar und ruhig.</em>
          </h1>
          <p class="hero-sub">
            Klara ist ein schlankes Werkzeug, das Lehrkräfte bei der täglichen
            Dokumentation von Schülern, Beobachtungen und Leistungen unterstützt —
            ohne unnötige Komplexität.
          </p>
          <div class="hero-actions">
            <a routerLink="/login" class="btn-cta">
              Jetzt kostenlos starten
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </a>
            <a href="#features" class="btn-ghost-cta">Mehr erfahren</a>
          </div>
        </div>

        <!-- Dekoratives Muster -->
        <div class="hero-deco" aria-hidden="true">
          <svg width="320" height="280" viewBox="0 0 320 280" fill="none" opacity="0.06">
            <rect x="0"   y="0"   width="140" height="180" rx="20" fill="#2E3F5C"/>
            <rect x="100" y="40"  width="120" height="120" rx="16" fill="#7BAABA"/>
            <rect x="150" y="130" width="80"  height="80"  rx="12" fill="#D4B896"/>
            <rect x="60"  y="160" width="60"  height="60"  rx="10" fill="#2E3F5C"/>
          </svg>
        </div>
      </section>

      <!-- ══ FEATURES ══ -->
      <section class="features" id="features">
        <div class="section-inner">
          <p class="section-overline">Was Klara kann</p>
          <h2 class="section-title">Alles Wesentliche. Nichts Überflüssiges.</h2>

          <div class="feature-grid">

            <div class="feature-card">
              <div class="feature-icon feature-icon--teal">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <h3>Schülerverwaltung</h3>
              <p>Legen Sie Schülerprofile mit Stammdaten, Profilbild und Elterninformationen an — schnell und übersichtlich.</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon feature-icon--sand">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <h3>Fachbezogene Notizen</h3>
              <p>Dokumentieren Sie Mitarbeit und Verhalten kontextbezogen — je Fach, je Schulstufe, jederzeit nachvollziehbar.</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon feature-icon--navy">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <h3>Leistungsdokumentation</h3>
              <p>Erfassen Sie Schularbeiten und Überprüfungen mit Ergebnissen, Noten und Kommentaren — für die ganze Klasse auf einmal.</p>
            </div>

          </div>
        </div>
      </section>

      <!-- ══ SCHRITTE ══ -->
      <section class="steps">
        <div class="section-inner">
          <p class="section-overline">Wie es funktioniert</p>
          <h2 class="section-title">In drei Schritten startklar.</h2>

          <div class="steps-row">
            <div class="step">
              <div class="step-num">1</div>
              <h4>Schüler anlegen</h4>
              <p>Profil mit Namen, Bild und Elterninformationen in Sekunden erstellt.</p>
            </div>
            <div class="step-connector" aria-hidden="true">
              <svg width="32" height="2" viewBox="0 0 32 2"><line x1="0" y1="1" x2="32" y2="1" stroke="#DDE3E8" stroke-width="1.5" stroke-dasharray="4 3"/></svg>
            </div>
            <div class="step">
              <div class="step-num">2</div>
              <h4>Klassen zuordnen</h4>
              <p>Schüler Klassen und Fächern zuweisen — Struktur entsteht sofort.</p>
            </div>
            <div class="step-connector" aria-hidden="true">
              <svg width="32" height="2" viewBox="0 0 32 2"><line x1="0" y1="1" x2="32" y2="1" stroke="#DDE3E8" stroke-width="1.5" stroke-dasharray="4 3"/></svg>
            </div>
            <div class="step">
              <div class="step-num">3</div>
              <h4>Leistungen erfassen</h4>
              <p>Notizen, Schularbeiten und Beobachtungen direkt im Kontext dokumentieren.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ══ CTA ══ -->
      <section class="cta-section">
        <div class="cta-inner">
          <h2 class="cta-title">Für Lehrkräfte gemacht.</h2>
          <p class="cta-sub">
            Kein Einrichten. Kein Schulungsbedarf.<br>
            Sofort nützlich — vom ersten Tag an.
          </p>
          <a routerLink="/login" class="btn-cta">
            Jetzt kostenlos starten
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </a>
        </div>
      </section>

      <!-- ══ FOOTER ══ -->
      <footer class="site-footer">
        <div class="footer-inner">
          <span class="footer-logo">klara</span>
          <span class="footer-sep">·</span>
          <span>© {{ year }} Simon Abler</span>
          <span class="footer-sep">·</span>
          <span class="footer-claim">A clear and quiet tool for teachers</span>
          <span class="footer-sep">·</span>
          <a routerLink="/impressum" class="footer-link">Impressum</a>
        </div>
      </footer>

    </div>
  `,
  styles: [`
    /* ── Page ── */
    .page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--off-white);
    }

    /* ── Header ── */
    .site-header {
      position: sticky;
      top: 0;
      z-index: 20;
      background: rgba(244, 242, 238, 0.92);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--border);
    }
    .header-inner {
      max-width: 1000px;
      margin: 0 auto;
      padding: var(--sp-3) var(--sp-6);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .logo-group {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
    }
    .logo-name {
      font-family: var(--font-body);
      font-weight: 300;
      font-size: 22px;
      color: var(--navy);
      letter-spacing: -0.3px;
    }
    .btn-header {
      padding: 8px 20px;
      border: 1.5px solid var(--border);
      border-radius: var(--r-sm);
      font-family: var(--font-body);
      font-size: 13px;
      font-weight: 500;
      color: var(--navy);
      text-decoration: none;
      background: var(--white);
      transition: border-color .15s, box-shadow .15s;
    }
    .btn-header:hover { border-color: var(--navy); box-shadow: var(--sh-sm); }
    .btn-header--primary {
      background: var(--navy);
      color: var(--white);
      border-color: var(--navy);
    }
    .btn-header--primary:hover { background: #243350; box-shadow: var(--sh-md); }

    /* ── Hero ── */
    .hero {
      position: relative;
      overflow: hidden;
      padding: var(--sp-8) var(--sp-6);
      padding-top: 80px;
      padding-bottom: 80px;
    }
    .hero-inner {
      max-width: 600px;
      margin: 0 auto;
      text-align: center;
      position: relative;
      z-index: 1;
    }
    .overline {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1.6px;
      text-transform: uppercase;
      color: var(--teal);
      margin-bottom: var(--sp-4);
    }
    .hero-headline {
      font-family: var(--font-display);
      font-size: clamp(36px, 6vw, 56px);
      font-weight: 400;
      color: var(--navy);
      line-height: 1.15;
      margin-bottom: var(--sp-5);
    }
    .hero-headline em {
      font-style: italic;
      color: var(--teal);
    }
    .hero-sub {
      font-size: 16px;
      color: var(--ink-light);
      line-height: 1.75;
      margin-bottom: var(--sp-6);
      max-width: 480px;
      margin-left: auto;
      margin-right: auto;
    }
    .hero-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--sp-4);
      flex-wrap: wrap;
    }
    .hero-deco {
      position: absolute;
      right: -40px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      display: none;
    }
    @media (min-width: 900px) { .hero-deco { display: block; } }

    /* ── Buttons ── */
    .btn-cta {
      display: inline-flex;
      align-items: center;
      gap: var(--sp-2);
      padding: 13px 28px;
      background: var(--navy);
      color: var(--white);
      border-radius: var(--r-sm);
      font-family: var(--font-body);
      font-size: 15px;
      font-weight: 500;
      text-decoration: none;
      transition: background .15s, box-shadow .15s, transform .15s;
    }
    .btn-cta:hover {
      background: #243350;
      box-shadow: var(--sh-md);
      transform: translateY(-1px);
    }
    .btn-ghost-cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 12px 20px;
      color: var(--ink-light);
      font-family: var(--font-body);
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      border-radius: var(--r-sm);
      transition: color .15s;
    }
    .btn-ghost-cta:hover { color: var(--navy); }

    /* ── Sections gemeinsam ── */
    .section-inner {
      max-width: 1000px;
      margin: 0 auto;
      padding: var(--sp-8) var(--sp-6);
    }
    .section-overline {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1.4px;
      text-transform: uppercase;
      color: var(--teal);
      margin-bottom: var(--sp-3);
    }
    .section-title {
      font-family: var(--font-display);
      font-size: clamp(24px, 4vw, 34px);
      font-weight: 400;
      color: var(--navy);
      margin-bottom: var(--sp-7);
      line-height: 1.25;
    }

    /* ── Features ── */
    .features { background: var(--white); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--sp-5);
    }
    @media (max-width: 720px) { .feature-grid { grid-template-columns: 1fr; } }

    .feature-card {
      background: var(--off-white);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      padding: var(--sp-6);
      transition: box-shadow .15s, transform .15s;
    }
    .feature-card:hover {
      box-shadow: var(--sh-md);
      transform: translateY(-2px);
    }
    .feature-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--r-md);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--sp-4);
    }
    .feature-icon--teal  { background: var(--light-teal); color: var(--navy); }
    .feature-icon--sand  { background: #EDD9C4; color: #7A5A3A; }
    .feature-icon--navy  { background: var(--navy); color: var(--white); }

    .feature-card h3 {
      font-family: var(--font-body);
      font-size: 16px;
      font-weight: 600;
      color: var(--navy);
      margin-bottom: var(--sp-3);
    }
    .feature-card p {
      font-size: 14px;
      color: var(--ink-light);
      line-height: 1.7;
    }

    /* ── Schritte ── */
    .steps { background: var(--off-white); }

    .steps-row {
      display: flex;
      align-items: flex-start;
      gap: var(--sp-3);
    }
    @media (max-width: 680px) {
      .steps-row { flex-direction: column; gap: var(--sp-4); }
      .step-connector { display: none; }
    }

    .step {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .step-num {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--navy);
      color: var(--white);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 400;
      margin-bottom: var(--sp-4);
      flex-shrink: 0;
    }
    .step h4 {
      font-size: 15px;
      font-weight: 600;
      color: var(--navy);
      margin-bottom: var(--sp-2);
    }
    .step p {
      font-size: 13px;
      color: var(--ink-faint);
      line-height: 1.6;
    }
    .step-connector {
      flex-shrink: 0;
      margin-top: 20px;
      opacity: 0.6;
    }

    /* ── CTA Section ── */
    .cta-section {
      background: var(--navy);
      border-top: 1px solid rgba(255,255,255,.06);
    }
    .cta-inner {
      max-width: 600px;
      margin: 0 auto;
      padding: var(--sp-8) var(--sp-6);
      text-align: center;
    }
    .cta-title {
      font-family: var(--font-display);
      font-size: clamp(28px, 4vw, 40px);
      font-weight: 400;
      color: var(--white);
      margin-bottom: var(--sp-4);
      line-height: 1.2;
    }
    .cta-sub {
      font-size: 15px;
      color: rgba(255,255,255,.6);
      line-height: 1.7;
      margin-bottom: var(--sp-6);
    }
    .cta-section .btn-cta {
      background: var(--white);
      color: var(--navy);
    }
    .cta-section .btn-cta:hover {
      background: var(--off-white);
      box-shadow: 0 4px 20px rgba(0,0,0,.25);
    }

    /* ── Footer ── */
    .site-footer {
      border-top: 1px solid var(--border);
      background: var(--off-white);
      padding: var(--sp-5) var(--sp-6);
    }
    .footer-inner {
      max-width: 1000px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: var(--sp-3);
      font-size: 12px;
      color: var(--ink-faint);
    }
    .footer-logo {
      font-family: var(--font-body);
      font-weight: 300;
      font-size: 15px;
      color: var(--navy);
    }
    .footer-sep { color: var(--border); }
    .footer-link {
      color: var(--ink-faint);
      text-decoration: none;
      transition: color .15s;
    }
    .footer-link:hover { color: var(--navy); }
    .footer-claim { color: var(--ink-faint); font-style: italic; }
  `],
})
export class LandingComponent implements OnInit {
  readonly year = new Date().getFullYear();
  isLoggedIn = false;

  private readonly seo = inject(SeoService);
  private readonly platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    this.seo.set({
      title: 'Klara – Dokumentationstool für Lehrkräfte',
      description:
        'Klara ist ein einfaches, elegantes Werkzeug für Lehrkräfte zur Dokumentation von Schülern, Notizen und Leistungen. Klar, ruhig, sofort nützlich.',
      canonical: '/',
    });

    // Auth-Status nur im Browser prüfen – SSR-safe
    if (isPlatformBrowser(this.platformId)) {
      this.isLoggedIn = !!localStorage.getItem('klara_token');
    }
  }
}
