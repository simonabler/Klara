import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from './toast.service';

@Component({
  standalone: true,
  selector: 'app-toast-outlet',
  imports: [CommonModule],
  styles: [`
    .toast-stack {
      position: fixed;
      bottom: var(--sp-5);
      right: var(--sp-5);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: var(--sp-2);
      max-width: min(22rem, calc(100vw - 2rem));
      pointer-events: none;
    }
    .toast-item {
      pointer-events: all;
      display: flex;
      align-items: flex-start;
      gap: var(--sp-3);
      padding: var(--sp-3) var(--sp-4);
      border-radius: var(--r-md);
      border-left: 3px solid;
      background: var(--white);
      box-shadow: var(--sh-lg);
      animation: toast-in .18s ease;
    }
    @keyframes toast-in {
      from { opacity: 0; transform: translateX(1rem); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .toast-item.warning { border-color: var(--warn-fg); }
    .toast-item.error   { border-color: var(--error-fg); }
    .toast-item.success { border-color: var(--success-fg); }
    .toast-item.info    { border-color: var(--teal); }

    .toast-icon { font-size: 1rem; flex-shrink: 0; margin-top: 1px; }
    .toast-title { font-weight: 600; font-size: 13px; color: var(--ink); line-height: 1.4; }
    .toast-msg   { font-size: 12px; color: var(--ink-light); margin-top: 2px; }
    .toast-close {
      margin-left: auto;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--ink-faint);
      font-size: 14px;
      line-height: 1;
      padding: 0 0 0 var(--sp-2);
      flex-shrink: 0;
    }
    .toast-close:hover { color: var(--ink); }
  `],
  template: `
    <div class="toast-stack" aria-live="polite" aria-atomic="false">
      @for (t of svc.toasts(); track t.id) {
        <div class="toast-item {{ t.type }}" role="alert">
          <span class="toast-icon">{{ icon(t) }}</span>
          <div class="flex-grow-1">
            <div class="toast-title">{{ t.title }}</div>
            @if (t.message) {
              <div class="toast-msg">{{ t.message }}</div>
            }
          </div>
          <button class="toast-close" (click)="svc.dismiss(t.id)" aria-label="Schließen">✕</button>
        </div>
      }
    </div>
  `,
})
export class ToastOutletComponent {
  readonly svc = inject(ToastService);

  icon(t: Toast): string {
    return { warning: '⚠️', error: '❌', success: '✅', info: 'ℹ️' }[t.type];
  }
}
