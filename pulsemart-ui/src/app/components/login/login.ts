import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  email = '';
  password = '';

  loading = signal(false);
  error = signal('');
  emailError = signal('');
  passwordError = signal('');
  showPassword = signal(false);

  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor(private auth: AuthService, private router: Router) {}

  togglePasswordVisibility(): void {
    this.showPassword.update((current) => !current);
  }

  clearFieldError(field: 'email' | 'password'): void {
    this.error.set('');
    if (field === 'email') {
      this.emailError.set('');
    } else {
      this.passwordError.set('');
    }
  }

  private validateForm(): boolean {
    this.emailError.set('');
    this.passwordError.set('');
    this.error.set('');

    const trimmedEmail = this.email.trim();
    let isValid = true;

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
    }

    return isValid;
  }

  onSubmit(): void {
    if (!this.validateForm()) {
      return;
    }

    this.loading.set(true);

    this.auth.login(this.email.trim(), this.password).subscribe({
      next: (res: any) => {
        this.loading.set(false);

        const role = (res?.user?.role || res?.role || '').toString().toLowerCase();
        if (role) {
          localStorage.setItem('pulsemart_role', res?.user?.role || res?.role);
        }

        if (role === 'admin') {
          this.router.navigate(['/admin-dashboard']);
        } else {
          this.router.navigate(['/user-dashboard']);
        }
      },
      error: (err: any) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Invalid email or password.');
      },
    });
  }
}