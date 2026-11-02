/**
 * Phone number formatting and normalization utilities
 */

export function formatPhoneNumber(val) {
  if (!val) return "";
  const digits = String(val).replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) {
    return digits;
  } else if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  } else {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
}

export function cleanPhoneNumber(val) {
  return String(val || "").replace(/\D/g, "");
}
