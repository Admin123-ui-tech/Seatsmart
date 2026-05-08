"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, KeyRound, Save } from "lucide-react";
import PasswordField from "@/components/PasswordField";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";

function StudentResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const center = searchParams.get("center") || "";
  const centerId = searchParams.get("centerId") || "";
  const forwardQuery = center
    ? `?center=${encodeURIComponent(center)}`
    : centerId
      ? `?centerId=${encodeURIComponent(centerId)}`
      : "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;
    let sessionReady = false;
    let timeoutId;

    async function checkRecoverySession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) {
        sessionReady = true;
        setError("");
        setChecking(false);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        sessionReady = true;
        setError("");
        setChecking(false);
      }
    });

    checkRecoverySession();
    timeoutId = window.setTimeout(() => {
      if (!mounted || sessionReady) return;
      setError(
        "Invalid or expired reset link. Please request a new password reset email.",
      );
      setChecking(false);
    }, 3000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!password || !confirmPassword) {
      setError("Password and confirm password are required.");
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
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message || "Unable to update password.");
      return;
    }

    setSuccess("Password updated successfully. Redirecting to sign in...");
    setTimeout(() => {
      router.replace(`/student/login${forwardQuery}`);
    }, 900);
  }

  return (
    <div className="min-h-screen bg-[#f8f5ee] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-[#0f2746] p-6 text-white text-center">
          <div className="inline-flex p-3 rounded-xl bg-white/15 mb-3">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-slate-200 text-sm mt-1">
            Enter your new password to complete recovery
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {checking ? (
            <p className="text-sm text-slate-600">Checking reset link...</p>
          ) : (
            <>
              <PasswordField
                label="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Minimum 6 characters"
              />

              <PasswordField
                label="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Re-enter password"
              />
            </>
          )}

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
            disabled={loading || checking}
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

export default function StudentResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f5ee]" />}>
      <StudentResetPasswordContent />
    </Suspense>
  );
}
