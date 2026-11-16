import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Product, ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';

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
  private readonly router = inject(Router);

  readonly categories = ['Electronics', 'Fashion', 'Home & Living', 'Accessories', 'General'];
  readonly products = this.productService.products;

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

  readonly totalStock = computed(() =>
    this.products().reduce((sum, item) => sum + Number(item.stock || 0), 0)
  );

  readonly totalValue = computed(() =>
    this.products().reduce((sum, item) => sum + Number(item.price || 0) * Number(item.stock || 0), 0)
  );

  readonly lowStockCount = computed(() =>
    this.products().filter((item) => Number(item.stock || 0) < 10).length
  );

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.productService.getProducts().subscribe({
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Failed to load products.');
      },
    });
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

    if (!this.name.trim() || this.price === null || this.price <= 0 || this.stock === null || this.stock < 0) {
      this.errorMessage.set('Please enter a valid item name, price, and stock quantity.');
      return;
    }

    const token = this.authService.getToken() || localStorage.getItem('pulsemart_token');
    if (!token) {
      this.errorMessage.set('Session expired or not logged in. Please sign in again.');
      this.router.navigate(['/login']);
      return;
    }

    const formData = new FormData();
    formData.append('name', this.name.trim());
    formData.append('category', this.category);
    formData.append('price', String(this.price));
    formData.append('stock', String(this.stock));
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