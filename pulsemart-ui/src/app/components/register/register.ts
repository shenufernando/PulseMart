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

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit(): void {
    this.error.set('');
    this.success.set('');
    this.loading.set(true);

    this.auth.register(this.fullName, this.email, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set('Account created! Redirecting to login...');
        setTimeout(() => this.router.navigate(['/login']), 1200);
      },
      error: (err: any) => {
        this.loading.set(false);
        const body = err?.error;
        const validationList =
          body?.errors && typeof body.errors === 'object'
            ? Object.values(body.errors).flat().join(' | ')
            : '';

        this.error.set(
          validationList ||
            (typeof body === 'string' ? body : body?.message) ||
            body?.title ||
            'Registration failed. Please try again.'
        );
      },
    });
  }
}