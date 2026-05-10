
export enum UserRole {
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE'
}

export enum PatientCategory {
  STUDENT = 'STUDENT',
  TEACHING_STAFF = 'TEACHING_STAFF',
  NON_TEACHING_STAFF = 'NON_TEACHING_STAFF'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface VitalSign {
  id: string;
  label: string;
  value: number | string;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  trend: number[];
  icon: string;
  diagnostic?: string;
  patientId?: string;
}

export interface Patient {
  id: string; // Institutional ID (e.g. 2024-001)
  surname: string;
  firstName: string;
  middleInitial: string;
  age: number;
  gender: 'M' | 'F' | 'Other';
  category: PatientCategory;
  room: string;
  lastUpdate: string;
  vitals: {
    hr: number;
    bp: string;
    spo2: number;
    temp: number;
  };
}

export interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high';
  patientName: string;
  message: string;
  timestamp: string;
  isAcknowledged: boolean;
}
