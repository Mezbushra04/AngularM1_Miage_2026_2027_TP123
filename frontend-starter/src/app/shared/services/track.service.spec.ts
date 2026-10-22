import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TrackService } from './track.service';

describe('TrackService', () => {
  let service: TrackService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TrackService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TrackService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('transmet page et limit à GET /api/tracks', () => {
    service.list(2, 10).subscribe();

    const req = httpMock.expectOne(
      (request) => request.url === '/api/tracks' && request.method === 'GET',
    );

    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('10');

    req.flush({ items: [], page: 2, limit: 10, total: 0, pages: 0 });
  });

  it('appelle DELETE /api/tracks/:id', () => {
    service.delete('abc123').subscribe();

    const req = httpMock.expectOne('/api/tracks/abc123');
    expect(req.request.method).toBe('DELETE');

    req.flush(null);
  });
});