import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SignaturePadComponent } from '../shared/signature-pad/signature-pad.component';
import { PdfGeneratorService } from '../shared/services/pdf-generator.service';
import { PdfPreviewComponent, PdfPreviewData } from '../shared/pdf-preview/pdf-preview.component';
import { SigningLinkDialogComponent } from '../shared/signing-link-dialog/signing-link-dialog.component';

@Component({
  selector: 'app-asset-return',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatDialogModule,
    SignaturePadComponent
  ],
  templateUrl: './asset-return.component.html',
  styleUrls: ['./asset-return.component.scss']
})
export class AssetReturnComponent implements OnInit {
  @ViewChild('adminSig') adminSigComponent!: SignaturePadComponent;

  returnForm!: FormGroup;
  submitted = false;
  isEmployeeSigning = false;
  webhookUrl = '';
  linkExpired = false;

  // Options lists for forms
  departments = ['Product Engineering', 'Quality Assurance', 'Pre-sales', 'Product Management', 'DevOps & Infrastructure', 'Information Technology', 'Human Resources', 'Sales & Marketing', 'Other'];
  locations = ['Hyderabad'];
  assetTypes = ['Laptop', 'Desktop PC', 'Monitor', 'Mobile Phone', 'Tablet', 'Keyboard', 'Mouse', 'Docking Station', 'Headset', 'Hardware Security Key', 'Other'];
  returnedConditions = ['Perfect / Like New', 'Good Working Order', 'Minor Wear & Tear', 'Damaged', 'Not Functional', 'Lost / Stolen'];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private pdfService: PdfGeneratorService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.initForm();
    this.addAsset(); // Initialize with one asset row

    // Micro-interaction: Auto-sync Employee Name to Signature field
    this.returnForm.get('employeeInfo.employeeName')?.valueChanges.subscribe(name => {
      this.returnForm.get('signatures.employeeNameText')?.setValue(name, { emitEvent: false });
    });

