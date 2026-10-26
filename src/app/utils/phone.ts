import { AbstractControl, ValidationErrors } from '@angular/forms';

// US numbers as 10 digits: strips formatting and a leading country code 1
export function normalizePhone(value: string): string {
  const digits = String(value || '').replace(/\D/g, '')
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
}

// Form validator: empty is left to Validators.required
export function usPhone(control: AbstractControl): ValidationErrors | null {
  if(!control.value) return null
  return normalizePhone(control.value).length === 10 ? null : {phone: true}
}

// 9095551234 or +19095551234 → (909) 555-1234; anything else is returned as is
export function formatPhone(value: string): string {
  const digits = normalizePhone(value)
  return digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : value
}
