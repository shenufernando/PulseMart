import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { AdminDashboard } from './admin-dashboard';
import { Product, ProductService } from '../../services/product.service';

describe('AdminDashboard', () => {
  let fixture: ComponentFixture<AdminDashboard>;
  let component: AdminDashboard;

  const productsSignal = signal<Product[]>([]);

  const productServiceMock = {
    products: productsSignal,
    getProducts: () => of([]),
    createProduct: () =>
      of({
        id: 1,
        name: 'Wireless Headphones',
        category: 'Electronics',
        price: 99.99,
        stock: 15,
        description: 'Noise canceling',
        imageUrl: '',
      }),
    deleteProduct: () => of({ message: 'Product deleted.' }),
  };

  beforeEach(async () => {
    productsSignal.set([]);

    await TestBed.configureTestingModule({
      imports: [AdminDashboard],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ProductService, useValue: productServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create AdminDashboard', () => {
    expect(component).toBeTruthy();
  });

  it('should show error when required fields are invalid', () => {
    component.name = '';
    component.price = null;
    component.stock = null;

    component.publishItem();

    expect(component.errorMessage()).toBe(
      'Please enter a valid item name, price, and stock quantity.'
    );
  });

  it('should publish valid item post', () => {
    component.name = 'Wireless Headphones';
    component.category = 'Electronics';
    component.price = 99.99;
    component.stock = 15;
    component.description = 'Noise canceling';

    component.publishItem();

    expect(component.successMessage()).toBe(
      'Item post published! Visible on User Dashboard now.'
    );
  });
});