import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo.service';

@Component({
  selector: 'app-datenschutz',
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
          <h1>Datenschutzerklärung</h1>
          <p class="lead">
            Informationen zur Verarbeitung personenbezogener Daten gemäß
            Datenschutz-Grundverordnung (DSGVO) und dem österreichischen
            Datenschutzgesetz (DSG).
          </p>
        </div>

        <!-- 1. Verantwortlicher -->
        <section class="card">
          <h2>Verantwortlicher</h2>
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
                <code class="email">simon [at] abler [dot] tirol</code>
              </dd>
            </div>
          </dl>
        </section>

        <!-- 2. Zweck und Rechtsgrundlage -->
        <section class="card">
          <h2>Zweck der Datenverarbeitung</h2>
          <p>
            Klara ist ein privat betriebenes Werkzeug, das Lehrkräften die
            strukturierte Dokumentation von Schülerinnen und Schülern,
            Unterrichtsbeobachtungen und Leistungen ermöglicht.
          </p>
          <p>
            Die Verarbeitung personenbezogener Daten erfolgt ausschließlich
            zum Zweck der pädagogischen Dokumentation durch die jeweilige
            Lehrkraft. Rechtsgrundlage ist das berechtigte Interesse der
            Lehrkraft an einer geordneten Unterrichtsdokumentation
            (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO) sowie die Erfüllung
            rechtlicher Verpflichtungen im Rahmen des Schulunterrichts.
          </p>
        </section>

        <!-- 3. Welche Daten werden verarbeitet -->
        <section class="card">
          <h2>Verarbeitete Daten</h2>
          <p>
            Im Rahmen der Nutzung von Klara werden folgende Kategorien
            personenbezogener Daten verarbeitet:
          </p>
          <ul class="data-list">
            <li>
              <span class="data-category">Schülerdaten</span>
              <span class="data-detail">
                Vorname, Nachname, Geburtsdatum, Profilbild (optional),
                Namen der Erziehungsberechtigten
              </span>
            </li>
            <li>
              <span class="data-category">Unterrichtsdaten</span>
              <span class="data-detail">
                Fachbezogene Notizen zu Mitarbeit und Verhalten,
                Leistungsergebnisse (Noten, Punkte, Kommentare),
                Zuordnungen zu Klassen und Fächern
              </span>
            </li>
            <li>
              <span class="data-category">Kontodaten</span>
              <span class="data-detail">
                Name und E-Mail-Adresse der Lehrkraft (via Google OAuth),
                verschlüsseltes Zugriffstoken
              </span>
            </li>
          </ul>
          <p class="card-note">
            Es werden ausschließlich Daten gespeichert, die die Lehrkraft
            selbst eingibt. Es erfolgt keine automatische Auswertung,
            kein Profiling und keine Weitergabe an Dritte.
          </p>
        </section>

        <!-- 4. Datenspeicherung -->
        <section class="card">
          <h2>Datenspeicherung</h2>
          <p>
            Alle Daten werden auf einem Server in der Europäischen Union
            gespeichert und verbleiben dort. Der Server wird von Simon Abler
            privat betrieben.
          </p>
          <p>
            Daten werden so lange gespeichert, wie die Lehrkraft ein aktives
            Konto bei Klara führt. Nach Löschung des Kontos werden alle
            zugehörigen Daten innerhalb von 30&nbsp;Tagen unwiderruflich
            gelöscht.
          </p>
        </section>

        <!-- 5. Anmeldung via Google -->
        <section class="card">
          <h2>Anmeldung via Google OAuth</h2>
          <p>
            Klara ermöglicht die Anmeldung über Google OAuth&nbsp;2.0.
            Dabei werden von Google folgende Daten an Klara übermittelt:
            Name, E-Mail-Adresse und Google-Nutzer-ID. Passwörter werden
            nicht gespeichert.
          </p>
          <p>
            Die Nutzung von Google OAuth unterliegt den
            <a class="ext-link" href="https://policies.google.com/privacy" target="_blank" rel="noopener">Datenschutzbestimmungen von Google</a>.
            Klara speichert keine Google-Zugriffstoken dauerhaft; das
            Sitzungstoken (JWT) wird ausschließlich für die Dauer der
            Anmeldung verwendet.
          </p>
        </section>

        <!-- 6. Cookies und lokaler Speicher -->
        <section class="card">
          <h2>Cookies und lokaler Speicher</h2>
          <p>
            Klara setzt ausschließlich technisch notwendige Cookies und
            Einträge im lokalen Speicher des Browsers. Diese dienen
            ausschließlich der Aufrechterhaltung der Anmeldesitzung.
            Es werden keine Tracking-, Analyse- oder Werbe-Cookies verwendet.
          </p>
          <p>
            Da keine nicht-notwendigen Cookies eingesetzt werden, ist eine
            Cookie-Einwilligung nach DSGVO nicht erforderlich.
          </p>
        </section>

        <!-- 7. Datenweitergabe -->
        <section class="card">
          <h2>Datenweitergabe an Dritte</h2>
          <p>
            Personenbezogene Daten werden nicht an Dritte verkauft, vermietet
            oder zu Werbezwecken weitergegeben. Eine Weitergabe erfolgt
            ausschließlich in folgenden Ausnahmefällen:
          </p>
          <ul class="plain-list">
            <li>Bei gesetzlicher Verpflichtung (z.&nbsp;B. behördliche Anordnung)</li>
            <li>Zur Abwehr von Angriffen auf die Sicherheit des Systems</li>
          </ul>
        </section>

        <!-- 8. Rechte der betroffenen Personen -->
        <section class="card">
          <h2>Rechte der betroffenen Personen</h2>
          <p>
            Gemäß DSGVO stehen allen von der Datenverarbeitung betroffenen
            Personen folgende Rechte zu:
          </p>
          <ul class="rights-list">
            <li>
              <span class="rights-name">Auskunft</span>
              <span class="rights-detail">Art.&nbsp;15 DSGVO – Recht auf Auskunft über gespeicherte Daten</span>
            </li>
            <li>
              <span class="rights-name">Berichtigung</span>
              <span class="rights-detail">Art.&nbsp;16 DSGVO – Recht auf Korrektur unrichtiger Daten</span>
            </li>
            <li>
              <span class="rights-name">Löschung</span>
              <span class="rights-detail">Art.&nbsp;17 DSGVO – Recht auf Löschung („Recht auf Vergessenwerden")</span>
            </li>
            <li>
              <span class="rights-name">Einschränkung</span>
              <span class="rights-detail">Art.&nbsp;18 DSGVO – Recht auf Einschränkung der Verarbeitung</span>
            </li>
            <li>
              <span class="rights-name">Widerspruch</span>
              <span class="rights-detail">Art.&nbsp;21 DSGVO – Recht auf Widerspruch gegen die Verarbeitung</span>
            </li>
            <li>
              <span class="rights-name">Datenübertragbarkeit</span>
              <span class="rights-detail">Art.&nbsp;20 DSGVO – Recht auf Herausgabe der Daten in maschinenlesbarem Format</span>
            </li>
          </ul>
          <p class="card-note">
            Anfragen zur Ausübung dieser Rechte richten Sie bitte per E-Mail an:
            <code class="email">simon [at] abler [dot] tirol</code>
          </p>
        </section>

        <!-- 9. Beschwerderecht -->
        <section class="card">
          <h2>Beschwerderecht bei der Aufsichtsbehörde</h2>
          <p>
            Sie haben das Recht, eine Beschwerde bei der österreichischen
            Datenschutzbehörde einzureichen:
          </p>
          <dl class="info-list">
            <div class="info-row">
              <dt>Behörde</dt>
              <dd>Österreichische Datenschutzbehörde</dd>
            </div>
            <div class="info-row">
              <dt>Adresse</dt>
              <dd>Barichgasse 40–42, 1030 Wien</dd>
            </div>
            <div class="info-row">
              <dt>Website</dt>
              <dd>
                <a class="ext-link" href="https://www.dsb.gv.at" target="_blank" rel="noopener">www.dsb.gv.at</a>
              </dd>
            </div>
          </dl>
        </section>

        <!-- 10. Aktualität -->
        <section class="card">
          <h2>Aktualität dieser Erklärung</h2>
          <p>
            Diese Datenschutzerklärung hat den Stand von März&nbsp;2026.
            Bei wesentlichen Änderungen an der Datenverarbeitung wird diese
            Erklärung aktualisiert.
          </p>
        </section>

      </main>

      <!-- ── Footer ── -->
      <footer class="site-footer">
        <span class="footer-brand">klara</span>
        <span class="footer-sep">·</span>
        <span>© {{ year }} Simon Abler</span>
        <span class="footer-sep">·</span>
        <a routerLink="/impressum" class="footer-link">Impressum</a>
        <span class="footer-sep">·</span>
        <a routerLink="/datenschutz" class="footer-link footer-link--active">Datenschutz</a>
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
    .page-intro { margin-bottom: var(--sp-2); }

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
      display: flex;
      flex-direction: column;
      gap: var(--sp-3);
    }

    .card h2 {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1.4px;
      text-transform: uppercase;
      color: var(--ink-faint);
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
      margin: 0;
    }

    .card-note {
      font-size: 13px !important;
      color: var(--ink-faint) !important;
      padding: var(--sp-3) var(--sp-4);
      background: var(--surface);
      border-radius: var(--r-sm);
      border-left: 3px solid var(--teal);
    }

    /* ── Info list ── */
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
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 12px;
      color: var(--navy);
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 3px 8px;
      border-radius: var(--r-sm);
    }

    .ext-link {
      color: var(--teal);
      text-decoration: none;
    }
    .ext-link:hover { text-decoration: underline; }

    /* ── Data categories list ── */
    .data-list {
      list-style: none;
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      overflow: hidden;
    }

    .data-list li {
      display: grid;
      grid-template-columns: 160px 1fr;
      gap: var(--sp-4);
      padding: var(--sp-3) var(--sp-4);
      border-bottom: 1px solid var(--border);
      font-size: 13px;
      align-items: start;
    }
    .data-list li:last-child  { border-bottom: none; }
    .data-list li:nth-child(even) { background: var(--surface); }

    .data-category {
      font-weight: 600;
      color: var(--navy);
    }

    .data-detail {
      color: var(--ink-light);
      line-height: 1.5;
    }

    /* ── Rights list ── */
    .rights-list {
      list-style: none;
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      overflow: hidden;
    }

    .rights-list li {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: var(--sp-4);
      padding: var(--sp-3) var(--sp-4);
      border-bottom: 1px solid var(--border);
      font-size: 13px;
      align-items: start;
    }
    .rights-list li:last-child  { border-bottom: none; }
    .rights-list li:nth-child(even) { background: var(--surface); }

    .rights-name {
      font-weight: 600;
      color: var(--navy);
    }

    .rights-detail {
      color: var(--ink-light);
      line-height: 1.5;
    }

    /* ── Plain list ── */
    .plain-list {
      padding-left: var(--sp-5);
    }

    .plain-list li {
      font-size: 14px;
      color: var(--ink-light);
      line-height: 1.7;
      margin-bottom: var(--sp-1);
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
      flex-wrap: wrap;
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
      .data-list li,
      .rights-list li { grid-template-columns: 1fr; gap: var(--sp-1); }
      .data-category,
      .rights-name { font-size: 12px; }
    }
  `],
})
export class DatenschutzComponent implements OnInit {
  readonly year = new Date().getFullYear();
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'Datenschutzerklärung – Klara',
      description:
        'Datenschutzerklärung für Klara – Dokumentationstool für Lehrkräfte. Informationen zur DSGVO-konformen Datenverarbeitung.',
      canonical: '/datenschutz',
      noindex: true,
    });
  }
}
