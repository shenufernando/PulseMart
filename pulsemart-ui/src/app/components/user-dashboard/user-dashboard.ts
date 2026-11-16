import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Product, ProductService } from '../../services/product.service';

export interface CartItem {
  product: Product;
  quantity: number;
  selectedOption: string;
}

export interface OrderReceipt {
  orderId: string;
  itemsSummary: string;
  totalPayable: number;
  deliveryFee: number;
  paymentMethod: 'Cash' | 'Card';
  deliveryAddress: string;
  phoneNumber: string;
  selectedOption: string;
}

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.css',
})
export class UserDashboard implements OnInit, OnDestroy {
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);

  readonly categories = ['All', 'Electronics', 'Fashion', 'Home & Living', 'Accessories', 'General'];
  readonly products = this.productService.products;

  search = '';
  selectedCategory = 'All';
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly activeProduct = signal<Product | null>(null);

  // Cart state
  readonly cartItems = signal<CartItem[]>([]);
  readonly cartOpen = signal(false);
  readonly cartToast = signal('');

  // Checkout Modal state ('buy-now' | 'cart')
  readonly checkoutMode = signal<'buy-now' | 'cart' | null>(null);
  readonly buyNowProduct = signal<Product | null>(null);
  quantity = 1;
  selectedOption = 'Standard';
  deliveryAddress = '';
  phoneNumber = '';

  // Payment & Result state
  paymentMethod: 'Cash' | 'Card' = 'Cash';
  cardHolderName = '';
  cardNumber = '';
  cardExpiry = '';
  cardCvv = '';

  readonly orderError = signal('');
  readonly invalidFields = signal<string[]>([]);
  readonly orderReceipt = signal<OrderReceipt | null>(null);

  readonly optionChoices = ['Standard', 'S', 'M', 'L', 'XL'];

  private readonly handleOpenCartEvent = () => {
    this.openCartDrawer();
  };

  readonly subtotal = computed(() => {
    if (this.checkoutMode() === 'buy-now') {
      const product = this.buyNowProduct();
      if (!product) return 0;
      const safeQty = Math.max(1, Math.min(Number(this.quantity) || 1, product.stock || 1));
      return product.price * safeQty;
    }

    if (this.checkoutMode() === 'cart') {
      return this.cartItems().reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );
    }

    return 0;
  });

  readonly deliveryFee = computed(() => {
    if (!this.checkoutMode()) return 0;
    return this.subtotal() > 10000 ? 0 : 450;
  });

  readonly totalPayable = computed(() => {
    return this.subtotal() + this.deliveryFee();
  });

  ngOnInit(): void {
    this.restoreCartFromStorage();
    window.addEventListener('pulsemart-open-cart', this.handleOpenCartEvent);
    this.loadStorefront();
  }

  ngOnDestroy(): void {
    window.removeEventListener('pulsemart-open-cart', this.handleOpenCartEvent);
  }

  private restoreCartFromStorage(): void {
    try {
      const raw = localStorage.getItem('pulsemart_cart');
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        this.cartItems.set(parsed);
      }
    } catch {
      this.cartItems.set([]);
    }
  }

  private saveCartToStorage(items: CartItem[]): void {
    this.cartItems.set(items);
    localStorage.setItem('pulsemart_cart', JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('pulsemart-cart-updated'));
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

  // Cart Drawer controls
  openCartDrawer(): void {
    this.cartOpen.set(true);
  }

  closeCartDrawer(): void {
    this.cartOpen.set(false);
  }

  addToCart(product: Product, event?: Event): void {
    event?.stopPropagation();
    if (product.stock <= 0) return;

    const current = [...this.cartItems()];
    const existingIndex = current.findIndex((item) => item.product.id === product.id);

    if (existingIndex > -1) {
      const existing = current[existingIndex];
      if (existing.quantity < product.stock) {
        current[existingIndex] = {
          ...existing,
          quantity: existing.quantity + 1,
        };
      }
    } else {
      current.push({
        product,
        quantity: 1,
        selectedOption: product.category === 'Fashion' ? 'M' : 'Standard',
      });
    }

    this.saveCartToStorage(current);
    this.cartToast.set(`${product.name} added to cart`);
    setTimeout(() => {
      if (this.cartToast() === `${product.name} added to cart`) {
        this.cartToast.set('');
      }
    }, 2200);
  }

  updateCartItemQty(index: number, delta: number): void {
    const current = [...this.cartItems()];
    const item = current[index];
    if (!item) return;

    const nextQty = item.quantity + delta;
    if (nextQty <= 0) {
      current.splice(index, 1);
    } else {
      current[index] = {
        ...item,
        quantity: Math.min(nextQty, item.product.stock || nextQty),
      };
    }
    this.saveCartToStorage(current);
  }

  removeCartItem(index: number): void {
    const current = [...this.cartItems()];
    current.splice(index, 1);
    this.saveCartToStorage(current);
  }

  // Open Buy Now Checkout Modal
  openBuyNow(product: Product, event?: Event): void {
    event?.stopPropagation();
    if (product.stock <= 0) return;

    this.resetCheckoutFeedback();
    this.checkoutMode.set('buy-now');
    this.buyNowProduct.set(product);
    this.quantity = 1;
    this.selectedOption = product.category === 'Fashion' ? 'M' : 'Standard';
    this.deliveryAddress = '';
    this.phoneNumber = '';
    this.paymentMethod = 'Cash';
    this.clearCardFields();
  }

  // Open Cart Checkout Modal
  openCartCheckout(): void {
    if (this.cartItems().length === 0) return;

    this.resetCheckoutFeedback();
    this.cartOpen.set(false);
    this.checkoutMode.set('cart');
    this.buyNowProduct.set(null);
    this.selectedOption = this.cartItems()[0]?.selectedOption || 'Standard';
    this.deliveryAddress = '';
    this.phoneNumber = '';
    this.paymentMethod = 'Cash';
    this.clearCardFields();
  }

  closeCheckoutModal(): void {
    this.checkoutMode.set(null);
    this.buyNowProduct.set(null);
    this.resetCheckoutFeedback();
  }

  private resetCheckoutFeedback(): void {
    this.orderError.set('');
    this.invalidFields.set([]);
    this.orderReceipt.set(null);
  }

  private clearCardFields(): void {
    this.cardHolderName = '';
    this.cardNumber = '';
    this.cardExpiry = '';
    this.cardCvv = '';
  }

  hasInvalidField(field: string): boolean {
    return this.invalidFields().includes(field);
  }

  onQuantityChange(): void {
    const product = this.buyNowProduct();
    if (!product) return;

    if (this.quantity < 1) {
      this.quantity = 1;
    } else if (this.quantity > product.stock) {
      this.quantity = product.stock;
    }
  }

  confirmOrder(): void {
    const badFields: string[] = [];

    const trimmedAddress = this.deliveryAddress.trim();
    const cleanPhone = this.phoneNumber.replace(/\s+/g, '');

    if (!trimmedAddress || trimmedAddress.length < 6) {
      badFields.push('address');
    }

    if (!/^0\d{9}$/.test(cleanPhone)) {
      badFields.push('phone');
    }

    if (this.paymentMethod === 'Card') {
      if (!this.cardHolderName.trim() || this.cardHolderName.trim().length < 3) {
        badFields.push('cardHolder');
      }
      const digitsOnlyCard = this.cardNumber.replace(/\D/g, '');
      if (!/^\d{16}$/.test(digitsOnlyCard)) {
        badFields.push('cardNumber');
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(this.cardExpiry.trim())) {
        badFields.push('cardExpiry');
      }
      if (!/^\d{3,4}$/.test(this.cardCvv.trim())) {
        badFields.push('cardCvv');
      }
    }

    if (badFields.length > 0) {
      this.invalidFields.set(badFields);
      this.orderError.set('Order Failed: Please check the highlighted fields before confirming.');
      return;
    }

    this.invalidFields.set([]);
    this.orderError.set('');

    const orderId = 'PM-' + Math.floor(1000 + Math.random() * 9000);

    if (this.checkoutMode() === 'buy-now') {
      const product = this.buyNowProduct();
      if (!product) return;

      const safeQty = Math.max(1, Math.min(Number(this.quantity) || 1, product.stock));
      this.decrementProductStock(product.id, safeQty);

      this.orderReceipt.set({
        orderId,
        itemsSummary: `${product.name} × ${safeQty}`,
        totalPayable: this.totalPayable(),
        deliveryFee: this.deliveryFee(),
        paymentMethod: this.paymentMethod,
        deliveryAddress: trimmedAddress,
        phoneNumber: cleanPhone,
        selectedOption: this.selectedOption,
      });
    } else if (this.checkoutMode() === 'cart') {
      const items = this.cartItems();
      items.forEach((item) => {
        this.decrementProductStock(item.product.id, item.quantity);
      });

      const summaryText = items
        .map((item) => `${item.product.name} × ${item.quantity}`)
        .join(', ');

      this.orderReceipt.set({
        orderId,
        itemsSummary: summaryText,
        totalPayable: this.totalPayable(),
        deliveryFee: this.deliveryFee(),
        paymentMethod: this.paymentMethod,
        deliveryAddress: trimmedAddress,
        phoneNumber: cleanPhone,
        selectedOption: this.selectedOption,
      });

      this.saveCartToStorage([]);
    }
  }

  private decrementProductStock(productId: number | string, qty: number): void {
    const updated = this.products().map((p) => {
      if (p.id === productId) {
        const nextStock = Math.max(0, (p.stock || 0) - qty);
        return { ...p, stock: nextStock };
      }
      return p;
    });
    this.products.set(updated);
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}