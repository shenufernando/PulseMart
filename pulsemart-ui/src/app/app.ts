import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  private readonly router = inject(Router);

  activeSection: string = 'home';
  readonly cartCount = signal(0);
  readonly orderCount = signal(0);

  private readonly handleCartEvent = () => this.syncCartCount();
  private readonly handleOrdersEvent = () => this.syncOrderCount();

  ngOnInit(): void {
    this.syncCartCount();
    this.syncOrderCount();
    window.addEventListener('pulsemart-cart-updated', this.handleCartEvent);
    window.addEventListener('pulsemart-orders-updated', this.handleOrdersEvent);
    window.addEventListener('storage', () => {
      this.syncCartCount();
      this.syncOrderCount();
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('pulsemart-cart-updated', this.handleCartEvent);
    window.removeEventListener('pulsemart-orders-updated', this.handleOrdersEvent);
  }

  syncCartCount(): void {
    try {
      const raw = localStorage.getItem('pulsemart_cart');
      const items = raw ? JSON.parse(raw) : [];
      const totalQty = Array.isArray(items)
        ? items.reduce((sum: number, item: { quantity?: number }) => sum + (item.quantity || 1), 0)
        : 0;
      this.cartCount.set(totalQty);
    } catch {
      this.cartCount.set(0);
    }
  }

  syncOrderCount(): void {
    try {
      const count = Number(localStorage.getItem('pulsemart_order_count') || 0);
      this.orderCount.set(count);
    } catch {
      this.orderCount.set(0);
    }
  }

  openMyOrders(): void {
    window.dispatchEvent(new CustomEvent('pulsemart-open-orders'));
  }

  openCartDrawer(): void {
    window.dispatchEvent(new CustomEvent('pulsemart-open-cart'));
  }

  isAdminRoute(): boolean {
    return this.router.url.startsWith('/admin');
  }

  isUserDashboardRoute(): boolean {
    return this.router.url.startsWith('/user-dashboard');
  }

  logout(): void {
    localStorage.clear();
    this.cartCount.set(0);
    this.orderCount.set(0);
    this.activeSection = 'home';
    this.router.navigate(['/login']);
  }

  navigateToSection(sectionId: string) {
    this.activeSection = sectionId;

    if (this.router.url !== '/') {
      this.router.navigate(['/']).then(() => {
        setTimeout(() => this.triggerScroll(sectionId), 100);
      });
    } else {
      this.triggerScroll(sectionId);
    }
  }

  private triggerScroll(sectionId: string) {
    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const targetElement = document.getElementById(sectionId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}