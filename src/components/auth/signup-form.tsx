"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth";
import { GoogleButton } from "./google-button";
import Link from "next/link";

type RoleChoice = "athlete" | "coach" | "both";

// Eye icon for password visibility toggle
function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

function SignupFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get("email") ?? "";

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<RoleChoice>("athlete");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Validate step 1 fields only
  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!email || !EMAIL_REGEX.test(email)) {
      errs.email = "Adresse email invalide";
    }
    if (!password || password.length < 8) {
      errs.password = "Le mot de passe doit contenir au moins 8 caractères";
    }
    return errs;
  };

  // Validate step 2 fields only
  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!name || name.trim().length === 0) {
      errs.name = "Le nom est requis";
    }
    return errs;
  };

  const handleContinue = () => {
    setServerError("");
    const errs = validateStep1();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const errs = validateStep2();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      // Create user via server route (auto-confirms email)
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          role: role === "both" ? "coach" : role,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || "Erreur lors de l'inscription");
        return;
      }

      // Auto-login after signup
      const supabase = getSupabaseBrowserClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setServerError(loginError.message);
      } else {
        // Update zustand store immediately (AuthProvider will also sync)
        const { setUser } = useAuthStore.getState();
        setUser(data.userId || '', (role === 'both' ? 'coach' : role) as any);
        router.push("/dashboard");
      }
    } catch {
      setServerError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  const roleOptions: { value: RoleChoice; label: string }[] = [
    { value: "athlete", label: "Sportif" },
    { value: "coach", label: "Coach" },
    { value: "both", label: "Les deux" },
  ];

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
          step === 1 ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-700"
        }`}>
          1
        </div>
        <div className="h-px w-8 bg-gray-300" />
        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
          step === 2 ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-500"
        }`}>
          2
        </div>
        <span className="ml-2 text-xs text-muted">Étape {step}/2</span>
      </div>

      {serverError && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {serverError}
        </p>
      )}

      {step === 1 && (
        <>
          <GoogleButton />

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-300" />
            <span className="text-sm text-gray-500">ou</span>
            <div className="h-px flex-1 bg-gray-300" />
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="signup-email" className="mb-1 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                autoFocus
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="signup-password" className="mb-1 block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8 caractères minimum"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-11 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            </div>

            <button
              type="button"
              onClick={handleContinue}
              className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              Continuer
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
              Nom complet
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Prénom Nom"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              autoFocus
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Je suis</p>
            <div className="grid grid-cols-3 gap-2">
              {roleOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    role === opt.value
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "Inscription..." : "Créer mon compte"}
          </button>

          <button
            type="button"
            onClick={() => { setStep(1); setErrors({}); }}
            className="w-full text-center text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Retour
          </button>
        </form>
      )}

      <p className="text-center text-sm text-gray-600">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Se connecter
        </Link>
      </p>
    </div>
  );
}

export function SignupForm() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-sm animate-pulse space-y-4">
          <div className="h-12 rounded-lg bg-gray-200" />
          <div className="h-12 rounded-lg bg-gray-200" />
          <div className="h-12 rounded-lg bg-gray-200" />
        </div>
      }
    >
      <SignupFormInner />
    </Suspense>
  );
}
