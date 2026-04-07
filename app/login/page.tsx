"use client";

import { FormEvent, useState } from "react";

import { getBrowserSupabaseClient } from "@/lib/supabase";

const supabase = getBrowserSupabaseClient();

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);

      return;
    }

    window.location.assign("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-10 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center">
        <section className="w-full rounded-[2rem] border border-slate-800 bg-slate-950/85 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-lg font-semibold tracking-[0.2em] text-slate-100">
            KO
          </div>
          <div className="mt-6 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Kerzie Consulting LLC</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50">Kerzie Ops</h1>
            <p className="mt-3 text-sm text-slate-400">Sign in with your Supabase email and password to access the dashboard.</p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-slate-600 focus:ring-2 focus:ring-slate-700"
                placeholder="wade@kerzie.ai"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-slate-600 focus:ring-2 focus:ring-slate-700"
                placeholder="Enter your password"
              />
            </div>

            {errorMessage ? (
              <div className="rounded-2xl border border-rose-900/80 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
