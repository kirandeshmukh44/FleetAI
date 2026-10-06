/** Client-side validators — mirrors Admin/backend validation rules. */

export const VALIDATION = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  username: /^[A-Za-z][A-Za-z0-9_.-]{2,29}$/,
  name: /^[A-Za-z][A-Za-z .'-]{1,99}$/,
  vehicleId: /^VH-\d{3}$/,
  driverId: /^DR-\d{3}$/,
  registration: /^[A-Z]{2}[- ]?\d{1,2}[- ]?[A-Z]{1,3}[- ]?\d{4}$/,
  phone: /^(?:[6-9]\d{9}|\+91\s?[6-9]\d{9})$/,
  license: /^[A-Z]{2}\d{2}\s?\d{11}$/,
};

export const isValidEmail = (value) => VALIDATION.email.test(String(value || '').trim());
export const isValidUsername = (value) => VALIDATION.username.test(String(value || '').trim());
export const isValidName = (value) => VALIDATION.name.test(String(value || '').trim());
export const isValidVehicleId = (value) => VALIDATION.vehicleId.test(String(value || '').trim().toUpperCase());
export const isValidDriverId = (value) => VALIDATION.driverId.test(String(value || '').trim().toUpperCase());
export const isValidRegistration = (value) =>
  VALIDATION.registration.test(String(value || '').trim().toUpperCase());
export const isValidPhone = (value) => VALIDATION.phone.test(String(value || '').trim());
export const isValidLicense = (value) => VALIDATION.license.test(String(value || '').trim().toUpperCase());
export const isValidPassword = (value) =>
  typeof value === 'string' && value.length >= 6 && value.length <= 128;

export const VEHICLE_TYPES = ['Truck', 'Van', 'Bus', 'Car', 'Motorcycle', 'Other'];
export const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'CNG', 'LPG', 'Hybrid'];
export const VEHICLE_STATUSES = ['ACTIVE', 'IDLE', 'STOPPED', 'OFFLINE'];
export const DRIVER_STATUSES = ['ACTIVE', 'INACTIVE', 'ON_LEAVE'];
export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];
export const USER_ROLES = ['admin', 'user', 'viewer', 'superadmin'];
