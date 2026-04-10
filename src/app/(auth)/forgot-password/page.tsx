"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Veuillez entrer votre adresse email");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${window.location.origin}/auth/confirm` }
      );

      if (resetError) {
        setError(resetError.message);
      } else {
        setSent(true);
      }
    } catch {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-semibold text-text">
          <span className="bg-gradient-to-r from-brand-500 to-cyan-500 bg-clip-text text-transparent">
            Pulse
          </span>
        </h1>
        <p className="mt-2 text-sm text-muted">Réinitialiser votre mot de passe</p>
      </div>

      <div className="w-full max-w-sm space-y-6">
        {sent ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <p className="text-sm font-medium text-green-800">
                Un email de réinitialisation a été envoyé
              </p>
              <p className="mt-1 text-xs text-green-600">
                Vérifiez votre boîte de réception et vos spams
              </p>
            </div>
            <a
              href="/login"
              className="block text-center text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Retour à la connexion
            </a>
          </div>
        ) : (
          <>
            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="reset-email"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
              >
                {loading ? "Envoi..." : "Réinitialiser mon mot de passe"}
              </button>
            </form>

            <p className="text-center text-sm text-gray-600">
              <a
                href="/login"
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                Retour à la connexion
              </a>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
