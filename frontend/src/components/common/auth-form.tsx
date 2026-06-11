"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, MessageCircle, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const setTokens = useAuthStore((state) => state.setTokens);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "register") {
        await api.register(username, password, displayName || username);
      }
      const tokens = await api.login(username, password);
      setTokens(tokens.access_token, tokens.refresh_token);
      router.push("/chats");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "login" ? "Welcome back" : "Create your account";
  const Icon = mode === "login" ? MessageCircle : UserPlus;

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-black/10 bg-white shadow-soft md:grid-cols-[1.1fr_0.9fr]">
        <div className="relative min-h-[420px] bg-[url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1400&auto=format&fit=crop')] bg-cover bg-center">
          <div className="absolute inset-0 bg-ink/55" />
          <div className="relative flex h-full flex-col justify-between p-8 text-white">
            <div className="flex items-center gap-3 text-lg font-semibold">
              <span className="grid size-10 place-items-center rounded-full bg-white/15">
                <MessageCircle size={22} />
              </span>
              Nexus Messenger
            </div>
            <div>
              <h1 className="max-w-md text-4xl font-bold tracking-normal md:text-5xl">Friends-first messaging that stays private.</h1>
              <p className="mt-4 max-w-md text-base leading-7 text-white/82">
                Secure sign-in, discoverable profiles, encrypted message storage, and real-time rooms are ready for the MVP.
              </p>
            </div>
          </div>
        </div>
        <form className="flex flex-col justify-center gap-5 p-6 md:p-10" onSubmit={submit}>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-lagoon text-white">
              <Icon size={21} />
            </span>
            <div>
              <h2 className="text-2xl font-semibold">{title}</h2>
              <p className="text-sm text-black/58">Use a username with letters, numbers, hyphens, or underscores.</p>
            </div>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            Username
            <input
              className="h-11 rounded-md border border-black/15 px-3 outline-none ring-lagoon/30 focus:ring-4"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              minLength={3}
              maxLength={30}
              pattern="^[a-zA-Z0-9_-]{3,30}$"
            />
          </label>

          {mode === "register" && (
            <label className="grid gap-2 text-sm font-medium">
              Display name
              <input
                className="h-11 rounded-md border border-black/15 px-3 outline-none ring-lagoon/30 focus:ring-4"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={100}
              />
            </label>
          )}

          <label className="grid gap-2 text-sm font-medium">
            Password
            <div className="flex h-11 items-center gap-2 rounded-md border border-black/15 px-3 ring-lagoon/30 focus-within:ring-4">
              <Lock size={18} className="text-black/45" />
              <input
                className="min-w-0 flex-1 outline-none"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
            </div>
          </label>

          {error && <p className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}

          <button
            className="h-11 rounded-md bg-ink px-4 font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Please wait" : mode === "login" ? "Log in" : "Register"}
          </button>

          <a className="text-sm font-medium text-lagoon" href={mode === "login" ? "/register" : "/login"}>
            {mode === "login" ? "Need an account? Register" : "Already have an account? Log in"}
          </a>
        </form>
      </section>
    </main>
  );
}