    // Check for incoming remote signing state
    this.route.queryParams.subscribe(params => {
      const stateBase64 = params['state'];
      if (stateBase64) {
        if (localStorage.getItem('signed_state_' + stateBase64) === 'true') {
          this.linkExpired = true;
        }
        try {
          const decoded = JSON.parse(decodeURIComponent(escape(atob(stateBase64))));
          this.webhookUrl = decoded.webhookUrl || '';
          this.loadSigningState(decoded);
        } catch (e) {
          console.error('Error decoding signing state:', e);
        }
      }
    });
  }

  private initForm() {
    const today = new Date().toISOString().split('T')[0];

    this.returnForm = this.fb.group({
      employeeInfo: this.fb.group({
        date: [today, Validators.required],
        employeeName: ['', [Validators.required, Validators.minLength(2)]],
        employeeId: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]+$/)]],
        department: ['', Validators.required],
        designation: ['', Validators.required],
        location: ['', Validators.required],
        lastWorkingDay: [today, Validators.required],
        emailId: ['', [Validators.required, Validators.email]],
        contactNumber: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-()]{7,15}$/)]]
      }),
      assets: this.fb.array([]),
      signatures: this.fb.group({
        employeeSignature: [''],
        itAdminSignature: ['', Validators.required],
        employeeNameText: [''],
        itAdminNameText: ['Ram Gopal', Validators.required]
      })
    });
  }

  loadSigningState(state: any) {
    this.isEmployeeSigning = true;
    
    // 1. Populate employeeInfo
    this.returnForm.get('employeeInfo')?.patchValue(state.employeeInfo);
    this.returnForm.get('employeeInfo')?.disable(); // Disable Employee Info
    
    // 2. Clear assets and populate
    const assetsArray = this.returnForm.get('assets') as FormArray;
    assetsArray.clear();
    
    if (state.assets && Array.isArray(state.assets)) {
      state.assets.forEach((asset: any) => {
        const row = this.fb.group({
          assetType: [asset.assetType || '', Validators.required],
          assetTag: [asset.assetTag || '', [Validators.required, Validators.pattern(/^[A-Z0-9-]+$/i)]],
          serialNumber: [asset.serialNumber || '', Validators.required],
          brandModel: [asset.brandModel || '', Validators.required],
          returnedCondition: [asset.returnedCondition || 'Good Working Order', Validators.required],
          remarks: [asset.remarks || '']
        });
        row.disable(); // Disable assets row inputs
        assetsArray.push(row);
      });
    }
    
    // 3. Populate IT Admin signature details
    if (state.adminSignature) {
      this.returnForm.get('signatures.itAdminSignature')?.setValue(state.adminSignature);
      this.returnForm.get('signatures.itAdminSignature')?.disable();
    }
    if (state.adminName) {
      this.returnForm.get('signatures.itAdminNameText')?.setValue(state.adminName);
      this.returnForm.get('signatures.itAdminNameText')?.disable();
    }

    // 4. Require Employee Signature when opening via remote link
    const empSigControl = this.returnForm.get('signatures.employeeSignature');
    const empNameControl = this.returnForm.get('signatures.employeeNameText');
    empSigControl?.setValidators(Validators.required);
    empNameControl?.setValidators(Validators.required);
    empSigControl?.updateValueAndValidity();
    empNameControl?.updateValueAndValidity();
  }

  generateSigningLink() {
    this.submitted = true;
    
    // Temporarily clear employee signature validation to validate other fields
    const empSigControl = this.returnForm.get('signatures.employeeSignature');
    const empNameControl = this.returnForm.get('signatures.employeeNameText');
    
    const empSigValidators = empSigControl?.validator;
    const empNameValidators = empNameControl?.validator;
    
    empSigControl?.clearValidators();
    empSigControl?.updateValueAndValidity();
    empNameControl?.clearValidators();
    empNameControl?.updateValueAndValidity();
    
    // Check validation of other controls
    const employeeInfoValid = this.returnForm.get('employeeInfo')?.valid;
    const assetsValid = this.returnForm.get('assets')?.valid;
    const adminSigValid = this.returnForm.get('signatures.itAdminSignature')?.valid;
    const adminNameValid = this.returnForm.get('signatures.itAdminNameText')?.valid;
    
    if (!employeeInfoValid || !assetsValid || !adminSigValid || !adminNameValid) {
      this.scrollToFirstInvalid();
      
      // Restore validators
      empSigControl?.setValidators(empSigValidators || null);
      empSigControl?.updateValueAndValidity();
      empNameControl?.setValidators(empNameValidators || null);
      empNameControl?.updateValueAndValidity();
      
      return;
    }
    
    // Restore validators
    empSigControl?.setValidators(empSigValidators || null);
    empSigControl?.updateValueAndValidity();
    empNameControl?.setValidators(empNameValidators || null);
    empNameControl?.updateValueAndValidity();
    
    // Serialize form state (excluding employee signatures)
    const formValue = this.returnForm.getRawValue();
    const stateObj = {
      employeeInfo: formValue.employeeInfo,
      assets: formValue.assets,
      adminSignature: this.adminSigComponent ? this.adminSigComponent.getPointsCoordinates() : '',
      adminName: formValue.signatures.itAdminNameText,
      webhookUrl: localStorage.getItem('cds_sharepoint_webhook_url') || ''
    };
    
    const serialized = btoa(unescape(encodeURIComponent(JSON.stringify(stateObj))));
    const currentUrl = window.location.origin + window.location.pathname;
    const signingLink = `${currentUrl}?state=${serialized}`;
    
    this.dialog.open(SigningLinkDialogComponent, {
      data: {
        link: signingLink,
        employeeName: formValue.employeeInfo.employeeName
      },
      width: '90vw',
      maxWidth: '550px',
      panelClass: 'custom-dialog-panel'
    });
  }

  // Getters for easy template access
  get employeeInfo() {
    return this.returnForm.get('employeeInfo') as FormGroup;
  }

  get assets() {
    return this.returnForm.get('assets') as FormArray;
  }

  get signatures() {
    return this.returnForm.get('signatures') as FormGroup;
  }

  // Asset array manipulation
  createAssetRow(): FormGroup {
    return this.fb.group({
      assetType: ['', Validators.required],
      assetTag: ['', [Validators.required, Validators.pattern(/^[A-Z0-9-]+$/i)]],
      serialNumber: ['', Validators.required],
      brandModel: ['', Validators.required],
      returnedCondition: ['Good Working Order', Validators.required],
      remarks: ['']
    });
  }

  addAsset() {
    this.assets.push(this.createAssetRow());
  }

  removeAsset(index: number) {
    if (this.assets.length > 1) {
      this.assets.removeAt(index);
    } else {
      // Don't allow removal of the last row, just reset it
      this.assets.at(0).reset({ returnedCondition: 'Good Working Order', remarks: '' });
    }
  }

  // Form Submission
  onSubmit() {
    this.submitted = true;
    
    if (this.returnForm.invalid) {
      this.scrollToFirstInvalid();
      return;
    }

    const formData = this.returnForm.getRawValue();
    
    // Generate PDF and preview
    const { doc, blobUrl, fileName } = this.pdfService.generatePdf('return', formData);
    
    const previewData: PdfPreviewData = {
      blobUrl,
      doc,
      fileName,
      employeeName: formData.employeeInfo.employeeName,
      employeeId: formData.employeeInfo.employeeId,
      employeeEmail: formData.employeeInfo.emailId,
      formType: 'return',
      isEmployee: this.isEmployeeSigning,
      webhookUrl: this.webhookUrl
    };

    const dialogRef = this.dialog.open(PdfPreviewComponent, {
      data: previewData,
      width: '75vw',
      maxWidth: '1200px',
      panelClass: 'custom-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'submitted') {
        this.linkExpired = true;
      }
    });
  }

  // Navigation back
  goBack() {
    this.router.navigate(['/home']);
  }

  // Scroll Helper
  private scrollToFirstInvalid() {
    const firstInvalid = document.querySelector('.ng-invalid:not(form):not(.ng-has-value)');
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}
