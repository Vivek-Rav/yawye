"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const errorMessages: Record<string, string> = {
  "auth/email-already-in-use": "That email is already taken. Try signing in.",
  "auth/wrong-password": "Wrong password. Give it another shot.",
  "auth/user-not-found": "No account with that email. Sign up first?",
  "auth/invalid-login-credentials": "Wrong email or password. Double-check and try again.",
  "auth/invalid-email": "That doesn't look like a valid email.",
  "auth/weak-password": "Password needs to be at least 6 characters.",
  "auth/popup-closed-by-user": "You closed the sign-in window.",
};

export default function LoginPage() {
  const { loginWithGoogle, loginWithEmail, signUpWithEmail } =
    useAuth();
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
      router.replace("/scan");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(errorMessages[code] ?? "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      router.replace("/scan");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(errorMessages[code] ?? "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo + title */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🍽️</div>
          <h1 className="text-white text-3xl font-extrabold">
            YAWYE
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            You Are What You Eat.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 space-y-5">
          {/* Sign In / Sign Up toggle */}
          <div className="flex bg-white/5 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                !isSignUp
                  ? "bg-indigo-600 text-white shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                isSignUp
                  ? "bg-indigo-600 text-white shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Email + Password form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-800/70 border border-white/15 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-800/70 border border-white/15 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition-opacity"
            >
              {loading ? "..." : isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/15" />
            <span className="text-gray-500 text-xs">or continue with</span>
            <div className="flex-1 h-px bg-white/15" />
          </div>

          {/* Google sign-in */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white/8 border border-white/15 text-white py-3 rounded-xl hover:bg-white/12 transition-colors disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm text-center pt-1">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
