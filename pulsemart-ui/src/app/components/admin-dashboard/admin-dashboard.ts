import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);

  readonly categories = ['Electronics', 'Fashion', 'Home & Living', 'Accessories', 'General'];
  readonly products = this.productService.products;

  name = '';
  category = 'Electronics';
  price: number | null = null;
  stock: number | null = null;
  description = '';
  selectedFile: File | null = null;

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

  publishItem(): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    if (!this.name.trim() || this.price === null || this.price <= 0 || this.stock === null || this.stock < 0) {
      this.errorMessage.set('Please enter a valid item name, price, and stock quantity.');
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

    this.submitting.set(true);
    this.productService.createProduct(formData).subscribe({
      next: () => {
        this.submitting.set(false);
        this.successMessage.set('Item post published! Visible on User Dashboard now.');
        this.resetForm();
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to publish item post.');
      },
    });
  }

  deleteItem(id: number): void {
    this.errorMessage.set('');
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
    localStorage.clear();
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