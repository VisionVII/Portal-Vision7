// Free, local partial mitigation for leaked/weak passwords — Supabase's
// HaveIBeenPwned check (auth_leaked_password_protection) requires a Pro plan.
// This is not equivalent (no real breach-database lookup), just a minimum
// bar: reasonable length/complexity plus a small blocklist of the most
// common breached passwords.

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890',
  'qwerty123', 'qwertyuiop', 'letmein123', 'welcome123', 'admin123', 'senha123',
  'abc123456', 'iloveyou1', 'sunshine1', 'football1', 'monkey123', 'dragon123',
  '111111111', '000000000', 'trustno1', 'p@ssw0rd', 'p@ssword1', 'passw0rd',
]);

export function checkPasswordStrength(password: string): string | null {
  if (password.length < 10) {
    return 'A password deve ter pelo menos 10 caracteres.';
  }
  const classes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ].filter(Boolean).length;
  if (classes < 3) {
    return 'A password deve combinar pelo menos 3 destes: minúsculas, maiúsculas, números, símbolos.';
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return 'Esta password é demasiado comum. Escolha uma password menos previsível.';
  }
  return null;
}
