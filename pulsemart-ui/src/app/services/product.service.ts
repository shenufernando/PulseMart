import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Product } from '../models/product.model';
import { AuthService } from './auth.service';

export type { Product };

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  readonly apiBase = 'http://localhost:5206';
  private readonly apiUrl = `${this.apiBase}/api/Products`;

  readonly products = signal<Product[]>([]);

  getProducts(category = '', search = ''): Observable<Product[]> {
    let params = new HttpParams();
    if (category && category !== 'All') {
      params = params.set('category', category);
    }
    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<Product[]>(this.apiUrl, { params }).pipe(
      tap((items) => {
        const normalized = items.map((item) => ({
          ...item,
          imageUrl: this.resolveImageUrl(item.imageUrl),
        }));
        this.products.set(normalized);
      })
    );
  }

  createProduct(formData: FormData): Observable<Product> {
    return this.http
      .post<Product>(this.apiUrl, formData, { headers: this.getAuthHeaders() })
      .pipe(
        tap((created) => {
          const normalized: Product = {
            ...created,
            imageUrl: this.resolveImageUrl(created.imageUrl),
          };
          this.products.update((list) => [normalized, ...list]);
        })
      );
  }

  updateProduct(id: number, formData: FormData): Observable<Product> {
    return this.http
      .put<Product>(`${this.apiUrl}/${id}`, formData, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        tap((updated) => {
          const normalized: Product = {
            ...updated,
            imageUrl: this.resolveImageUrl(updated.imageUrl),
          };
          this.products.update((list) =>
            list.map((p) => (p.id === id ? normalized : p))
          );
        })
      );
  }

  deleteProduct(id: number): Observable<unknown> {
    return this.http
      .delete(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() })
      .pipe(
        tap(() => {
          this.products.update((list) => list.filter((p) => p.id !== id));
        })
      );
  }

  resolveImageUrl(imageUrl?: string | null): string {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    return `${this.apiBase}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  }

  getAuthHeaders(): HttpHeaders {
    const token =
      this.authService.getToken() ||
      localStorage.getItem('pulsemart_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('jwt') ||
      '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }
}