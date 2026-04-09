export interface SignupInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignup(input: SignupInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.name || input.name.trim().length === 0) {
    errors.name = "Le nom est requis";
  }

  if (!input.email || !EMAIL_REGEX.test(input.email)) {
    errors.email = "Adresse email invalide";
  }

  if (!input.password || input.password.length < 8) {
    errors.password = "Le mot de passe doit contenir au moins 8 caractères";
  }

  if (input.password !== input.confirmPassword) {
    errors.confirmPassword = "Les mots de passe ne correspondent pas";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateLogin(input: LoginInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.email || !EMAIL_REGEX.test(input.email)) {
    errors.email = "Adresse email invalide";
  }

  if (!input.password || input.password.length === 0) {
    errors.password = "Le mot de passe est requis";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
