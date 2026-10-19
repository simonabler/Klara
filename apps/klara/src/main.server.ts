import {
  BootstrapContext,
  bootstrapApplication,
} from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';

// Ab Angular 20.3 Pflicht: der Kontext bindet jede Anwendung an ihren eigenen
// Request (Schutz gegen Datenlecks zwischen gleichzeitigen SSR-Requests)
const bootstrap = (context: BootstrapContext) =>
  bootstrapApplication(App, config, context);

export default bootstrap;
