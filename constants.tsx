
import React from 'react';
import { 
  LayoutDashboard,
  Users,
  Bell,
  FileText,
  Settings,
  UserCircle
} from 'lucide-react';
import { UserRole, Patient, PatientCategory } from './types';

export const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: [UserRole.ADMIN, UserRole.DOCTOR] },
  { id: 'patients', label: 'Clinic Records', icon: <Users size={20} />, roles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE] },
  { id: 'alerts', label: 'Alarm History', icon: <Bell size={20} />, roles: [UserRole.ADMIN, UserRole.DOCTOR] },
  { id: 'reports', label: 'Clinic Stats', icon: <FileText size={20} />, roles: [UserRole.ADMIN, UserRole.DOCTOR] },
  { id: 'account', label: 'Account', icon: <UserCircle size={20} />, roles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE] },
  { id: 'settings', label: 'Thresholds', icon: <Settings size={20} />, roles: [UserRole.ADMIN] },
];

export const VITAL_THRESHOLDS = {
  hr: { low: 60, high: 100 },
  spo2: { min: 95 },
  temp: { low: 36.5, high: 37.5 },
  bp: { sysLow: 90, diaLow: 60, sysHigh: 120, diaHigh: 80 }
};
