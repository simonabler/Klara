import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo.service';

@Component({
  selector: 'app-impressum',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page">

      <!-- ── Header ── -->
      <header class="site-header">
        <a routerLink="/login" class="logo-group">
          <svg width="26" height="26" viewBox="0 0 44 44" fill="none">
            <rect x="2" y="2" width="22" height="28" rx="5" fill="#2E3F5C"/>
            <rect x="16" y="8" width="18" height="18" rx="4" fill="#7BAABA"/>
            <rect x="22" y="24" width="12" height="12" rx="3" fill="#D4B896" opacity=".9"/>
          </svg>
          <span class="logo-name">klara</span>
        </a>
        <a routerLink="/login" class="btn-header">Anmelden</a>
      </header>

      <!-- ── Main ── -->
      <main class="content">

        <div class="page-intro">
          <p class="overline">Rechtliches</p>
          <h1>Impressum</h1>
          <p class="lead">
            Angaben gemäß österreichischem E-Commerce-Gesetz und Medienrecht
            (ECG&nbsp;§&nbsp;5, MedienG&nbsp;§&nbsp;25).
          </p>
        </div>

        <!-- Betreiber -->
        <section class="card">
          <h2>Betreiber</h2>
          <dl class="info-list">
            <div class="info-row">
              <dt>Name</dt>
              <dd>Simon Abler</dd>
            </div>
            <div class="info-row">
              <dt>Adresse</dt>
              <dd>Au 151, 6553 See, Österreich</dd>
            </div>
            <div class="info-row">
              <dt>Kontakt</dt>
              <dd>
                Bei Fragen bitte per E-Mail:
                <code class="email">simon [at] abler [dot] tirol</code>
              </dd>
            </div>
          </dl>
        </section>

        <!-- Inhaltliche Verantwortung -->
        <section class="card">
          <h2>Inhaltliche Verantwortung</h2>
          <p>
            Simon Abler (identisch mit den oben genannten Kontaktdaten).
          </p>
        </section>

        <!-- Hinweis -->
        <section class="card">
          <h2>Hinweis zum privaten Betrieb</h2>
          <p>
            Klara ist ein privat betriebenes Nebenprojekt und kein eingetragenes
            Unternehmen. Alle Angaben erfolgen nach bestem Wissen; eine Haftung für
            externe Inhalte oder Links wird nicht übernommen.
          </p>
        </section>

        <!-- Open Source -->
        <section class="card">
          <h2>Open-Source-Nachweise</h2>
          <p class="card-intro">
            Dieses Projekt verwendet folgende Open-Source-Bibliotheken:
          </p>
          <ul class="oss-table">
            <li>
              <span class="oss-name">Angular</span>
              <span class="badge">MIT</span>
              <span class="oss-copy">Copyright © Google LLC</span>
            </li>
            <li>
              <span class="oss-name">NestJS</span>
              <span class="badge">MIT</span>
              <span class="oss-copy">Copyright © 2017–2025 Kamil Mysliwiec and Contributors</span>
            </li>
            <li>
              <span class="oss-name">Nx</span>
              <span class="badge">MIT</span>
              <span class="oss-copy">Copyright © Nx, Inc.</span>
            </li>
            <li>
              <span class="oss-name">Bootstrap</span>
              <span class="badge">MIT</span>
              <span class="oss-copy">Copyright © The Bootstrap Authors</span>
            </li>
            <li>
              <span class="oss-name">Lucide / lucide-angular</span>
              <span class="badge badge-isc">ISC</span>
              <span class="oss-copy">Copyright © Lucide Contributors</span>
            </li>
            <li>
              <span class="oss-name">RxJS</span>
              <span class="badge badge-apache">Apache 2.0</span>
              <span class="oss-copy">Copyright © Google LLC and contributors</span>
            </li>
            <li>
              <span class="oss-name">sharp</span>
              <span class="badge badge-apache">Apache 2.0</span>
              <span class="oss-copy">Copyright © Lovell Fuller and contributors</span>
            </li>
            <li>
              <span class="oss-name">bwip-js</span>
              <span class="badge">MIT</span>
              <span class="oss-copy">Copyright © Metafloor</span>
            </li>
            <li>
              <span class="oss-name">qrcode</span>
              <span class="badge">MIT</span>
              <span class="oss-copy">Copyright © Soldair (Ryan Day)</span>
            </li>
            <li>
              <span class="oss-name">sanitize-html</span>
              <span class="badge">MIT</span>
              <span class="oss-copy">Copyright © Apostrophe Technologies</span>
            </li>
            <li>
              <span class="oss-name">marked</span>
              <span class="badge">MIT</span>
              <span class="oss-copy">Copyright © Christopher Jeffrey</span>
            </li>
            <li>
              <span class="oss-name">uuid</span>
              <span class="badge">MIT</span>
              <span class="oss-copy">Copyright © 2010–2025 Robert Kieffer and Contributors</span>
            </li>
          </ul>
          <p class="oss-footnote">
            Die vollständige Liste mit Lizenztexten ist in
            <code>OPEN_SOURCE_NOTICES.md</code> im Projektrepository einsehbar.
          </p>
        </section>

      </main>

      <!-- ── Footer ── -->
      <footer class="site-footer">
        <span class="footer-brand">klara</span>
        <span class="footer-sep">·</span>
        <span>© {{ year }} Simon Abler</span>
        <span class="footer-sep">·</span>
        <a routerLink="/impressum" class="footer-link footer-link--active">Impressum</a>
        <span class="footer-sep">·</span>
        <a routerLink="/datenschutz" class="footer-link">Datenschutz</a>
      </footer>

    </div>
  `,
  styles: [`
    /* ── Page shell ── */
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
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--sp-3) var(--sp-6);
      background: var(--white);
      border-bottom: 1px solid var(--border);
      box-shadow: var(--sh-sm);
    }

    .logo-group {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      text-decoration: none;
    }

    .logo-name {
      font-family: var(--font-body);
      font-weight: 300;
      font-size: 21px;
      color: var(--navy);
      letter-spacing: -0.3px;
    }

    .btn-header {
      padding: 7px 18px;
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
    .btn-header:hover {
      border-color: var(--navy);
      box-shadow: var(--sh-sm);
    }

    /* ── Content ── */
    .content {
      flex: 1;
      max-width: 700px;
      width: 100%;
      margin: 0 auto;
      padding: var(--sp-7) var(--sp-5) var(--sp-8);
      display: flex;
      flex-direction: column;
      gap: var(--sp-4);
    }

    /* ── Intro ── */
    .page-intro {
      margin-bottom: var(--sp-2);
    }

    .overline {
      display: block;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: var(--teal);
      margin-bottom: var(--sp-3);
    }

    h1 {
      font-family: var(--font-display);
      font-size: 34px;
      font-weight: 400;
      color: var(--navy);
      line-height: 1.2;
      margin-bottom: var(--sp-3);
    }

    .lead {
      font-size: 14px;
      color: var(--ink-faint);
      line-height: 1.7;
    }

    /* ── Section cards ── */
    .card {
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      padding: var(--sp-5) var(--sp-6);
      box-shadow: var(--sh-sm);
    }

    /* Section label – same pattern as rest of app */
    .card h2 {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1.4px;
      text-transform: uppercase;
      color: var(--ink-faint);
      margin-bottom: var(--sp-4);
      padding-bottom: var(--sp-3);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: var(--sp-3);
    }

    .card h2::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border);
    }

    .card p {
      font-size: 14px;
      color: var(--ink-light);
      line-height: 1.7;
    }

    .card-intro {
      margin-bottom: var(--sp-4) !important;
    }

    /* ── Info list (Betreiber) ── */
    .info-list {
      display: flex;
      flex-direction: column;
    }

    .info-row {
      display: grid;
      grid-template-columns: 96px 1fr;
      gap: var(--sp-4);
      padding: var(--sp-3) 0;
      border-bottom: 1px solid var(--border);
    }
    .info-row:first-child { padding-top: 0; }
    .info-row:last-child  { border-bottom: none; padding-bottom: 0; }

    dt {
      font-size: 13px;
      font-weight: 500;
      color: var(--ink-faint);
      padding-top: 1px;
    }

    dd {
      margin: 0;
      font-size: 14px;
      color: var(--ink);
      line-height: 1.6;
    }

    .email {
      display: inline-block;
      margin-top: var(--sp-2);
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 12px;
      color: var(--navy);
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 3px 8px;
      border-radius: var(--r-sm);
    }

    /* ── OSS table ── */
    .oss-table {
      list-style: none;
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      overflow: hidden;
      margin-bottom: var(--sp-4);
    }

    .oss-table li {
      display: grid;
      grid-template-columns: 1.5fr 80px 1fr;
      align-items: center;
      gap: var(--sp-3);
      padding: 10px var(--sp-4);
      border-bottom: 1px solid var(--border);
      font-size: 13px;
    }
    .oss-table li:last-child  { border-bottom: none; }
    .oss-table li:nth-child(even) { background: var(--surface); }

    .oss-name {
      font-weight: 500;
      color: var(--navy);
    }

    /* License badges – reuse global chip style */
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px 9px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      background: var(--light-teal);
      color: var(--navy);
      width: fit-content;
    }
    .badge-isc    { background: #EDD9C4; color: #7A5A3A; }
    .badge-apache { background: #E8F4F8; color: var(--info-fg); }

    .oss-copy {
      font-size: 12px;
      color: var(--ink-faint);
    }

    .oss-footnote {
      font-size: 12px !important;
      color: var(--ink-faint) !important;
    }

    .oss-footnote code {
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 11px;
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 1px 6px;
      border-radius: 4px;
      color: var(--navy);
    }

    /* ── Footer ── */
    .site-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--sp-3);
      padding: var(--sp-5) var(--sp-6);
      border-top: 1px solid var(--border);
      font-size: 12px;
      color: var(--ink-faint);
    }

    .footer-brand {
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
    .footer-link:hover,
    .footer-link--active { color: var(--navy); }

    /* ── Responsive ── */
    @media (max-width: 600px) {
      .site-header { padding: var(--sp-3) var(--sp-4); }
      .content     { padding: var(--sp-6) var(--sp-4) var(--sp-7); }
      .card        { padding: var(--sp-4); }
      .info-row    { grid-template-columns: 80px 1fr; }
      .oss-table li {
        grid-template-columns: 1fr 70px;
      }
      .oss-copy { display: none; }
    }
  `],
})
export class ImpressumComponent implements OnInit {
  readonly year = new Date().getFullYear();
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'Impressum – Klara',
      description:
        'Impressum zu Klara – Dokumentationstool für Lehrkräfte. Betrieben von Simon Abler, Au 151, 6553 See, Österreich.',
      canonical: '/impressum',
      noindex: true,
    });
  }
}
