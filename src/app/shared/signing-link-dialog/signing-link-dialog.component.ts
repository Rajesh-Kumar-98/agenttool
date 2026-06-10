import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface SigningLinkDialogData {
  link: string;
  employeeName: string;
}

@Component({
  selector: 'app-signing-link-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <span class="material-symbols-outlined header-icon">link</span>
        <h2>Employee Signing Link</h2>
        <button class="btn-close" (click)="close()">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="dialog-body">
        <p class="description">
          Share this link with <strong>{{ data.employeeName || 'the employee' }}</strong>. 
          When they open it, they will see a read-only view of the assigned assets and can draw their digital signature to complete the form.
        </p>

        <div class="link-box">
          <input type="text" [value]="data.link" readonly #linkInput class="link-input">
          <button class="btn-copy" (click)="copyLink(linkInput)" [class.copied]="copied">
            <span class="material-symbols-outlined">{{ copied ? 'check' : 'content_copy' }}</span>
            <span>{{ copied ? 'Copied' : 'Copy' }}</span>
          </button>
        </div>

        <div class="note-box">
          <span class="material-symbols-outlined note-icon">lightbulb</span>
          <p>
            This link contains the serialized form details and your IT Admin signature securely encoded. 
            No database is required to store this state.
          </p>
        </div>
      </div>

      <div class="dialog-actions">
        <button class="btn-primary" (click)="close()">Close</button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: 24px;
      background: var(--bg-secondary);
      border-radius: var(--border-radius);
      border: 1px solid var(--glass-border);
      box-shadow: var(--glass-shadow);
      max-width: 550px;
      width: 100%;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      position: relative;

      .header-icon {
        color: var(--primary-color);
        font-size: 1.8rem;
      }

      h2 {
        margin: 0;
        font-size: 1.3rem;
        font-family: 'Outfit', sans-serif;
        color: var(--text-primary);
        font-weight: 600;
      }

      .btn-close {
        position: absolute;
        right: -10px;
        top: -10px;
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6px;
        border-radius: 50%;
        transition: var(--transition);
        
        &:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }
      }
    }

    .dialog-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }

    .description {
      color: var(--text-secondary);
      font-size: 0.9rem;
      line-height: 1.5;
      margin: 0;

      strong {
        color: var(--text-primary);
      }
    }

    .link-box {
      display: flex;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      overflow: hidden;
      align-items: center;
    }

    .link-input {
      flex: 1;
      background: none;
      border: none;
      color: #cbd5e1;
      padding: 12px 14px;
      font-size: 0.8rem;
      outline: none;
      font-family: monospace;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
    }

    .btn-copy {
      background: var(--primary-color);
      color: #ffffff;
      border: none;
      padding: 12px 18px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: 'Outfit', sans-serif;
      transition: var(--transition);

      &:hover {
        background: var(--primary-hover);
      }

      &.copied {
        background: #10b981;
        color: #ffffff;
      }

      span {
        font-size: 1.1rem;
      }
    }

    .note-box {
      display: flex;
      gap: 10px;
      padding: 12px 14px;
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.2);
      border-radius: 8px;
      align-items: flex-start;

      .note-icon {
        color: #f59e0b;
        font-size: 1.3rem;
      }

      p {
        margin: 0;
        font-size: 0.8rem;
        line-height: 1.4;
        color: #f3f4f6;
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
    }
  `]
})
export class SigningLinkDialogComponent {
  copied = false;

  constructor(
    private dialogRef: MatDialogRef<SigningLinkDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SigningLinkDialogData
  ) {}

  close() {
    this.dialogRef.close();
  }

  copyLink(inputElement: HTMLInputElement) {
    inputElement.select();
    inputElement.setSelectionRange(0, 99999); // For mobile devices
    
    navigator.clipboard.writeText(inputElement.value).then(() => {
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2000);
    });
  }
}
