export const mobilePattern = /^\+?[1-9]\d{9,14}$/;
export const mobileErrorMessage = 'Enter a valid mobile number like 9876543210.';

export function sanitizeMobile(value = '') {
  const cleaned = String(value).replace(/[^+\d]/g, '');
  if (cleaned.startsWith('+')) return `+${cleaned.slice(1).replace(/\+/g, '').slice(0, 15)}`;
  return cleaned.replace(/\+/g, '').slice(0, 15);
}

export function sanitizeMobileEvent(event) {
  event.currentTarget.value = sanitizeMobile(event.currentTarget.value);
}
