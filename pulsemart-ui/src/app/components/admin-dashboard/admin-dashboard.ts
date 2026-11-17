import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Product, ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import {
  AppUser,
  OrderRecord,
  PulseMartStoreService,
} from '../../services/pulsemart-store.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly authService = inject(AuthService);
  private readonly store = inject(PulseMartStoreService);
  private readonly router = inject(Router);

  readonly categories = ['Electronics', 'Fashion', 'Home & Living', 'Accessories', 'General'];
  readonly products = this.productService.products;

  // Shared Store Signals (Inventory, Orders, Users, Reviews)
  readonly activeSection = signal<'inventory' | 'orders' | 'users' | 'reviews'>('inventory');
  readonly orders = this.store.orders;
  readonly users = this.store.users;
  readonly reviews = this.store.reviews;
  readonly deletedOrdersCount = this.store.deletedOrdersCount;
  readonly editingUser = signal<AppUser | null>(null);

  // Item Post Form fields
  name = '';
  category = 'Electronics';
  price: number | null = null;
  stock: number | null = null;
  description = '';
  selectedFile: File | null = null;

  readonly editingId = signal<number | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');

  // Inventory KPIs
  readonly totalStock = computed(() =>
    this.products().reduce((sum, item) => sum + Number(item.stock || 0), 0)
  );

  readonly totalValue = computed(() =>
    this.products().reduce((sum, item) => sum + Number(item.price || 0) * Number(item.stock || 0), 0)
  );

  readonly lowStockCount = computed(() =>
    this.products().filter((item) => Number(item.stock || 0) < 10).length
  );

  // Orders & Users KPIs
  readonly confirmedOrdersCount = computed(() =>
    this.orders().filter((o) => o.status === 'Confirmed' || o.status === 'Delivered').length
  );

  readonly totalOrderRevenue = computed(() =>
    this.orders().reduce((sum, o) => sum + Number(o.totalPayable || 0), 0)
  );

  readonly adminUsersCount = computed(() =>
    this.users().filter((u) => u.role === 'Admin').length
  );

  readonly customerUsersCount = computed(() =>
    this.users().filter((u) => u.role === 'Customer').length
  );

  ngOnInit(): void {
    this.loadProducts();
    this.store.fetchBackendOrders();
    this.store.fetchBackendUsers();
    this.store.fetchBackendReviews();
  }

  loadProducts(): void {
    this.productService.getProducts().subscribe({
      next: () => {
        // Keep customer-purchased stock deductions synced on Admin Dashboard too
        this.store.applyStockOverridesToProducts();
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Failed to load products.');
      },
    });
  }

  getProductName(productId: number): string {
    return (
      this.products().find((p) => Number(p.id) === Number(productId))?.name ||
      `Product #${productId}`
    );
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile = file;

    if (!file) {
      this.previewUrl.set(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.previewUrl.set(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  editItem(item: Product): void {
    this.editingId.set(item.id);
    this.name = item.name;
    this.category = item.category;
    this.price = item.price;
    this.stock = item.stock;
    this.description = item.description;
    this.selectedFile = null;
    this.previewUrl.set(item.imageUrl || null);
    this.successMessage.set('');
    this.errorMessage.set('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.resetForm();
    this.errorMessage.set('');
  }

  publishItem(): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    if (
      !this.name.trim() ||
      this.price === null ||
      this.price <= 0 ||
      this.stock === null ||
      this.stock < 0
    ) {
      this.errorMessage.set('Please enter a valid item name, price, and stock quantity.');
      return;
    }

    const token = this.authService.getToken() || localStorage.getItem('pulsemart_token');
    if (!token) {
      this.errorMessage.set('Session expired or not logged in. Please sign in again.');
      this.router.navigate(['/login']);
      return;
    }

    const updatedStockValue = Number(this.stock);
    const formData = new FormData();
    formData.append('name', this.name.trim());
    formData.append('category', this.category);
    formData.append('price', String(this.price));
    formData.append('stock', String(updatedStockValue));
    formData.append('description', this.description.trim());

    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    const currentEditId = this.editingId();
    this.submitting.set(true);

    const request$ = currentEditId
      ? this.productService.updateProduct(currentEditId, formData)
      : this.productService.createProduct(formData);

    request$.subscribe({
      next: () => {
        if (currentEditId !== null) {
          this.store.syncAdminEditedStock(currentEditId, updatedStockValue);
        }
        this.submitting.set(false);
        this.editingId.set(null);
        this.successMessage.set(
          currentEditId
            ? 'Item post updated! Changes are live now.'
            : 'Item post published! Visible on User Dashboard now.'
        );
        this.resetForm();
      },
      error: (err) => {
        this.submitting.set(false);
        if (err?.status === 401) {
          this.errorMessage.set('Unauthorized (401): Please log in again and try publishing.');
          return;
        }
        this.errorMessage.set(
          err?.error?.message ||
            (currentEditId ? 'Failed to update item post.' : 'Failed to publish item post.')
        );
      },
    });
  }

  deleteItem(id: number): void {
    this.errorMessage.set('');
    if (this.editingId() === id) {
      this.cancelEdit();
    }

    this.productService.deleteProduct(id).subscribe({
      next: () => {
        this.successMessage.set('Item post deleted.');
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Failed to delete item.');
      },
    });
  }

  // =========================================================
  // ORDERS MANAGEMENT ACTIONS (SQL Server Sync)
  // =========================================================
  changeOrderStatus(orderId: string | number, status: OrderRecord['status']): void {
    this.store.updateOrderStatus(orderId, status);
  }

  removeOrder(orderId: string | number): void {
    // Deletes the order, increments Deleted Orders counter, and restores item stock
    this.store.deleteOrder(orderId, true);
  }

  // =========================================================
  // USER MANAGEMENT ACTIONS (SQL Server dbo.Users Sync)
  // =========================================================
  startEditUser(user: AppUser): void {
    this.editingUser.set({
      ...user,
      role: user.role === 'Admin' ? 'Admin' : 'Customer',
    });
  }

  saveEditedUser(): void {
    const u = this.editingUser();
    if (!u || !u.name.trim() || !u.email.trim()) return;
    this.store.updateUser(u);
    this.editingUser.set(null);
  }

  removeUser(userId: number | string): void {
    this.store.deleteUser(userId);
  }

  // =========================================================
  // REVIEWS MANAGEMENT ACTIONS (SQL Server dbo.ProductReviews Sync)
  // =========================================================
  removeReview(reviewId?: number | string): void {
    if (!reviewId) return;
    this.store.deleteReview(reviewId);
  }

  goToUserDashboard(): void {
    this.router.navigate(['/user-dashboard']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private resetForm(): void {
    this.name = '';
    this.category = 'Electronics';
    this.price = null;
    this.stock = null;
    this.description = '';
    this.selectedFile = null;
    this.previewUrl.set(null);
  }
}