export const VALIDATION = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  vehicleId: /^VH-\d{3}$/,
  driverId: /^DR-\d{3}$/,
  journeyId: /^JR-\d{3}$/,
  registration: /^[A-Z]{2}[- ]?\d{1,2}[- ]?[A-Z]{1,3}[- ]?\d{4}$/,
  phone: /^(?:[6-9]\d{9}|\+91\s?[6-9]\d{9})$/,
  name: /^[A-Za-z][A-Za-z .'-]{1,99}$/,
  username: /^[A-Za-z][A-Za-z0-9_.-]{2,29}$/,
};

export function validateEmail(value) {
  return VALIDATION.email.test(String(value || '').trim());
}

export function validatePassword(value) {
  return typeof value === 'string' && value.length >= 6 && value.length <= 128;
}
