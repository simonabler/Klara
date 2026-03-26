import { Component, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);
  private readonly meta = inject(Meta);
  private readonly titleService = inject(Title);

  private observer: IntersectionObserver | null = null;
  private scrollHandler: (() => void) | null = null;

  get isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  ngOnInit(): void {
    // SEO: Meta-Tags dynamisch setzen (wichtig für SSR + SPA-Navigation)
    this.titleService.setTitle('Klara – Dokumentationstool für Lehrkräfte');
    this.meta.updateTag({ name: 'description', content: 'Klara hilft Lehrkräften, Schüler, Beobachtungen und Leistungen einfach und übersichtlich zu dokumentieren. Kostenlos, Open Source, DSGVO-konform und self-hosted.' });
    this.meta.updateTag({ property: 'og:title', content: 'Klara – Dokumentationstool für Lehrkräfte' });
    this.meta.updateTag({ property: 'og:description', content: 'Schülerprofile, Beobachtungen, Leistungen – alles an einem Ort. Kostenlos, Open Source, DSGVO-konform.' });
    this.meta.updateTag({ property: 'og:url', content: 'https://klara.abler.tirol/' });
    this.meta.updateTag({ property: 'og:image', content: 'https://klara.abler.tirol/og-image.png' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:image', content: 'https://klara.abler.tirol/og-image.png' });

    if (!isPlatformBrowser(this.platformId)) return;

    // Nav scroll effect
    const nav = document.getElementById('nav');
    if (nav) {
      this.scrollHandler = () => {
        nav.classList.toggle('scrolled', window.scrollY > 20);
      };
      window.addEventListener('scroll', this.scrollHandler, { passive: true });
    }

    // Scroll reveal
    const reveals = document.querySelectorAll('.reveal');
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.12 },
    );
    reveals.forEach((el) => this.observer!.observe(el));
  }

  ngOnDestroy(): void {
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
    }
    this.observer?.disconnect();
  }
}