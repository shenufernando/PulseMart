import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Product, ProductService } from '../../services/product.service';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.css',
})
export class UserDashboard implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);

  readonly categories = ['All', 'Electronics', 'Fashion', 'Home & Living', 'Accessories', 'General'];
  readonly products = this.productService.products;

  search = '';
  selectedCategory = 'All';
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly activeProduct = signal<Product | null>(null);

  ngOnInit(): void {
    this.loadStorefront();
  }

  loadStorefront(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.productService.getProducts(this.selectedCategory, this.search).subscribe({
      next: () => this.loading.set(false),
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || 'Unable to load products.');
      },
    });
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.loadStorefront();
  }

  openProduct(product: Product): void {
    this.activeProduct.set(product);
  }

  closeProduct(): void {
    this.activeProduct.set(null);
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}