import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';

export interface PdfPreviewData {
  blobUrl: string;
  doc: jsPDF;
  fileName: string;
  employeeName?: string;
  employeeId?: string;
  employeeEmail?: string;
  formType?: 'allocation' | 'return';
  isEmployee?: boolean;
  webhookUrl?: string;
}

// Local SMTPJS wrapper to eliminate external script dependencies and bypass adblocker/CSP rules
const EmailHelper = {
  send: function (options: any): Promise<string> {
    return new Promise(function (resolve, reject) {
      options.nocache = Math.floor(1e6 * Math.random() + 1);
      options.Action = 'Send';
      const jsonStr = JSON.stringify(options);
      EmailHelper.ajaxPost('https://smtpjs.com/v3/smtpjs.aspx', jsonStr, function (response: string) {
        resolve(response);
      });
    });
  },
  ajaxPost: function (url: string, payload: string, callback: (res: string) => void) {
    const xhr = EmailHelper.createCORSRequest('POST', url);
    if (!xhr) {
      callback('CORS not supported by browser');
      return;
    }
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.onload = function () {
      callback(xhr.responseText || 'No response');
    };
    xhr.onerror = function (err) {
      callback('Network request failed');
    };
    xhr.send('key=' + encodeURIComponent(payload));
  },
  createCORSRequest: function (method: string, url: string): XMLHttpRequest | null {
    let xhr = new XMLHttpRequest();
    if ('withCredentials' in xhr) {
      xhr.open(method, url, true);
    } else {
      xhr = null as any;
    }
    return xhr;
  }
};

