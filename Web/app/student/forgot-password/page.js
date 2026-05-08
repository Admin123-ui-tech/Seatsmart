"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";

const RESEND_COOLDOWN_SECONDS = 60;

function getResetRedirectUrl() {
  const configuredBaseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_WEB_URL?.trim();
  if (configuredBaseUrl) {
    return `${configuredBaseUrl.replace(/\/$/, "")}/student/reset-password`;
  }
  return `${window.location.origin}/student/reset-password`;
}

function toFriendlyResetError(message) {
  const raw = String(message || "");
  const normalized = raw.toLowerCase();

  if (normalized.includes("rate limit")) {
    return "Too many reset attempts. Please wait a few minutes and try again.";
  }
  if (normalized.includes("redirect")) {
    return "Reset link redirect is not configured in Supabase. Add your web URL in Supabase Auth URL settings.";
  }
  return raw || "Unable to send reset email.";
}

function StudentForgotPasswordContent() {
  const searchParams = useSearchParams();
  const center = searchParams.get("center") || "";
  const centerId = searchParams.get("centerId") || "";
  const forwardQuery = center
    ? `?center=${encodeURIComponent(center)}`
    : centerId
      ? `?centerId=${encodeURIComponent(centerId)}`
      : "";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownLeft(0);
      return;
    }

    const update = () => {
      const remaining = Math.max(
        0,
        Math.ceil((cooldownUntil - Date.now()) / 1000),
      );
      setCooldownLeft(remaining);
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (cooldownLeft > 0) {
      setError(
        `Please wait ${cooldownLeft}s before requesting another reset link.`,
      );
      return;
    }

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: getResetRedirectUrl(),
      },
    );
    setLoading(false);

    if (resetError) {
      setError(toFriendlyResetError(resetError.message));
      return;
    }

    setCooldownUntil(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
    setSuccess("Password reset link sent to your email. Check spam/junk if not in inbox.");
  }

  return (
    <div className="min-h-screen bg-[#f8f5ee] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-[#0f2746] p-6 text-white text-center">
          <div className="inline-flex p-3 rounded-xl bg-white/15 mb-3">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Forgot Password</h1>
          <p className="text-slate-200 text-sm mt-1">
            We will send a password reset link to your email
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

          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || cooldownLeft > 0}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg py-3 transition-colors disabled:opacity-60"
          >
            {loading
              ? "Sending reset link..."
              : cooldownLeft > 0
                ? `Try again in ${cooldownLeft}s`
                : "Send Reset Link"}
          </button>

          <div className="flex justify-center">
            <BackButton
              fallbackHref={`/student/login${forwardQuery}`}
              label="Back"
              className="inline-flex items-center space-x-1 text-sm text-slate-600 hover:text-slate-800"
            />
          </div>

          <p className="text-sm text-slate-600">
            Back to{" "}
            <Link
              href={`/student/login${forwardQuery}`}
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              Student Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function StudentForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f5ee]" />}>
      <StudentForgotPasswordContent />
    </Suspense>
  );
}
