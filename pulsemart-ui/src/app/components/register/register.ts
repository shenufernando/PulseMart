import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  fullName = '';
  email = '';
  password = '';

  loading = signal(false);
  error = signal('');
  success = signal('');

  fullNameError = signal('');
  emailError = signal('');
  passwordError = signal('');
  showPassword = signal(false);

  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor(private auth: AuthService, private router: Router) {}

  togglePasswordVisibility(): void {
    this.showPassword.update((current) => !current);
  }

  clearFieldError(field: 'fullName' | 'email' | 'password'): void {
    this.error.set('');
    this.success.set('');

    if (field === 'fullName') {
      this.fullNameError.set('');
    } else if (field === 'email') {
      this.emailError.set('');
    } else {
      this.passwordError.set('');
    }
  }

  private validateForm(): boolean {
    this.fullNameError.set('');
    this.emailError.set('');
    this.passwordError.set('');
    this.error.set('');
    this.success.set('');

    const trimmedName = this.fullName.trim();
    const trimmedEmail = this.email.trim();
    let isValid = true;

    if (!trimmedName) {
      this.fullNameError.set('Full name is required.');
      isValid = false;
    } else if (trimmedName.length < 2) {
      this.fullNameError.set('Full name must be at least 2 characters.');
      isValid = false;
    }

    if (!trimmedEmail) {
      this.emailError.set('Email address is required.');
      isValid = false;
    } else if (!this.emailRegex.test(trimmedEmail)) {
      this.emailError.set('Please enter a valid email address.');
      isValid = false;
    }

    if (!this.password) {
      this.passwordError.set('Password is required.');
      isValid = false;
    } else if (this.password.length < 6) {
      this.passwordError.set('Password must be at least 6 characters.');
      isValid = false;
    }

    return isValid;
  }

  onSubmit(): void {
    if (!this.validateForm()) {
      return;
    }

    this.loading.set(true);

    this.auth.register(this.fullName.trim(), this.email.trim(), this.password).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        this.success.set(res?.message || 'Account created! Redirecting to login...');
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1200);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Registration failed. Please try again.');
      },
    });
  }
}