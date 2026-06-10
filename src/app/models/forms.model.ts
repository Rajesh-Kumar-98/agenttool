export interface AssetRow {
  assetType: string;
  assetTag: string;
  serialNumber: string;
  brandModel: string;
  condition: string; // Used in Allocation
  returnedCondition?: string; // Used in Return
  remarks?: string; // Used in Return
}

export interface EmployeeInfo {
  date: string;
  employeeName: string;
  employeeId: string;
  department: string;
  designation: string;
  location: string;
  dateOfJoining?: string; // Used in Allocation
  lastWorkingDay?: string; // Used in Return
  emailId: string;
  contactNumber: string;
}

export interface FormSignatures {
  employeeSignature: string; // Base64 PNG image URL
  itAdminSignature: string; // Base64 PNG image URL
  employeeNameText: string;
  itAdminNameText: string;
}

export interface AssetAllocationForm {
  employeeInfo: EmployeeInfo;
  assets: AssetRow[];
  signatures: FormSignatures;
}

export interface AssetReturnForm {
  employeeInfo: EmployeeInfo;
  assets: AssetRow[];
  signatures: FormSignatures;
}
