import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Product, ProductService } from './product.service';
import { AuthService } from './auth.service';

export interface AppUser {
  id: number | string;
  name: string;
  email: string;
  phone?: string;
  role: 'Admin' | 'Customer';
  joinedAt?: string;
}

export interface OrderItemLine {
  id?: number;
  orderId?: number;
  productId: number;
  productName: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderRecord {
  id?: number;
  orderCode: string;
  orderId?: string;
  customerName: string;
  customerEmail?: string;
  items: OrderItemLine[];
  itemsSummary?: string;
  totalPayable: number;
  deliveryFee: number;
  paymentMethod: 'Cash' | 'Card';
  deliveryAddress: string;
  phoneNumber: string;
  selectedOption: string;
  status: 'Confirmed' | 'Pending' | 'Shipped' | 'Delivered' | 'Deleted';
  createdAt?: string;
}

export interface ProductReview {
  id?: number | string;
  productId: number;
  productName?: string;
  orderCode?: string;
  customerName: string;
  reviewerName?: string;
  reviewerEmail?: string;
  rating: number;
  comment: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class PulseMartStoreService {
  private readonly http = inject(HttpClient);
  private readonly productService = inject(ProductService);
  private readonly authService = inject(AuthService);

  private readonly API_BASE = 'http://localhost:5206/api';
  private readonly STOCK_KEY = 'pulsemart_stock_overrides';
  private readonly ORDERS_KEY = 'pulsemart_orders';
  private readonly USERS_KEY = 'pulsemart_users';
  private readonly REVIEWS_KEY = 'pulsemart_reviews';
  private readonly DELETED_COUNT_KEY = 'pulsemart_deleted_orders_count';

  readonly orders = signal<OrderRecord[]>(this.loadOrders());
  readonly users = signal<AppUser[]>(this.loadUsers());
  readonly reviews = signal<ProductReview[]>(this.loadReviews());
  readonly deletedOrdersCount = signal<number>(this.loadDeletedCount());

  constructor() {
    this.fetchBackendUsers();
    this.fetchBackendOrders();
    this.fetchBackendReviews();

    window.addEventListener('storage', () => {
      this.orders.set(this.loadOrders());
      this.users.set(this.loadUsers());
      this.reviews.set(this.loadReviews());
      this.deletedOrdersCount.set(this.loadDeletedCount());
      this.applyStockOverridesToProducts();
    });
  }

  private getAuthHeaders(): HttpHeaders {
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

  // =========================================================
  // 1. STOCK SYNC (Refresh-proof + Backend SQL DB)
  // =========================================================
  getStockOverrides(): Record<string, number> {
    try {
      const raw = localStorage.getItem(this.STOCK_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  applyStockOverridesToProducts(): void {
    const overrides = this.getStockOverrides();
    const current = this.productService.products();
    if (!current.length) return;

    const synced = current.map((p) => {
      const key = String(p.id);
      if (key in overrides) {
        return { ...p, stock: overrides[key] };
      }
      return p;
    });
    this.productService.products.set(synced);
  }

  syncAdminEditedStock(productId: number | string, newStock: number): void {
    const overrides = this.getStockOverrides();
    overrides[String(productId)] = Math.max(0, newStock);
    localStorage.setItem(this.STOCK_KEY, JSON.stringify(overrides));
    this.applyStockOverridesToProducts();
  }

  adjustProductStock(product: Product, delta: number): void {
    const overrides = this.getStockOverrides();
    const currentStock =
      String(product.id) in overrides ? overrides[String(product.id)] : (product.stock || 0);
    const nextStock = Math.max(0, currentStock + delta);

    overrides[String(product.id)] = nextStock;
    localStorage.setItem(this.STOCK_KEY, JSON.stringify(overrides));

    const updatedProduct: Product = { ...product, stock: nextStock };
    const updatedList = this.productService.products().map((p) =>
      p.id === product.id ? updatedProduct : p
    );
    this.productService.products.set(updatedList);

    const formData = new FormData();
    formData.append('name', product.name);
    formData.append('category', product.category);
    formData.append('price', String(product.price));
    formData.append('stock', String(nextStock));
    formData.append('description', product.description || '');
    if (product.imageUrl) {
      formData.append('imageUrl', product.imageUrl);
    }

    this.productService.updateProduct(product.id, formData).subscribe({
      error: () => {},
    });
  }

  // =========================================================
  // 2. ORDERS MANAGEMENT (SQL Server + Stock Sync)
  // =========================================================
  private loadOrders(): OrderRecord[] {
    try {
      const raw = localStorage.getItem(this.ORDERS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveOrders(list: OrderRecord[]): void {
    this.orders.set(list);
    localStorage.setItem(this.ORDERS_KEY, JSON.stringify(list));
    localStorage.setItem('pulsemart_order_count', String(list.length));
    window.dispatchEvent(new CustomEvent('pulsemart-orders-updated'));
  }

  fetchBackendOrders(): void {
    this.http.get<OrderRecord[]>(`${this.API_BASE}/Orders`).subscribe({
      next: (dbOrders) => {
        if (Array.isArray(dbOrders)) {
          const normalized: OrderRecord[] = dbOrders.map((o) => ({
            ...o,
            orderCode: o.orderCode || o.orderId || `PM-${o.id ?? ''}`,
            items: (o.items || []).map((it) => ({
              ...it,
              imageUrl: this.productService.resolveImageUrl(it.imageUrl),
            })),
          }));
          this.saveOrders(normalized);
        }
      },
      error: () => {},
    });
  }

  createOrder(payload: OrderRecord): Observable<OrderRecord> {
    return this.http.post<OrderRecord>(`${this.API_BASE}/Orders`, payload).pipe(
      tap((created) => {
        const normalized: OrderRecord = {
          ...created,
          orderCode: created.orderCode || payload.orderCode,
          items: (created.items || payload.items || []).map((it) => ({
            ...it,
            imageUrl: this.productService.resolveImageUrl(it.imageUrl),
          })),
        };
        this.saveOrders([normalized, ...this.orders()]);
        this.productService.getProducts().subscribe();
      })
    );
  }

  private loadDeletedCount(): number {
    return Number(localStorage.getItem(this.DELETED_COUNT_KEY) || 0);
  }

  private saveDeletedCount(count: number): void {
    this.deletedOrdersCount.set(count);
    localStorage.setItem(this.DELETED_COUNT_KEY, String(count));
  }

  recordNewOrder(order: OrderRecord): void {
    const payload: OrderRecord = {
      ...order,
      orderCode: order.orderCode || order.orderId || 'PM-' + Math.floor(1000 + Math.random() * 9000),
    };
    this.createOrder(payload).subscribe({
      error: () => {
        this.saveOrders([payload, ...this.orders()]);
      },
    });
  }

  updateOrderStatus(orderId: number | string, status: OrderRecord['status']): void {
    const target = this.orders().find(
      (o) => String(o.id) === String(orderId) || o.orderCode === orderId || o.orderId === orderId
    );
    const updated = this.orders().map((o) => (o === target ? { ...o, status } : o));
    this.saveOrders(updated);

    const numericId = target?.id ?? orderId;
    this.http.patch(`${this.API_BASE}/Orders/${numericId}/status`, { status }).subscribe({
      error: () => {},
    });
  }

  deleteOrder(orderId: number | string, restoreStock = true): void {
    const target = this.orders().find(
      (o) => String(o.id) === String(orderId) || o.orderCode === orderId || o.orderId === orderId
    );
    if (!target) return;

    if (restoreStock && target.items?.length) {
      target.items.forEach((line) => {
        const prod = this.productService.products().find((p) => p.id === line.productId);
        if (prod) {
          this.adjustProductStock(prod, +line.quantity);
        }
      });
    }

    const remaining = this.orders().filter((o) => o !== target);
    this.saveOrders(remaining);
    this.saveDeletedCount(this.deletedOrdersCount() + 1);

    const numericId = target.id ?? orderId;
    this.http.delete(`${this.API_BASE}/Orders/${numericId}`).subscribe({
      next: () => this.productService.getProducts().subscribe(),
      error: () => {},
    });
  }

  // =========================================================
  // 3. USER MANAGEMENT (SQL Server dbo.Users Sync)
  // =========================================================
  private loadUsers(): AppUser[] {
    try {
      const raw = localStorage.getItem(this.USERS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.map((u: AppUser) => ({
        ...u,
        role: u.role === 'Admin' || (u.role as string) === 'ADMIN' ? 'Admin' : 'Customer',
      }));
    } catch {
      return [];
    }
  }

  private saveUsers(list: AppUser[]): void {
    this.users.set(list);
    localStorage.setItem(this.USERS_KEY, JSON.stringify(list));
  }

  fetchBackendUsers(): void {
    this.http.get<AppUser[]>(`${this.API_BASE}/Users`).subscribe({
      next: (dbUsers) => {
        if (Array.isArray(dbUsers)) {
          const normalized: AppUser[] = dbUsers.map((u) => ({
            ...u,
            role: u.role === 'Admin' || (u.role as string) === 'ADMIN' ? 'Admin' : 'Customer',
          }));
          this.saveUsers(normalized);
        }
      },
      error: () => {},
    });
  }

  registerOrSyncLoggedInUser(
    name: string,
    email: string,
    role: 'Admin' | 'Customer' | 'ADMIN' | 'CUSTOMER' = 'Customer',
    phone = ''
  ): void {
    if (!email) return;
    const normalizedRole: 'Admin' | 'Customer' =
      role === 'Admin' || role === 'ADMIN' ? 'Admin' : 'Customer';
    const current = [...this.users()];
    const idx = current.findIndex((u) => u.email.toLowerCase() === email.toLowerCase());

    if (idx > -1) {
      current[idx] = {
        ...current[idx],
        name: name || current[idx].name,
        phone: phone || current[idx].phone,
        role: normalizedRole,
      };
      this.saveUsers(current);
    }
  }

  updateUser(updatedUser: AppUser): void {
    const normalizedRole: 'Admin' | 'Customer' =
      updatedUser.role === 'Admin' || (updatedUser.role as string) === 'ADMIN'
        ? 'Admin'
        : 'Customer';
    const payload: AppUser = { ...updatedUser, role: normalizedRole };

    const list = this.users().map((u) => (String(u.id) === String(payload.id) ? payload : u));
    this.saveUsers(list);

    this.http
      .put<AppUser>(`${this.API_BASE}/Users/${payload.id}`, payload, {
        headers: this.getAuthHeaders(),
      })
      .subscribe({
        next: () => this.fetchBackendUsers(),
        error: () => {},
      });
  }

  deleteUser(userId: number | string): void {
    const list = this.users().filter((u) => String(u.id) !== String(userId));
    this.saveUsers(list);

    this.http
      .delete(`${this.API_BASE}/Users/${userId}`, {
        headers: this.getAuthHeaders(),
      })
      .subscribe({
        next: () => this.fetchBackendUsers(),
        error: () => {},
      });
  }

  // =========================================================
  // 4. REVIEWS (User after purchase -> Visible to all -> Admin delete)
  // =========================================================
  private loadReviews(): ProductReview[] {
    try {
      const raw = localStorage.getItem(this.REVIEWS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveReviews(list: ProductReview[]): void {
    this.reviews.set(list);
    localStorage.setItem(this.REVIEWS_KEY, JSON.stringify(list));
  }

  fetchBackendReviews(): void {
    this.http.get<ProductReview[]>(`${this.API_BASE}/Reviews`).subscribe({
      next: (dbReviews) => {
        if (Array.isArray(dbReviews)) {
          const normalized: ProductReview[] = dbReviews.map((r) => ({
            ...r,
            customerName: r.customerName || r.reviewerName || 'Customer',
          }));
          this.saveReviews(normalized);
        }
      },
      error: () => {},
    });
  }

  addReview(review: ProductReview): Observable<ProductReview> {
    const payload: ProductReview = {
      ...review,
      customerName: review.customerName || review.reviewerName || 'Customer',
    };
    return this.http.post<ProductReview>(`${this.API_BASE}/Reviews`, payload).pipe(
      tap((created) => {
        const normalized: ProductReview = {
          ...created,
          customerName: created.customerName || payload.customerName,
        };
        this.saveReviews([normalized, ...this.reviews()]);
      })
    );
  }

  deleteReview(reviewId: number | string): void {
    const remaining = this.reviews().filter((r) => String(r.id) !== String(reviewId));
    this.saveReviews(remaining);

    this.http
      .delete(`${this.API_BASE}/Reviews/${reviewId}`, {
        headers: this.getAuthHeaders(),
      })
      .subscribe({
        next: () => this.fetchBackendReviews(),
        error: () => {},
      });
  }

  getReviewsForProduct(productId: number | string): ProductReview[] {
    return this.reviews().filter((r) => String(r.productId) === String(productId));
  }

  hasUserPurchasedProduct(productId: number | string): boolean {
    return this.orders().some((order) =>
      order.items?.some((item) => String(item.productId) === String(productId))
    );
  }
}