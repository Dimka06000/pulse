import { Resend } from 'resend';

let instance: Resend | null = null;

export function getResendClient(): Resend {
  if (!instance) {
    instance = new Resend(process.env.RESEND_API_KEY!);
  }
  return instance;
}
