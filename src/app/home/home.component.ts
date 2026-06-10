import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="home-wrapper animated-fade-in">
      <header class="home-header">
        <div class="logo-area-wrapper">
          <div class="logo-area">
            <img src="logo.png" alt="CDS Logo" class="brand-logo">
            <h1>CDS Corporate Asset Desk</h1>
          </div>
          <button class="btn-logout" (click)="logout()">
            <span class="material-symbols-outlined">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
        <p class="subtitle">Securely manage, allocate, and track return transactions for company IT infrastructure.</p>
      </header>

      <main class="cards-grid">
        <!-- Asset Allocation Form Card -->
        <div class="glass-panel form-card allocation-card" (click)="navigate('/asset-allocation')">
          <div class="card-glow"></div>
          <div class="card-icon-container">
            <span class="material-symbols-outlined card-icon">assignment_add</span>
          </div>
          <h2>Asset Allocation Form</h2>
          <p class="card-desc">Assign laptops, accessories, and devices to employees. Capture digital agreements, signoff logs, and export signed PDFs instantly.</p>
          <div class="card-action">
            <span>Create Allocation AAF</span>
            <span class="material-symbols-outlined arrow-icon">arrow_forward</span>
          </div>
        </div>

        <!-- Asset Return Form Card -->
        <div class="glass-panel form-card return-card" (click)="navigate('/asset-return')">
          <div class="card-glow"></div>
          <div class="card-icon-container">
            <span class="material-symbols-outlined card-icon">assignment_return</span>
          </div>
          <h2>Asset Return Form</h2>
          <p class="card-desc">Process employee exit clearances or equipment returns. Record physical item condition, remarks, and complete offboarding signoffs.</p>
          <div class="card-action">
            <span>Create Return ARF</span>
            <span class="material-symbols-outlined arrow-icon">arrow_forward</span>
          </div>
        </div>
      </main>

      <footer class="home-footer">
        <p>&copy; 2026 CDS Global. All rights reserved. Technology Asset Operations.</p>
      </footer>
    </div>
  `,
  styles: [`
    .home-wrapper {
      max-width: 1100px;
      margin: 0 auto;
      padding: 4rem 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 80vh;
      justify-content: center;
    }

    .home-header {
      width: 100%;
      margin-bottom: 4rem;
      
      .logo-area-wrapper {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-bottom: 12px;
        flex-wrap: wrap;
        gap: 16px;
      }
      
      .logo-area {
        display: flex;
        align-items: center;
        gap: 16px;
        
        .brand-logo {
          max-width: 120px;
          height: auto;
        }

        h1 {
          font-size: 2.2rem;
          margin: 0;
          background: linear-gradient(to right, #ffffff, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      }

      .subtitle {
        font-size: 1.1rem;
        color: var(--text-secondary);
        max-width: 800px;
        margin: 12px 0 0 0;
        line-height: 1.6;
        text-align: left;
      }

      .btn-logout {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(239, 68, 68, 0.08);
        border: 1px solid rgba(239, 68, 68, 0.2);
        color: #f87171;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-family: 'Outfit', sans-serif;
        font-size: 0.9rem;
        font-weight: 500;
        transition: var(--transition);

        &:hover {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.4);
          color: #ef4444;
        }

        .material-symbols-outlined {
          font-size: 1.2rem;
        }
      }
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 2.5rem;
      width: 100%;
      max-width: 100%;
      margin-bottom: 4rem;
    }

    .form-card {
      position: relative;
      padding: 3rem 2.5rem;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      
      .card-glow {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.15), transparent 50%);
        transition: var(--transition);
        pointer-events: none;
      }

      .card-icon-container {
        width: 64px;
        height: 64px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 2rem;
        transition: var(--transition);
      }

      h2 {
        font-size: 1.6rem;
        margin: 0 0 1rem 0;
        color: var(--text-primary);
        font-family: 'Outfit', sans-serif;
      }

      .card-desc {
        font-size: 0.95rem;
        color: var(--text-secondary);
        line-height: 1.6;
        margin: 0 0 2rem 0;
        flex-grow: 1;
      }

      .card-action {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 0.95rem;
        font-family: 'Outfit', sans-serif;
        color: var(--text-primary);
        transition: var(--transition);

        .arrow-icon {
          font-size: 1.2rem;
          transition: var(--transition);
        }
      }

      /* Hover effects */
      &:hover {
        transform: translateY(-8px);
        
        .card-glow {
          background: radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.25), transparent 60%);
        }

        .card-icon-container {
          transform: scale(1.1);
        }

        .arrow-icon {
          transform: translateX(6px);
        }
      }
    }

    .allocation-card {
      .card-icon-container {
        background: rgba(99, 102, 241, 0.1);
        border: 1px solid rgba(99, 102, 241, 0.2);
        color: #818cf8;
      }
      &:hover {
        border-color: rgba(99, 102, 241, 0.4);
        .card-action {
          color: #818cf8;
        }
      }
    }

    .return-card {
      .card-glow {
        background: radial-gradient(circle at 0% 0%, rgba(6, 182, 212, 0.15), transparent 50%);
      }
      .card-icon-container {
        background: rgba(6, 182, 212, 0.1);
        border: 1px solid rgba(6, 182, 212, 0.2);
        color: #22d3ee;
      }
      &:hover {
        border-color: rgba(6, 182, 212, 0.4);
        .card-glow {
          background: radial-gradient(circle at 0% 0%, rgba(6, 182, 212, 0.25), transparent 60%);
        }
        .card-action {
          color: #22d3ee;
        }
      }
    }

    .home-footer {
      text-align: center;
      color: var(--text-muted);
      font-size: 0.85rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      width: 100%;
      padding-top: 2rem;
    }
  `]
})
export class HomeComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {
    const defaultUrl = 'https://default341b9d227ada4241a9655bfe4236cc.a5.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/ba5f3f5c52b8404185dc22d1148a683b/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=fcctrUc8kW5okax-H-UBPh4uU8K63r2jW3_wqxStdJQ';
    const current = localStorage.getItem('cds_sharepoint_webhook_url');
    // If no URL is saved, or it is the old unauthenticated one, update it to the new SAS URL
    if (!current || !current.includes('sig=')) {
      localStorage.setItem('cds_sharepoint_webhook_url', defaultUrl);
    }
  }

  navigate(path: string) {
    this.router.navigate([path]);
  }

  logout() {
    sessionStorage.removeItem('isLoggedIn');
    this.router.navigate(['/login']);
  }
}
