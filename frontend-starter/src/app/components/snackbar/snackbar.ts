import { Component, inject } from '@angular/core';
import { SnackbarService } from '../../shared/services/snackbar.service';

@Component({
  selector: 'app-snackbar',
  template: `
    @if (snackbar.message(); as msg) {
      <div class="snackbar" [class.error]="msg.type === 'error'" role="status">
        {{ msg.text }}
      </div>
    }
  `,
  styles: [`
    .snackbar {
      position: fixed;
      bottom: 1.5rem;
      left: 50%;
      transform: translateX(-50%);
      background: #2e7d32;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
      z-index: 1000;
    }
    .snackbar.error { background: #b3261e; }
  `],
})
export class SnackbarComponent {
  readonly snackbar = inject(SnackbarService);
}