@Component({
  selector: 'app-pdf-preview',
  standalone: true,
  imports: [CommonModule, MatDialogModule, FormsModule],
  template: `
    <div class="dialog-container">
      <!-- Main Content Area -->
      <div class="preview-area">
        <div class="dialog-header">
          <div class="header-text-group">
            <h2>Document PDF Preview</h2>
            <p class="dialog-filename">{{ data.fileName }}</p>
          </div>
          <button class="btn-close" (click)="close()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div class="dialog-body">
          <iframe [src]="safeUrl" width="100%" height="100%" title="PDF Preview"></iframe>
        </div>
        
        <div class="dialog-actions">
          <button class="btn-secondary" (click)="close()">Cancel</button>
          
          <button class="btn-sharepoint" (click)="toggleSharePointSidebar()" *ngIf="!data.isEmployee">
            <span class="material-symbols-outlined icon-left font-accent">cloud_upload</span>
            Upload to SharePoint
          </button>
          
          <button class="btn-primary btn-submit" (click)="submitAndEmail()" *ngIf="data.isEmployee" [disabled]="uploadState === 'uploading' || uploadState === 'success'">
            <span class="material-symbols-outlined icon-left">send</span>
            Submit Form
          </button>
          
          <button class="btn-primary" (click)="download()" *ngIf="!data.isEmployee">
            <span class="material-symbols-outlined icon-left">download</span>
            Download PDF
          </button>
        </div>
      </div>

      <!-- Settings / Connection Side Panel Overlay (Admin Only) -->
      <div class="sharepoint-sidebar" [class.open]="sidebarOpen" *ngIf="!data.isEmployee">
        <div class="sidebar-header">
          <h3>SharePoint Integration</h3>
          <button class="btn-close-sidebar" (click)="toggleSharePointSidebar()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="sidebar-body">
          <!-- State 1: Uploading Spinner -->
          <div class="status-state" *ngIf="uploadState === 'uploading'">
            <div class="spinner"></div>
            <h4>Uploading Document...</h4>
            <p>Sending the signed form to your SharePoint Library.</p>
          </div>

          <!-- State 2: Success -->
          <div class="status-state text-success animate-scale" *ngIf="uploadState === 'success'">
            <span class="material-symbols-outlined status-icon success-icon">check_circle</span>
            <h4>Upload Successful!</h4>
            <p>The PDF has been created in your SharePoint repository.</p>
            <button class="btn-primary btn-small-actions margin-top-12" (click)="uploadState = 'idle'">Done</button>
          </div>

          <!-- State 3: Error -->
          <div class="status-state text-error animate-scale" *ngIf="uploadState === 'error'">
            <span class="material-symbols-outlined status-icon error-icon">warning</span>
            <h4>Upload Failed</h4>
            <p class="error-msg">{{ errorMessage }}</p>
            <div class="action-buttons-row">
              <button class="btn-secondary btn-small-actions" (click)="uploadState = 'idle'">Back</button>
              <button class="btn-primary btn-small-actions" (click)="uploadToSharePoint()">Retry</button>
            </div>
          </div>

          <!-- State 4: Idle & Config Form / Status -->
          <div class="config-flow" *ngIf="uploadState === 'idle'">
            <div *ngIf="!webhookUrl" class="setup-mode">
              <div class="info-alert">
                <span class="material-symbols-outlined">info</span>
                <span>Requires a Power Automate flow to connect directly to SharePoint.</span>
              </div>

              <h4>SharePoint Trigger Setup</h4>
              <ol class="setup-steps">
                <li>Create an <strong>Automated Cloud Flow</strong> in Power Automate.</li>
                <li>Set trigger: <strong>"When an HTTP request is received"</strong>.</li>
                <li>Set the HTTP Request Body JSON Schema:
                  <pre class="code-preview"><code>&#123;
  "type": "object",
  "properties": &#123;
    "fileName": &#123; "type": "string" &#125;,
    "employeeId": &#123; "type": "string" &#125;,
    "employeeName": &#123; "type": "string" &#125;,
    "formType": &#123; "type": "string" &#125;,
    "pdfBase64": &#123; "type": "string" &#125;
  &#125;
&#125;</code></pre>
                </li>
                <li>Add action: <strong>"Create file"</strong> (SharePoint). Choose Site & Library. Set <em>File Name</em> to <code>fileName</code> and <em>File Content</em> to expression <code>base64ToBinary(pdfBase64)</code>.</li>
                <li>Add action: <strong>"Response"</strong> (Status 200).</li>
                <li>Copy the generated <strong>HTTP POST URL</strong> and paste it below.</li>
              </ol>

              <div class="form-field">
                <label for="webhookUrl">Power Automate HTTP POST URL</label>
                <input 
                  type="url" 
                  id="webhookUrl" 
                  placeholder="https://prod-xx.region.logic.azure.com:443/..." 
                  [(ngModel)]="tempWebhookUrl">
              </div>

              <button class="btn-primary btn-full-width margin-top-12" [disabled]="!tempWebhookUrl" (click)="saveSettings()">
                Save & Upload
              </button>
            </div>

            <div *ngIf="webhookUrl" class="ready-mode">
              <div class="success-alert">
                <span class="material-symbols-outlined">verified</span>
                <span>Configured & Ready</span>
              </div>

              <div class="meta-preview">
                <div class="meta-row">
                  <span class="meta-label">File Name:</span>
                  <span class="meta-value">{{ data.fileName }}</span>
                </div>
                <div class="meta-row" *ngIf="data.employeeName">
                  <span class="meta-label">Employee:</span>
                  <span class="meta-value">{{ data.employeeName }} (ID: {{ data.employeeId }})</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Webhook URL:</span>
                  <span class="meta-value masked">{{ getMaskedUrl() }}</span>
                </div>
              </div>

              <button class="btn-primary btn-full-width" (click)="uploadToSharePoint()">
                <span class="material-symbols-outlined icon-left">cloud_done</span>
                Upload File to SharePoint
              </button>

              <button class="btn-text-danger btn-full-width margin-top-8" (click)="clearSettings()">
                Clear Config & Reset Connection
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Full-Screen Status Overlay Card (Employee submission only) -->
      <div class="status-overlay" *ngIf="data.isEmployee && uploadState !== 'idle'">
        <div class="status-card animate-scale">
          <!-- Spinner -->
          <div class="spinner-large" *ngIf="uploadState === 'uploading'"></div>
          <h4 *ngIf="uploadState === 'uploading'">{{ hasWebhook() ? 'Submitting Form...' : 'Preparing Outlook...' }}</h4>
          <p *ngIf="uploadState === 'uploading'">{{ hasWebhook() ? 'Uploading signed PDF and triggering automated emails.' : 'Downloading PDF and launching your mail application.' }}</p>

          <!-- Success / Completed (Power Automate Webhook Path) -->
          <div *ngIf="uploadState === 'success' && usedWebhook" class="animate-scale" style="width: 100%; display: flex; flex-direction: column; align-items: center;">
            <span class="material-symbols-outlined status-icon success-icon">check_circle</span>
            <h4>Form Submitted Successfully!</h4>
            <p class="margin-top-8 text-secondary" style="font-size: 0.9rem; line-height: 1.5; color: var(--text-secondary);">
              The signed form has been uploaded to SharePoint and the automated emails have been sent successfully.
            </p>
            <button class="btn-primary margin-top-12" (click)="close()" style="width: 100%;">Done</button>
          </div>
          
          <!-- Success / Completed (Mailto Outlook Draft Path) -->
          <div *ngIf="uploadState === 'success' && !usedWebhook" class="animate-scale" style="width: 100%; display: flex; flex-direction: column; align-items: center;">
            <span class="material-symbols-outlined status-icon success-icon">drafts</span>
            <h4>Outlook Draft Ready!</h4>
            
            <div class="instructions-list">
              <div class="instruction-step">
                <span class="step-num">1</span>
                <p>The signed form PDF was successfully downloaded: <br><strong>{{ data.fileName }}</strong></p>
              </div>
              <div class="instruction-step">
                <span class="step-num">2</span>
                <p>Outlook has been launched with the email addressed to: <br><strong>itadmin@cdsgroups.com</strong></p>
              </div>
              <div class="instruction-step warning-step">
                <span class="step-num">!</span>
                <p><strong>Action Required</strong>: Please attach the downloaded PDF file from your Downloads folder to the draft before sending.</p>
              </div>
            </div>
            
            <div class="action-buttons-row">
              <button class="btn-secondary btn-small-actions" (click)="reopenMail()">Reopen Mail</button>
              <button class="btn-primary btn-small-actions" (click)="close()">Done</button>
            </div>
          </div>

          <!-- Error -->
          <span class="material-symbols-outlined status-icon error-icon animate-scale" *ngIf="uploadState === 'error'">warning</span>
          <h4 *ngIf="uploadState === 'error'">Action Failed</h4>
          <p class="error-msg" *ngIf="uploadState === 'error'">{{ errorMessage }}</p>
          <div class="action-buttons-row" *ngIf="uploadState === 'error'">
            <button class="btn-secondary btn-small-actions" (click)="uploadState = 'idle'">Cancel</button>
            <button class="btn-primary btn-small-actions" (click)="submitAndEmail()">Retry</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      display: flex;
      flex-direction: row;
      height: 85vh;
      width: 75vw;
      min-width: 320px;
      max-width: 1200px;
      background: var(--bg-secondary);
      border-radius: var(--border-radius);
      overflow: hidden;
      border: 1px solid var(--glass-border);
      box-shadow: var(--glass-shadow);
      position: relative;
    }
    
    @media (max-width: 992px) {
      .dialog-container {
        width: 95vw;
        height: 90vh;
      }
    }
    
    .preview-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.01);
      
       h2 {
        margin: 0;
        font-size: 1.3rem;
        color: var(--text-primary);
        font-family: 'Outfit', sans-serif;
        font-weight: 600;
      }
      
      .dialog-filename {
        margin: 4px 0 0 0;
        font-size: 0.85rem;
        color: var(--text-muted);
        font-family: monospace;
      }
      
      .btn-close {
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
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }
      }
    }
    
    .dialog-body {
      flex: 1;
      background: #0f172a;
      padding: 0;
      overflow: hidden;
      
      iframe {
        border: none;
        background: #0f172a;
      }
    }
    
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.01);
      flex-wrap: wrap;
    }
    
    /* Side Panel */
    .sharepoint-sidebar {
      width: 0;
      background: #111827;
      border-left: 0 solid rgba(255, 255, 255, 0.08);
      height: 100%;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      
      &.open {
        width: 360px;
        border-left: 1px solid rgba(255, 255, 255, 0.08);
      }
    }

    @media (max-width: 768px) {
      .sharepoint-sidebar.open {
        position: absolute;
        right: 0;
        top: 0;
        width: 100%;
        z-index: 100;
      }
    }

    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);

      h3 {
        margin: 0;
        font-size: 1.1rem;
        color: var(--text-primary);
      }

      .btn-close-sidebar {
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        display: flex;
        align-items: center;
        padding: 4px;
        border-radius: 50%;
        transition: var(--transition);

        &:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }
      }
    }

    .sidebar-body {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
    }

    .btn-sharepoint {
      background: rgba(255, 255, 255, 0.04) !important;
      color: var(--text-primary) !important;
      font-family: 'Outfit', sans-serif !important;
      font-weight: 500 !important;
      border-radius: 30px !important;
      padding: 8px 20px !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      transition: var(--transition) !important;
      cursor: pointer;
      display: inline-flex;
      align-items: center;

      &:hover {
        background: rgba(255, 255, 255, 0.08) !important;
        border-color: rgba(99, 102, 241, 0.3) !important;
        transform: translateY(-2px);
      }

      .font-accent {
        color: var(--primary-color);
      }
    }

    .btn-submit {
      box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.4) !important;
    }

    .icon-left {
      margin-right: 6px;
      font-size: 1.15rem;
      vertical-align: middle;
    }

    /* Status states */
    .status-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 40px 10px;
      height: 100%;
      box-sizing: border-box;

      h4 {
        margin: 16px 0 8px 0;
        font-size: 1.15rem;
      }

      p {
        color: var(--text-secondary);
        font-size: 0.85rem;
        line-height: 1.4;
        margin: 0;
      }

      .status-icon {
        font-size: 3.5rem;
      }

      .success-icon {
        color: #10b981;
      }

      .error-icon {
        color: #f43f5e;
      }

      .error-msg {
        background: rgba(244, 63, 94, 0.1);
        border: 1px solid rgba(244, 63, 94, 0.2);
        color: #f87171;
        padding: 8px 12px;
        border-radius: 6px;
        font-family: monospace;
        font-size: 0.75rem;
        width: 100%;
        text-align: left;
        margin-top: 12px;
        word-break: break-all;
      }
    }

    /* Status Overlay for Employees */
    .status-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.95);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .status-card {
      background: var(--bg-secondary);
      border: 1px solid var(--glass-border);
      box-shadow: var(--glass-shadow);
      border-radius: var(--border-radius);
      padding: 32px;
      max-width: 420px;
      width: 90%;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;

      h4 {
        margin: 16px 0 8px 0;
        font-size: 1.2rem;
        color: var(--text-primary);
        font-family: 'Outfit', sans-serif;
        font-weight: 600;
      }

      p {
        color: var(--text-secondary);
        font-size: 0.9rem;
        line-height: 1.5;
        margin: 0;
      }

      .status-icon {
        font-size: 4rem;
      }

      .success-icon {
        color: #10b981;
      }

      .error-icon {
        color: #f43f5e;
      }

      .error-msg {
        background: rgba(244, 63, 94, 0.1);
        border: 1px solid rgba(244, 63, 94, 0.2);
        color: #f87171;
        padding: 8px 12px;
        border-radius: 6px;
        font-family: monospace;
        font-size: 0.8rem;
        width: 100%;
        text-align: left;
        margin-top: 12px;
        word-break: break-all;
      }
    }

    .instructions-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      text-align: left;
      margin: 16px 0;
      width: 100%;
    }

    .instruction-step {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 10px 12px;
      
      .step-num {
        background: var(--primary-color);
        color: white;
        font-weight: bold;
        font-size: 0.8rem;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 2px;
      }
      
      p {
        margin: 0;
        font-size: 0.85rem;
        line-height: 1.4;
        color: #cbd5e1;
        word-break: break-word;
      }
    }

    .warning-step {
      background: rgba(245, 158, 11, 0.08);
      border-color: rgba(245, 158, 11, 0.2);
      
      .step-num {
        background: #f59e0b;
      }
      
      p {
        color: #fef08a;
      }
    }

    .spinner-large {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(99, 102, 241, 0.1);
      border-radius: 50%;
      border-top-color: var(--primary-color);
      animation: spin 1s linear infinite;
    }

    .config-flow {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .info-alert, .success-alert {
      display: flex;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 6px;
      font-size: 0.8rem;
      line-height: 1.35;
      align-items: flex-start;
      margin-bottom: 8px;
      
      span {
        vertical-align: middle;
      }
    }

    .info-alert {
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
    }

    .success-alert {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: #34d399;
    }

    .setup-steps {
      padding-left: 18px;
      font-size: 0.8rem;
      color: var(--text-secondary);
      line-height: 1.45;
      margin: 0 0 16px 0;

      li {
        margin-bottom: 8px;
      }
    }

    .code-preview {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 0.7rem;
      overflow-x: auto;
      color: #cbd5e1;
      max-height: 120px;
      margin: 4px 0;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      
      label {
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--text-secondary);
      }

      input {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: var(--text-primary);
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 0.85rem;
        outline: none;
        transition: var(--transition);

        &:focus {
          border-color: var(--primary-color);
          background: rgba(255, 255, 255, 0.05);
        }
      }
    }

    .ready-mode {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .meta-preview {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      
      .meta-label {
        color: var(--text-secondary);
      }

      .meta-value {
        color: var(--text-primary);
        font-weight: 500;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

        &.masked {
          font-family: monospace;
          color: var(--primary-color);
        }
      }
    }

    .action-buttons-row {
      display: flex;
      gap: 8px;
      width: 100%;
      margin-top: 12px;
    }

    .btn-small-actions {
      flex: 1;
      padding: 8px 14px !important;
      font-size: 0.8rem !important;
    }

    .btn-text-danger {
      background: none;
      border: none;
      color: #f43f5e;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 500;
      padding: 6px;
      text-align: center;
      transition: var(--transition);

      &:hover {
        text-decoration: underline;
      }
    }

    /* Spinner animation */
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(99, 102, 241, 0.1);
      border-radius: 50%;
      border-top-color: var(--primary-color);
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .animate-scale {
      animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes scaleUp {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .margin-top-12 { margin-top: 12px; }
    .margin-top-8 { margin-top: 8px; }
  `]
})
export class PdfPreviewComponent implements OnInit {
  safeUrl!: SafeResourceUrl;
  sidebarOpen = false;
  uploadState: 'idle' | 'uploading' | 'success' | 'error' = 'idle';
  errorMessage = '';
  
