export function maskPhone(phone?: string | null): string {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length <= 4) return `${digits[0] ?? ''}${'*'.repeat(Math.max(0, digits.length - 1))}`;
  const head = digits.slice(0, 2);
  const tail = digits.slice(-3);
  return `${head}${'*'.repeat(Math.max(0, digits.length - 5))}${tail}`;
}
