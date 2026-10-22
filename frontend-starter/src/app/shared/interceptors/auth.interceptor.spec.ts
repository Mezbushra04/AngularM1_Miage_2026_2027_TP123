import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('ajoute Authorization quand un token existe', () => {
    auth.token.set('mon-faux-token');

    http.get('/api/users/me').subscribe();

    const req = httpMock.expectOne('/api/users/me');
    expect(req.request.headers.get('Authorization')).toBe('Bearer mon-faux-token');

    req.flush({ id: '1', name: 'Demo', email: 'demo@example.com', createdAt: '', updatedAt: '' });
  });

  it("n'ajoute pas Authorization sans token", () => {
    auth.token.set(null);

    http.get('/api/tracks').subscribe();

    const req = httpMock.expectOne('/api/tracks');
    expect(req.request.headers.has('Authorization')).toBe(false);

    req.flush({ items: [], page: 1, limit: 5, total: 0, pages: 0 });
  });
});