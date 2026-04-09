import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-semibold text-text">
          <span className="bg-gradient-to-r from-brand-500 to-cyan-500 bg-clip-text text-transparent">Pulse</span>
        </h1>
        <p className="mt-2 text-sm text-muted">Content de vous revoir</p>
      </div>
      <LoginForm />
      <p className="mt-6 text-center text-sm text-muted">
        Pas encore inscrit ?{' '}
        <a href="/signup" className="font-semibold text-brand-500 hover:text-brand-600">
          Creer un compte
        </a>
      </p>
    </main>
  );
}
