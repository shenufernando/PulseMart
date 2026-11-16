import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { AuthResponse } from '../models/product.model';

interface FlexibleAuthResponse extends Partial<AuthResponse> {
  Token?: string;
  accessToken?: string;
  AccessToken?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = 'http://localhost:5206/api/Auth';
  private readonly tokenKey = 'pulsemart_token';
  private readonly emailKey = 'pulsemart_email';

  isAuthenticated = signal<boolean>(this.hasToken());
  currentUserEmail = signal<string | null>(localStorage.getItem(this.emailKey));

  constructor(private http: HttpClient) {}

  private hasToken(): boolean {
    const token = localStorage.getItem(this.tokenKey);
    return !!token && token.trim().length > 0;
  }

  login(email: string, password: string) {
    return this.http
      .post<FlexibleAuthResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap((res) => {
          const token =
            res?.token ??
            res?.Token ??
            res?.accessToken ??
            res?.AccessToken ??
            '';
          const userEmail = res?.email || email;

          if (token) {
            localStorage.setItem(this.tokenKey, token);
            localStorage.setItem(this.emailKey, userEmail);
            this.isAuthenticated.set(true);
            this.currentUserEmail.set(userEmail);
          } else {
            this.logout();
          }
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
    const token = localStorage.getItem(this.tokenKey);
    return token && token.trim().length > 0 ? token : null;
  }
}