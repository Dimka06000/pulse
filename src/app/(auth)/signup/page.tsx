import { SignupForm } from '@/components/auth/signup-form';

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-semibold text-text">
          <span className="bg-gradient-to-r from-brand-500 to-cyan-500 bg-clip-text text-transparent">Pulse</span>
        </h1>
        <p className="mt-2 text-sm text-muted">Creer votre compte</p>
      </div>
      <SignupForm />
    </main>
  );
}
