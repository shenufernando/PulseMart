import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { AuthResponse } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = 'http://localhost:5206/api/Auth';
  private readonly tokenKey = 'pulsemart_token';
  private readonly emailKey = 'pulsemart_email';

  isAuthenticated = signal<boolean>(this.hasToken());
  currentUserEmail = signal<string | null>(localStorage.getItem(this.emailKey));

  constructor(private http: HttpClient) {}

  private hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((res) => {
        localStorage.setItem(this.tokenKey, res.token);
        localStorage.setItem(this.emailKey, res.email || email);
        this.isAuthenticated.set(true);
        this.currentUserEmail.set(res.email || email);
      })
    );
  }

  register(fullName: string, email: string, password: string) {
    return this.http.post(`${this.apiUrl}/register`, {
      name: fullName,
      fullName,
      email,
      password,
    });
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.emailKey);
    this.isAuthenticated.set(false);
    this.currentUserEmail.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }
}