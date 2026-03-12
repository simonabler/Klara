import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface SeoConfig {
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
}

const BASE_URL = 'https://klara.abler.tirol';

const DEFAULTS: SeoConfig = {
  title: 'Klara – Dokumentationstool für Lehrkräfte',
  description:
    'Klara hilft Lehrkräften, Schüler, Beobachtungen und Leistungen einfach und übersichtlich zu dokumentieren.',
};

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  set(config: Partial<SeoConfig>): void {
    const resolved: SeoConfig = { ...DEFAULTS, ...config };

    this.title.setTitle(resolved.title);

    this.meta.updateTag({ name: 'description', content: resolved.description });
    this.meta.updateTag({
      name: 'robots',
      content: resolved.noindex ? 'noindex, follow' : 'index, follow',
    });

    // Open Graph
    this.meta.updateTag({ property: 'og:title', content: resolved.title });
    this.meta.updateTag({ property: 'og:description', content: resolved.description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: 'Klara' });
    if (resolved.canonical) {
      this.meta.updateTag({
        property: 'og:url',
        content: `${BASE_URL}${resolved.canonical}`,
      });
    }

    this.updateCanonical(resolved.canonical);
  }

  private updateCanonical(path?: string): void {
    if (typeof document === 'undefined') return;

    let link: HTMLLinkElement | null = document.querySelector("link[rel='canonical']");

    if (!path) {
      link?.remove();
      return;
    }

    const href = `${BASE_URL}${path}`;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}