  // SharePoint Webhook Config (Admin Only)
  webhookUrl = '';
  tempWebhookUrl = '';
  usedWebhook = false;

  constructor(
    private sanitizer: DomSanitizer,
    private dialogRef: MatDialogRef<PdfPreviewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PdfPreviewData
  ) {}

  ngOnInit() {
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.data.blobUrl);
    
    // Load configurations from local storage (SharePoint setup for admin)
    const savedUrl = localStorage.getItem('cds_sharepoint_webhook_url');
    if (savedUrl) {
      this.webhookUrl = savedUrl;
      this.tempWebhookUrl = savedUrl;
    }
  }

  close() {
    if (this.uploadState === 'success' && this.usedWebhook) {
      this.dialogRef.close('submitted');
    } else {
      this.dialogRef.close();
    }
  }

  download() {
    this.data.doc.save(this.data.fileName);
    this.dialogRef.close(true);
  }

  toggleSharePointSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  saveSettings() {
    if (this.tempWebhookUrl) {
      this.webhookUrl = this.tempWebhookUrl;
      localStorage.setItem('cds_sharepoint_webhook_url', this.webhookUrl);
      this.uploadToSharePoint();
    }
  }

  clearSettings() {
    this.webhookUrl = '';
    this.tempWebhookUrl = '';
    localStorage.removeItem('cds_sharepoint_webhook_url');
  }

  getMaskedUrl(): string {
    if (!this.webhookUrl) return '';
    try {
      const url = new URL(this.webhookUrl);
      return `${url.origin}${url.pathname.substring(0, 15)}...`;
    } catch {
      return 'https://logic.azure.com/...';
    }
  }

  getMailtoUrl(): string {
    const recipient = 'itadmin@cdsgroups.com';
    const formName = this.data.formType === 'allocation' ? 'Asset Allocation' : 'Asset Return';
    const subject = encodeURIComponent(`Signed Form: ${formName} - ${this.data.employeeName || 'Employee'}`);
    
    const body = encodeURIComponent(
      `Dear IT Admin,\n\n` +
      `Please find attached my signed ${formName} form.\n\n` +
      `Instructions:\n` +
      `* Please attach the downloaded PDF file ("${this.data.fileName}") to this email before sending.\n\n` +
      `Best regards,\n` +
      `${this.data.employeeName || 'Employee'}`
    );
    
    return `mailto:${recipient}?subject=${subject}&body=${body}`;
  }

  submitAndEmail() {
    this.uploadState = 'uploading';
    this.errorMessage = '';

    // Check if we have a Power Automate Webhook URL passed from the IT Admin (through the serialized state parameter)
    let webhookUrl = this.data.webhookUrl || localStorage.getItem('cds_sharepoint_webhook_url');
    
    const oldUrlBase = 'https://default341b9d227ada4241a9655bfe4236cc.a5.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/ba5f3f5c52b8404185dc22d1148a683b/triggers/manual/paths/invoke?api-version=1';
    const newUrl = 'https://default341b9d227ada4241a9655bfe4236cc.a5.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/ba5f3f5c52b8404185dc22d1148a683b/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=fcctrUc8kW5okax-H-UBPh4uU8K63r2jW3_wqxStdJQ';

    if (webhookUrl) {
      const trimmedUrl = webhookUrl.trim();
      if (trimmedUrl === oldUrlBase || (trimmedUrl.startsWith('https://default341b9d227ada4241a9655bfe4236cc') && !trimmedUrl.includes('sig='))) {
        webhookUrl = newUrl;
      }
    }
    
    if (webhookUrl) {
      this.usedWebhook = true;
      let base64Pdf = '';
      try {
        const dataUri = this.data.doc.output('datauristring');
        base64Pdf = dataUri.split(',')[1];
      } catch (e: any) {
        this.uploadState = 'error';
        this.errorMessage = 'Failed to extract PDF base64 contents: ' + (e.message || e);
        return;
      }

      const payload = {
        fileName: this.data.fileName,
        employeeId: this.data.employeeId || 'UNKNOWN',
        employeeName: this.data.employeeName || 'Unknown Employee',
        employeeEmail: this.data.employeeEmail || '',
        formType: this.data.formType || 'allocation',
        pdfBase64: base64Pdf
      };

      fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      .then(async response => {
        if (response.ok) {
          this.uploadState = 'success';
          try {
            const urlParams = new URLSearchParams(window.location.search);
            const state = urlParams.get('state');
            if (state) {
              localStorage.setItem('signed_state_' + state, 'true');
            }
          } catch (err) {
            console.error('Error marking signing link as expired:', err);
          }
        } else {
          const errorText = await response.text().catch(() => 'No response body');
          this.uploadState = 'error';
          this.errorMessage = `Power Automate Webhook returned status ${response.status}: ${errorText || 'Unknown Error'}`;
        }
      })
      .catch(error => {
        console.error('Webhook Submit Error:', error);
        this.uploadState = 'error';
        this.errorMessage = error.message || 'Failed to trigger submission workflow. Check your connection.';
      });
      return;
    }

    // Fallback: local download + Outlook mailto (only if no webhook URL exists at all)
    this.executeMailtoFallback();
  }

  executeMailtoFallback() {
    this.usedWebhook = false;
    try {
      // 1. Download the PDF locally
      this.data.doc.save(this.data.fileName);
      
      // 2. Open default mail client (Outlook) via mailto
      window.location.href = this.getMailtoUrl();
      
      // 3. Mark state as successful / finished with manual attachment instructions
      this.uploadState = 'success';
    } catch (e: any) {
      this.uploadState = 'error';
      this.errorMessage = 'Failed to generate and download PDF: ' + (e.message || e);
    }
  }

  reopenMail() {
    window.location.href = this.getMailtoUrl();
  }

  hasWebhook(): boolean {
    return !!(this.data.webhookUrl || this.webhookUrl);
  }

  uploadToSharePoint() {
    if (!this.webhookUrl) {
      this.uploadState = 'idle';
      return;
    }

    this.uploadState = 'uploading';
    this.errorMessage = '';

    let base64Pdf = '';
    try {
      const dataUri = this.data.doc.output('datauristring');
      base64Pdf = dataUri.split(',')[1];
    } catch (e: any) {
      this.uploadState = 'error';
      this.errorMessage = 'Failed to extract PDF base64 contents: ' + (e.message || e);
      return;
    }

    const payload = {
      fileName: this.data.fileName,
      employeeId: this.data.employeeId || 'UNKNOWN',
      employeeName: this.data.employeeName || 'Unknown Employee',
      formType: this.data.formType || 'allocation',
      pdfBase64: base64Pdf
    };

    fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    .then(async response => {
      if (response.ok) {
        this.uploadState = 'success';
      } else {
        const errorText = await response.text().catch(() => 'No response body');
        this.uploadState = 'error';
        this.errorMessage = `Server responded with status code ${response.status}: ${errorText || 'Unknown Error'}`;
      }
    })
    .catch(error => {
      console.error('SharePoint Upload Error:', error);
      this.uploadState = 'error';
      this.errorMessage = error.message || 'Failed to connect. Verify your network or Webhook URL.';
    });
  }
}
