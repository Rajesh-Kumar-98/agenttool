import { Component, ElementRef, ViewChild, Input, AfterViewInit, OnDestroy, forwardRef, HostListener, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import SignaturePad from 'signature_pad';

@Component({
  selector: 'app-signature-pad',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SignaturePadComponent),
      multi: true
    }
  ],
  template: `
    <div class="signature-control">
      <div class="signature-header">
        <span class="signature-label">{{ label }} <span class="required-star" *ngIf="required">*</span></span>
        <button type="button" class="btn-clear" (click)="clear()" [disabled]="isEmpty()">Clear</button>
      </div>
      
      <div class="signature-container">
        <canvas #canvas></canvas>
        <div class="signature-placeholder" *ngIf="isEmpty()">
          <span class="material-symbols-outlined">gesture</span>
          <span>Sign here</span>
        </div>
      </div>
      
      <div class="signature-footer" *ngIf="signerName">
        <span class="signer-name-label">Signer Name: <strong>{{ signerName }}</strong></span>
      </div>
    </div>
  `,
  styles: [`
    .signature-control {
      display: flex;
      flex-direction: column;
      width: 100%;
    }
    
    .signature-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    
    .signature-label {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--text-secondary);
      font-family: 'Outfit', sans-serif;
    }
    
    .required-star {
      color: var(--danger-color);
    }
    
    .btn-clear {
      background: none;
      border: none;
      color: var(--primary-color);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: 'Outfit', sans-serif;
      transition: var(--transition);
      
      &:hover:not(:disabled) {
        background: rgba(99, 102, 241, 0.1);
      }

      &:disabled {
        color: var(--text-muted);
        cursor: not-allowed;
      }
    }
    
    .signature-placeholder {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      color: var(--text-muted);
      pointer-events: none;
      opacity: 0.5;
      font-size: 0.85rem;
      font-family: 'Outfit', sans-serif;
      
      .material-symbols-outlined {
        font-size: 2rem;
        margin-bottom: 4px;
      }
    }
    
    .signature-footer {
      margin-top: 4px;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }
  `]
})
export class SignaturePadComponent implements AfterViewInit, OnDestroy, ControlValueAccessor {
  @Input() label: string = 'Signature';
  @Input() required: boolean = false;
  @Input() signerName: string = '';

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private signaturePad!: SignaturePad;
  private value: string = '';
  
  // Track state using signals for UI
  isEmpty = signal<boolean>(true);

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    
    // Set line thickness, color etc.
    this.signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgba(0,0,0,0)',
      penColor: '#e2e8f0', // bright color for dark background
      minWidth: 1.5,
      maxWidth: 4.5
    });

    this.resizeCanvas();
    
    if (this.value) {
      this.restoreSignature(this.value);
    }
    
    // Event listener for signature pad strokes
    this.signaturePad.addEventListener('endStroke', () => {
      this.updateValue();
    });
  }

  ngOnDestroy() {
    if (this.signaturePad) {
      this.signaturePad.off();
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.resizeCanvas();
  }

  private resizeCanvas() {
    if (!this.canvasRef || !this.signaturePad) return;
    
    const canvas = this.canvasRef.nativeElement;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    
    // Store signature data before resize so we can restore it
    const data = this.signaturePad.toData();
    
    canvas.width = canvas.parentElement?.clientWidth || 300;
    canvas.height = 150; // matches style height
    
    this.signaturePad.clear();
    this.signaturePad.fromData(data);
    
    this.isEmpty.set(this.signaturePad.isEmpty());
  }

  private getBlackSignatureDataURL(): string {
    const canvas = this.canvasRef.nativeElement;
    
    // Create a temporary canvas with the same dimensions
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      // Draw the original canvas (which has the gray signature) onto the temporary canvas
      tempCtx.drawImage(canvas, 0, 0);
      
      // Use composite operation 'source-in' to paint all drawn pixels black
      tempCtx.globalCompositeOperation = 'source-in';
      tempCtx.fillStyle = '#000000';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    }
    
    return tempCanvas.toDataURL('image/png');
  }

  private updateValue() {
    if (this.signaturePad.isEmpty()) {
      this.value = '';
    } else {
      this.value = this.getBlackSignatureDataURL();
    }
    this.isEmpty.set(this.signaturePad.isEmpty());
    this.onChange(this.value);
    this.onTouched();
  }

  private restoreSignature(val: string) {
    if (!this.signaturePad || !val) return;
    
    if (val.startsWith('data:image/')) {
      this.signaturePad.fromDataURL(val);
      this.isEmpty.set(this.signaturePad.isEmpty());
    } else {
      try {
        const points = JSON.parse(val);
        if (Array.isArray(points)) {
          const reconstructed = points.map((stroke: any) => ({
            color: '#000000',
            points: stroke.map(([x, y]: number[]) => ({ x, y, time: 0, pressure: 0.5 }))
          }));
          this.signaturePad.fromData(reconstructed as any);
          this.isEmpty.set(false);
          // Convert reconstructed points to black image URL to update the parent form value
          setTimeout(() => {
            this.updateValue();
          }, 0);
        }
      } catch (e) {
        console.error('Error parsing signature coordinates', e);
      }
    }
  }

  getPointsCoordinates(): string {
    if (!this.signaturePad || this.signaturePad.isEmpty()) {
      return '';
    }
    const data = this.signaturePad.toData();
    const minimized = data.map(stroke => stroke.points.map(p => [Math.round(p.x), Math.round(p.y)]));
    return JSON.stringify(minimized);
  }

  clear() {
    if (this.signaturePad) {
      this.signaturePad.clear();
      this.updateValue();
    }
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.value = value || '';
    if (this.signaturePad) {
      if (this.value) {
        this.restoreSignature(this.value);
      } else {
        this.signaturePad.clear();
        this.isEmpty.set(true);
      }
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    if (this.signaturePad) {
      if (isDisabled) {
        this.signaturePad.off();
      } else {
        this.signaturePad.on();
      }
    }
  }
}
