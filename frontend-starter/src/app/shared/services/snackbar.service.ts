import { Injectable, signal } from '@angular/core';

export interface SnackbarMessage {
  text: string;
  type: 'success' | 'error';
}

/** Shows short-lived notifications (success or error) anywhere in the app. */
@Injectable({ providedIn: 'root' })
export class SnackbarService {
  readonly message = signal<SnackbarMessage | null>(null);
  private timeoutId?: ReturnType<typeof setTimeout>;

  show(text: string, type: 'success' | 'error' = 'success'): void {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.message.set({ text, type });
    this.timeoutId = setTimeout(() => this.message.set(null), 4000);
  }
}