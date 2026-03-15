export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
export type UserRole = 'admin' | 'manager' | 'employee';
export interface ShiftRole {
  id: string;
  title: string;
  payRate?: number;
}
export interface User {
  id: string;
  name: string;
  email?: string;
  password?: string;
  emailVerified?: boolean;
  role?: UserRole;
  avatarUrl?: string;
  pinCode?: string;
  phoneNumber?: string;
  emergencyContact?: string;
  emergencyContact2?: string;
  faceIdPhotoUrl?: string;
  shiftRoles?: ShiftRole[];
  assignedWorkSiteIds?: string[];
  disableGeofenceReminders?: boolean;
  lastSeen?: number;
}
export interface AuthToken {
  id: string;
  userId: string;
  expiresAt: number;
  createdAt: number;
}
export interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
}
export interface WorkLocation {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
}
export interface WorkSite {
  id: string;
  siteCode: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  createdAt: number;
}
export type TimeEntryType = 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
export interface TimeEntry {
  id: string;
  userId: string;
  timestamp: number;
  type: TimeEntryType;
  location?: Location;
  photoUrl?: string;
  status: 'verified' | 'pending' | 'flagged';
  verificationMethod?: 'face' | 'pin';
  breakLocationPreference?: 'on-property' | 'off-property';
  deviceType?: 'mobile' | 'desktop' | 'kiosk';
  shiftRoleId?: string;
  shiftRoleTitle?: string;
  workSiteId?: string;
  workSiteName?: string;
}
export interface Chat {
  id: string;
  title: string;
}
export interface ChatMessage {
  id: string;
  chatId: string;
  userId: string;
  text: string;
  ts: number;
  system?: boolean;
}
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}
export interface Task {
  id: string;
  title: string;
  description?: string;
  assignees?: string[];
  assignedRoles?: string[];
  status: TaskStatus;
  priority?: TaskPriority;
  dueDate?: number;
  qrCodeId?: string;
  locationId?: string;
  photoUrl?: string;
  claimLocation?: Location;
  completionLocation?: Location;
  completedAt?: number;
  createdAt: number;
  timeSpentMs?: number;
  lastStartedAt?: number | null;
  isDailyTemplate?: boolean;
  parentTaskId?: string;
  linkedFormId?: string;
  checklist?: TaskChecklistItem[];
}
export type FormFieldType = 'text' | 'textarea' | 'select' | 'checkbox';
export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  options?: string[];
}
export interface QRForm {
  id: string;
  title: string;
  description?: string;
  category?: string;
  fields: FormField[];
  defaultAssignees?: string[];
  defaultAssignedRoles?: string[];
  locationId?: string;
  createdAt: number;
}
export interface FormSubmission {
  id: string;
  formId: string;
  data: Record<string, any>;
  submittedAt: number;
  status: 'new' | 'processed';
}
export type ShiftStatus = 'published' | 'draft';
export interface Shift {
  id: string;
  userId: string;
  startTime: number;
  endTime: number;
  roleId?: string;
  workSiteId?: string;
  notes?: string;
  status: ShiftStatus;
  acknowledgedAt?: number;
  createdAt: number;
}