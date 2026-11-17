import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Product, ProductService } from '../../services/product.service';
import {
  OrderItemLine,
  OrderRecord,
  ProductReview,
  PulseMartStoreService,
} from '../../services/pulsemart-store.service';

export interface CartItem {
  product: Product;
  quantity: number;
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
  private readonly store = inject(PulseMartStoreService);
  private readonly router = inject(Router);

  readonly categories = ['All', 'Electronics', 'Fashion', 'Home & Living', 'Accessories', 'General'];
  readonly products = this.productService.products;
  readonly orders = this.store.orders;
  readonly reviews = this.store.reviews;

  // Navigation tab ('storefront' | 'orders')
  readonly activeTab = signal<'storefront' | 'orders'>('storefront');

  search = '';
  selectedCategory = 'All';
  readonly loading = signal(false);
  readonly submittingOrder = signal(false);
  readonly errorMessage = signal('');
  readonly activeProduct = signal<Product | null>(null);

  // Cart state
  readonly cartItems = signal<CartItem[]>([]);
  readonly cartOpen = signal(false);
  readonly cartToast = signal('');

  // Checkout Modal state ('buy-now' | 'cart')
  readonly checkoutMode = signal<'buy-now' | 'cart' | null>(null);
  readonly buyNowProduct = signal<Product | null>(null);
  readonly quantity = signal(1);
  customerName = '';
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
  readonly orderReceipt = signal<OrderRecord | null>(null);

  // Review Modal state
  readonly reviewTarget = signal<{
    productId: number;
    productName: string;
    orderCode: string;
  } | null>(null);
  reviewRating = 5;
  reviewComment = '';
  readonly submittingReview = signal(false);

  readonly optionChoices = ['Standard', 'S', 'M', 'L', 'XL'];

  readonly activeProductReviews = computed(() => {
    const prod = this.activeProduct();
    if (!prod) return [];
    return this.reviews().filter((r) => Number(r.productId) === Number(prod.id));
  });

  private readonly handleOpenCartEvent = () => {
    this.openCartDrawer();
  };

  private readonly handleOpenOrdersEvent = () => {
    this.activeTab.set('orders');
    this.store.fetchBackendOrders();
  };

