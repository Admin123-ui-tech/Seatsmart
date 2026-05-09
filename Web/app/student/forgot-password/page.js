"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AlertCircle, CheckCircle2, KeyRound, Save } from "lucide-react";
import PasswordField from "@/components/PasswordField";
import BackButton from "@/components/BackButton";
import { getApiBaseUrl } from "@/lib/api";

const RESET_REQUEST_TIMEOUT_MS = Number(
  process.env.NEXT_PUBLIC_STUDENT_PASSWORD_RESET_TIMEOUT_MS || 15000,
);

function buildApiUrl(path) {
  return new URL(path, getApiBaseUrl()).toString();
}

function getFriendlyResetError(error) {
  const raw = String(error?.message || "");
  const normalized = raw.toLowerCase();
  if (
    normalized.includes("missing supabase_url") ||
    normalized.includes("supabase_service_role_key") ||
    normalized.includes("not configured")
  ) {
    return "Password reset backend is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in API server env (Render), then redeploy.";
  }
  return raw || "Unable to update password.";
}

async function resetStudentPassword(email, password) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RESET_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildApiUrl("/api/student-auth/reset-password-direct"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `Request failed (${response.status}).`);
    }

    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Password reset request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function StudentForgotPasswordContent() {
  const searchParams = useSearchParams();
  const center = searchParams.get("center") || "";
  const centerCode = searchParams.get("centerCode") || "";
  const centerId = searchParams.get("centerId") || "";
  const forwardQuery = center
    ? `?center=${encodeURIComponent(center)}`
    : centerCode
      ? `?centerCode=${encodeURIComponent(centerCode)}`
    : centerId
      ? `?centerId=${encodeURIComponent(centerId)}`
      : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password || !confirmPassword) {
      setError("Email, new password, and confirm password are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetStudentPassword(normalizedEmail, password);
      setSuccess("Password updated successfully. You can sign in now.");
    } catch (resetError) {
      setError(getFriendlyResetError(resetError));
    } finally {
      setLoading(false);
    }
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
            Set a new password directly without email reset link
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
            label="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="Enter new password"
          />

          <PasswordField
            label="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="Confirm new password"
          />

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
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg py-3 transition-colors disabled:opacity-60"
          >
            <span className="inline-flex items-center justify-center space-x-2">
              <Save className="h-4 w-4" />
              <span>{loading ? "Updating..." : "Update Password"}</span>
            </span>
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
