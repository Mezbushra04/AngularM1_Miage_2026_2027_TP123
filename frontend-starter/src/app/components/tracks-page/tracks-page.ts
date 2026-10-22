import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { Track } from '../../shared/models/track.model';
import { TrackService } from '../../shared/services/track.service';
import { SnackbarService } from '../../shared/services/snackbar.service';

const MAX_SIZE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/mp4'];

@Component({
  imports: [ReactiveFormsModule],
  templateUrl: './tracks-page.html',
  styleUrl: './tracks-page.css',
})
export class TracksPageComponent implements OnDestroy {
  private readonly service = inject(TrackService);
  private readonly snackbar = inject(SnackbarService);

  readonly tracks = signal<Track[]>([]);
    readonly filteredTracks = computed(() => {
    const term = this.search.value.trim().toLowerCase();
    if (!term) return this.tracks();
    return this.tracks().filter((track) => track.title.toLowerCase().includes(term));
  });
  readonly page = signal(1);
  readonly pages = signal(1);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly uploading = signal(false);
  readonly uploadProgress = signal(0);
  readonly uploadError = signal('');
  readonly uploadSuccess = signal('');

  readonly deletingIds = signal<ReadonlySet<string>>(new Set());

  readonly audioUrl = signal('');
  readonly nowPlaying = signal<Track | null>(null);
  readonly audioError = signal('');

  readonly title = new FormControl('', { nonNullable: true });
    readonly search = new FormControl('', { nonNullable: true });
  file?: File;

  constructor() {
    this.load();
  }

  ngOnDestroy(): void {
    const url = this.audioUrl();
    if (url) URL.revokeObjectURL(url);
  }

  choose(event: Event): void {
    const selected = (event.target as HTMLInputElement).files?.[0];
    this.uploadError.set('');
    this.uploadSuccess.set('');

    if (!selected) {
      this.file = undefined;
      return;
    }

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      this.uploadError.set('Format non supporté. Utilisez MP3, WAV, OGG ou M4A.');
      this.file = undefined;
      return;
    }

    if (selected.size > MAX_SIZE_BYTES) {
      this.uploadError.set('Le fichier dépasse la taille maximale de 25 Mo.');
      this.file = undefined;
      return;
    }

    this.file = selected;
    console.debug('[TracksPage] Fichier sélectionné', this.file.name);
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.service.list(this.page()).subscribe({
      next: (response) => {
        console.debug('[TracksPage] Pistes chargées', response.items.length);
        this.tracks.set(response.items);
        this.pages.set(response.pages);
        this.loading.set(false);
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[TracksPage] Chargement impossible', error);
        this.error.set(error.error?.message ?? 'Erreur de chargement des pistes');
        this.loading.set(false);
      },
    });
  }

  go(page: number): void {
    this.page.set(page);
    this.load();
  }

  upload(): void {
    if (!this.file || this.uploading()) return;

    this.uploading.set(true);
    this.uploadProgress.set(0);
    this.uploadError.set('');
    this.uploadSuccess.set('');

    this.service.upload(this.file, this.title.value || this.file.name).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          if (event.total) {
            const percent = Math.round((event.loaded / event.total) * 100);
            this.uploadProgress.set(percent);
            console.debug('[TracksPage] Progression upload', percent, '%');
          }
          return;
        }

        if (event.type === HttpEventType.Response) {
          const track = event.body as Track;
          console.debug('[TracksPage] Piste envoyée', track.id);
          this.uploading.set(false);
          this.uploadProgress.set(0);
          this.uploadSuccess.set(`« ${track.title} » envoyé avec succès.`);
          this.title.setValue('');
          this.file = undefined;
          this.page.set(1);
          this.load();
        }
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[TracksPage] Envoi impossible', error);
        this.uploading.set(false);
        this.uploadProgress.set(0);
        this.uploadError.set(error.error?.message ?? "Erreur lors de l'envoi");
      },
    });
  }

  play(track: Track): void {
    this.audioError.set('');
    this.service.audio(track.id).subscribe({
      next: (blob) => {
        console.debug('[TracksPage] Audio chargé', track.id);
        const previousUrl = this.audioUrl();
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        this.audioUrl.set(URL.createObjectURL(blob));
        this.nowPlaying.set(track);
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[TracksPage] Lecture impossible', error);
        this.audioError.set(error.error?.message ?? 'Erreur de lecture audio');
      },
    });
  }
    formatBadge(mimeType: string): string {
    const map: Record<string, string> = {
      'audio/mpeg': 'MP3',
      'audio/wav': 'WAV',
      'audio/ogg': 'OGG',
      'audio/x-m4a': 'M4A',
      'audio/mp4': 'M4A',
    };
    return map[mimeType] ?? mimeType.replace('audio/', '').toUpperCase();
  }

  isDeleting(id: string): boolean {
    return this.deletingIds().has(id);
  }

  remove(track: Track): void {
    if (this.isDeleting(track.id)) return;

    const confirmed = confirm(`Supprimer « ${track.title} » ? Cette action est définitive.`);
    if (!confirmed) return;

    this.deletingIds.update((set) => new Set(set).add(track.id));

    this.service.delete(track.id).subscribe({
      next: () => {
        console.debug('[TracksPage] Piste supprimée', track.id);
        this.deletingIds.update((set) => {
          const next = new Set(set);
          next.delete(track.id);
          return next;
        });
        this.snackbar.show(`« ${track.title} » supprimé.`, 'success');
        this.load();
      },
      error: (error: { status: number; error?: { message?: string } }) => {
        console.error('[TracksPage] Suppression impossible', error);
        this.deletingIds.update((set) => {
          const next = new Set(set);
          next.delete(track.id);
          return next;
        });

        if (error.status === 404) {
          this.snackbar.show('Cette piste a déjà été supprimée.', 'error');
          this.load();
          return;
        }

        if (error.status === 403) {
          this.snackbar.show("Vous n'êtes pas le propriétaire de cette piste.", 'error');
          return;
        }

        this.snackbar.show(error.error?.message ?? 'Suppression impossible.', 'error');
      },
    });
  }
}