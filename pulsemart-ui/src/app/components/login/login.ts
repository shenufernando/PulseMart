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

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit(): void {
    this.error.set('');
    this.loading.set(true);

    this.auth.login(this.email, this.password).subscribe({
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