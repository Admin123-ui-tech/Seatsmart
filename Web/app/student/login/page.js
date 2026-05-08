"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AlertCircle, GraduationCap, LogIn } from "lucide-react";
import { supabase } from "@/lib/supabase";
import PasswordField from "@/components/PasswordField";
import BackButton from "@/components/BackButton";

function StudentLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const center = searchParams.get("center") || "";
  const centerId = searchParams.get("centerId") || "";
  const forwardQuery = center
    ? `?center=${encodeURIComponent(center)}`
    : centerId
      ? `?centerId=${encodeURIComponent(centerId)}`
      : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);

    if (signInError) {
      setError(signInError.message || "Unable to sign in.");
      return;
    }

    router.replace(`/student${forwardQuery}`);
  }

  return (
    <div className="min-h-screen bg-[#f8f5ee] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-[#0f2746] p-6 text-white text-center">
          <div className="inline-flex p-3 rounded-xl bg-white/15 mb-3">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Student Sign In</h1>
          <p className="text-slate-200 text-sm mt-1">
            Login to view your exam seat details
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
            />
          </div>

          <PasswordField
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="Enter your password"
          />

          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg py-3 transition-colors disabled:opacity-60"
          >
            <span className="inline-flex items-center justify-center space-x-2">
              <LogIn className="h-4 w-4" />
              <span>{loading ? "Signing in..." : "Sign In"}</span>
            </span>
          </button>

          <div className="flex justify-center">
            <BackButton
              fallbackHref="/"
              label="Back"
              className="inline-flex items-center space-x-1 text-sm text-slate-600 hover:text-slate-800"
            />
          </div>

          <div className="text-sm text-slate-600 space-y-2 pt-1">
            <p>
              New student?{" "}
              <Link
                href={`/student/signup${forwardQuery}`}
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                Create account
              </Link>
            </p>
            <p>
              Forgot password?{" "}
              <Link
                href={`/student/forgot-password${forwardQuery}`}
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                Reset here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StudentLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f5ee]" />}>
      <StudentLoginContent />
    </Suspense>
  );
}
