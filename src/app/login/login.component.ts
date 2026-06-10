import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-page-container">
      <div class="glass-panel login-card animated-scale">
        <div class="brand-header">
          <img src="logo.png" alt="CDS Logo" class="brand-logo">
          <h1>CDS Form Portal</h1>
          <p class="subtitle">IT Administration Sign-In</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" novalidate [class.shake-animation]="showErrorShake">
          <!-- Error alert -->
          <div class="error-alert animated-fade-in" *ngIf="errorMessage">
            <span class="material-symbols-outlined alert-icon">warning</span>
            <span>{{ errorMessage }}</span>
          </div>

          <div class="form-field-wrapper" [class.has-error]="submitted && loginForm.get('email')?.invalid">
            <label for="email">Admin Email</label>
            <div class="input-wrapper">
              <span class="material-symbols-outlined input-icon">mail</span>
              <input 
                id="email" 
                type="email" 
                formControlName="email" 
                placeholder="email@cdsgroups.com" 
                autocomplete="username"
              >
            </div>
            <span class="error-text" *ngIf="submitted && loginForm.get('email')?.hasError('required')">
              Email is required
            </span>
            <span class="error-text" *ngIf="submitted && loginForm.get('email')?.hasError('email')">
              Enter a valid email address
            </span>
          </div>

          <div class="form-field-wrapper" [class.has-error]="submitted && loginForm.get('password')?.invalid">
            <label for="password">Password</label>
            <div class="input-wrapper">
              <span class="material-symbols-outlined input-icon">lock</span>
              <input 
                id="password" 
                [type]="showPassword ? 'text' : 'password'" 
                formControlName="password" 
                placeholder="••••••••••••" 
                autocomplete="current-password"
              >
              <button 
                type="button" 
                class="btn-toggle-password" 
                (click)="showPassword = !showPassword"
                [title]="showPassword ? 'Hide password' : 'Show password'"
              >
                <span class="material-symbols-outlined">
                  {{ showPassword ? 'visibility_off' : 'visibility' }}
                </span>
              </button>
            </div>
            <span class="error-text" *ngIf="submitted && loginForm.get('password')?.hasError('required')">
              Password is required
            </span>
          </div>

          <button type="submit" class="btn-primary btn-submit" [disabled]="loading">
            <span class="material-symbols-outlined icon-left" *ngIf="!loading">login</span>
            <span class="spinner-small" *ngIf="loading"></span>
            <span>{{ loading ? 'Authenticating...' : 'Sign In' }}</span>
          </button>
        </form>
      </div>
      
      <div class="login-footer">
        <p>&copy; 2026 CDS Groups. All rights reserved.</p>
      </div>
    </div>
  `,
  styles: [`
    .login-page-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.08), transparent 45%),
                  radial-gradient(circle at bottom left, rgba(6, 182, 212, 0.08), transparent 45%),
                  var(--bg-primary);
      padding: 2rem 1rem;
      box-sizing: border-box;
    }

    .login-card {
      width: 100%;
      max-width: 440px;
      padding: 3rem 2.5rem;
      box-sizing: border-box;
      border: 1px solid var(--glass-border);
      box-shadow: var(--glass-shadow);
      background: var(--bg-secondary);
      border-radius: var(--border-radius);
    }

    @media (max-width: 480px) {
      .login-card {
        padding: 2rem 1.5rem;
      }
    }

    .brand-header {
      text-align: center;
      margin-bottom: 2.5rem;

      .brand-logo {
        max-width: 140px;
        height: auto;
        margin-bottom: 1.5rem;
      }

      h1 {
        margin: 0;
        font-size: 1.75rem;
        font-family: 'Outfit', sans-serif;
        font-weight: 700;
        background: linear-gradient(to right, #ffffff, #cbd5e1);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .subtitle {
        margin: 6px 0 0 0;
        font-size: 0.9rem;
        color: var(--text-secondary);
      }
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .error-alert {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 8px;
      padding: 10px 14px;
      color: #f87171;
      font-size: 0.85rem;

      .alert-icon {
        font-size: 1.25rem;
        color: #ef4444;
        flex-shrink: 0;
      }
    }

    .form-field-wrapper {
      display: flex;
      flex-direction: column;
      gap: 6px;

      label {
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--text-secondary);
        font-family: 'Outfit', sans-serif;
      }

      .input-wrapper {
        position: relative;
        display: flex;
        align-items: center;

        .input-icon {
          position: absolute;
          left: 14px;
          color: var(--text-muted);
          font-size: 1.2rem;
          pointer-events: none;
        }

        input {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 11px 14px 11px 42px;
          color: var(--text-primary);
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          transition: var(--transition);
          width: 100%;
          box-sizing: border-box;
          outline: none;

          &:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
            background: rgba(255, 255, 255, 0.05);
          }

          &::placeholder {
            color: var(--text-muted);
            opacity: 0.7;
          }
        }

        .btn-toggle-password {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: var(--transition);

          &:hover {
            color: var(--text-primary);
            background: rgba(255, 255, 255, 0.05);
          }
          
          .material-symbols-outlined {
            font-size: 1.2rem;
          }
        }
      }
    }

    .form-field-wrapper.has-error {
      label {
        color: var(--danger-color);
      }
      input {
        border-color: rgba(239, 68, 68, 0.4);
        background: rgba(239, 68, 68, 0.02);

        &:focus {
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
        }
      }
    }

    .error-text {
      font-size: 0.75rem;
      color: #f87171;
      margin-top: 2px;
    }

    .btn-submit {
      width: 100%;
      padding: 12px !important;
      font-size: 0.95rem !important;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 1rem;
    }

    .login-footer {
      margin-top: 2rem;
      text-align: center;
      
      p {
        font-size: 0.8rem;
        color: var(--text-muted);
      }
    }

    /* Shake animation for failed attempt */
    .shake-animation {
      animation: shake 0.4s ease-in-out;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-6px); }
      40%, 80% { transform: translateX(6px); }
    }
  `]
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  submitted = false;
  loading = false;
  showPassword = false;
  errorMessage = '';
  showErrorShake = false;

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit() {
    // Redirect if already logged in
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
      this.router.navigate(['/home']);
    }

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';

    if (this.loginForm.invalid) {
      this.triggerShake();
      return;
    }

    this.loading = true;
    const { email, password } = this.loginForm.value;

    // Simulate authenticating for micro-interactions
    setTimeout(() => {
      if (email === 'ramgopal@cdsgroups.com' && password === 'CDSGroups!23') {
        sessionStorage.setItem('isLoggedIn', 'true');
        this.router.navigate(['/home']);
      } else {
        this.loading = false;
        this.errorMessage = 'Invalid email or password. Please try again.';
        this.triggerShake();
      }
    }, 800);
  }

  private triggerShake() {
    this.showErrorShake = true;
    setTimeout(() => {
      this.showErrorShake = false;
    }, 400);
  }
}