  readonly subtotal = computed(() => {
    if (this.checkoutMode() === 'buy-now') {
      const product = this.buyNowProduct();
      if (!product) return 0;
      const safeQty = Math.max(1, Math.min(Number(this.quantity()) || 1, product.stock || 1));
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
    window.addEventListener('pulsemart-open-orders', this.handleOpenOrdersEvent);
    this.loadStorefront();
    this.store.fetchBackendOrders();
    this.store.fetchBackendReviews();
  }

  ngOnDestroy(): void {
    window.removeEventListener('pulsemart-open-cart', this.handleOpenCartEvent);
    window.removeEventListener('pulsemart-open-orders', this.handleOpenOrdersEvent);
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
      next: () => {
        this.store.applyStockOverridesToProducts();
        this.loading.set(false);
      },
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
    this.store.fetchBackendReviews();
  }

  closeProduct(): void {
    this.activeProduct.set(null);
  }

  getProductReviews(productId: number): ProductReview[] {
    return this.reviews().filter((r) => Number(r.productId) === Number(productId));
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
    this.showToast(`${product.name} added to cart`);
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
    this.quantity.set(1);
    this.customerName = localStorage.getItem('userName') || localStorage.getItem('name') || '';
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
    this.customerName = localStorage.getItem('userName') || localStorage.getItem('name') || '';
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

  viewMyOrdersFromReceipt(): void {
    this.closeCheckoutModal();
    this.activeTab.set('orders');
    this.store.fetchBackendOrders();
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

  onQuantityChange(newValue: number | string): void {
    const product = this.buyNowProduct();
    if (!product) return;

    const parsed = Number(newValue);
    if (!parsed || parsed < 1) {
      this.quantity.set(1);
    } else if (parsed > product.stock) {
      this.quantity.set(product.stock);
    } else {
      this.quantity.set(Math.floor(parsed));
    }
  }

  confirmOrder(): void {
    if (this.submittingOrder()) return;

    const badFields: string[] = [];

    const trimmedName = this.customerName.trim();
    const trimmedAddress = this.deliveryAddress.trim();
    const cleanPhone = this.phoneNumber.replace(/\s+/g, '');

    if (!trimmedName || trimmedName.length < 2) {
      badFields.push('customerName');
    }

    if (!trimmedAddress || trimmedAddress.length < 5) {
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
    this.submittingOrder.set(true);

    const orderCode = 'PM-' + Math.floor(1000 + Math.random() * 9000);
    const status: OrderRecord['status'] = this.paymentMethod === 'Card' ? 'Confirmed' : 'Pending';
    const customerEmail = localStorage.getItem('userEmail') || localStorage.getItem('email') || '';

    let orderItems: OrderItemLine[] = [];
    let finalSubtotal = 0;

    if (this.checkoutMode() === 'buy-now') {
      const product = this.buyNowProduct();
      if (!product) {
        this.submittingOrder.set(false);
        return;
      }

      const safeQty = Math.max(1, Math.min(Number(this.quantity()) || 1, product.stock));
      finalSubtotal = product.price * safeQty;

      orderItems = [
        {
          productId: product.id,
          productName: product.name,
          imageUrl: product.imageUrl,
          quantity: safeQty,
          unitPrice: product.price,
        },
      ];
    } else if (this.checkoutMode() === 'cart') {
      const items = this.cartItems();
      finalSubtotal = items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );

      orderItems = items.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        imageUrl: item.product.imageUrl,
        quantity: item.quantity,
        unitPrice: item.product.price,
      }));
    }

    const finalDelivery = finalSubtotal > 10000 ? 0 : 450;
    const finalTotal = finalSubtotal + finalDelivery;
    const summaryText = orderItems
      .map((item) => `${item.productName} × ${item.quantity}`)
      .join(', ');

    const payload: OrderRecord = {
      orderCode,
      orderId: orderCode,
      customerName: trimmedName,
      customerEmail,
      items: orderItems,
      itemsSummary: summaryText,
      totalPayable: finalTotal,
      deliveryFee: finalDelivery,
      paymentMethod: this.paymentMethod,
      deliveryAddress: trimmedAddress,
      phoneNumber: cleanPhone,
      selectedOption: this.selectedOption,
      status,
    };

    this.store.createOrder(payload).subscribe({
      next: (savedOrder) => {
        this.submittingOrder.set(false);
        this.orderReceipt.set(savedOrder);
        if (this.checkoutMode() === 'cart') {
          this.saveCartToStorage([]);
        }
      },
      error: (err) => {
        this.submittingOrder.set(false);
        this.orderError.set(err?.error?.message || 'Failed to save order to database.');
      },
    });
  }

  // Review Modal actions
  openReviewModal(item: OrderItemLine, order: OrderRecord): void {
    this.reviewTarget.set({
      productId: item.productId,
      productName: item.productName,
      orderCode: order.orderCode || order.orderId || '',
    });
    this.reviewRating = 5;
    this.reviewComment = '';
  }

  closeReviewModal(): void {
    this.reviewTarget.set(null);
  }

  submitProductReview(): void {
    const target = this.reviewTarget();
    if (!target || !this.reviewComment.trim() || this.submittingReview()) return;

    const matchingOrder = this.orders().find(
      (o) => (o.orderCode || o.orderId) === target.orderCode
    );
    const reviewerName =
      matchingOrder?.customerName ||
      localStorage.getItem('userName') ||
      localStorage.getItem('name') ||
      'Verified Buyer';

    this.submittingReview.set(true);
    this.store
      .addReview({
        productId: target.productId,
        productName: target.productName,
        orderCode: target.orderCode,
        customerName: reviewerName,
        reviewerName,
        rating: Number(this.reviewRating),
        comment: this.reviewComment.trim(),
      })
      .subscribe({
        next: () => {
          this.submittingReview.set(false);
          this.reviewTarget.set(null);
          this.showToast('Thank you! Your review is now live on the storefront.');
        },
        error: () => {
          this.submittingReview.set(false);
          this.showToast('Unable to submit review.');
        },
      });
  }

  private showToast(msg: string): void {
    this.cartToast.set(msg);
    setTimeout(() => {
      if (this.cartToast() === msg) {
        this.cartToast.set('');
      }
    }, 2500);
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}