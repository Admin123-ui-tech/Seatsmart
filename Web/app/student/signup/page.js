"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CheckCircle2, GraduationCap, UserPlus } from "lucide-react";
import PasswordField from "@/components/PasswordField";
import { supabase } from "@/lib/supabase";
import { getApiBaseUrl } from "@/lib/api";

function parseSignupError(message) {
  const normalized = String(message || "").toLowerCase();
  if (normalized.includes("rate limit") || normalized.includes("email rate limit")) {
    return "Email rate limit exceeded for signup. Please wait a few minutes, then use Student Sign In.";
  }
  return message || "Unable to create account.";
}

export default function StudentSignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const center = searchParams.get("center") || "";
  const centerId = searchParams.get("centerId") || "";
  const forwardQuery = center
    ? `?center=${encodeURIComponent(center)}`
    : centerId
      ? `?centerId=${encodeURIComponent(centerId)}`
      : "";

  const [fullName, setFullName] = useState("");
  const [rollno, setRollno] = useState("");
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

    if (!fullName.trim() || !rollno.trim() || !email.trim() || !password || !confirmPassword) {
      setError("All fields are required.");
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
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          rollno: rollno.trim(),
        },
      },
    });

    if (signUpError) {
      setLoading(false);
      setError(parseSignupError(signUpError.message));
      return;
    }

    const authUserId = data?.user?.id;
    if (authUserId) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (accessToken) {
          const response = await fetch(
            new URL("/api/student-profiles/upsert", getApiBaseUrl()).toString(),
            {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                auth_user_id: authUserId,
                full_name: fullName.trim(),
                rollno: rollno.trim(),
                email: email.trim().toLowerCase(),
              }),
            },
          );

          if (!response.ok) {
            throw new Error("Unable to sync student profile.");
          }
        }
      } catch {
        // Profile sync failure should not block auth success.
      }
    }

    setLoading(false);
    setSuccess("Account created successfully. Please sign in.");
    setTimeout(() => {
      router.replace(`/student/login${forwardQuery}`);
    }, 900);
  }

  return (
    <div className="min-h-screen bg-[#f8f5ee] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-[#0f2746] p-6 text-white text-center">
          <div className="inline-flex p-3 rounded-xl bg-white/15 mb-3">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Student Sign Up</h1>
          <p className="text-slate-200 text-sm mt-1">
            Create your account to access seat details instantly
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Roll No
            </label>
            <input
              type="text"
              required
              value={rollno}
              onChange={(e) => setRollno(e.target.value)}
              placeholder="Enter your roll number"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
            />
          </div>

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
            placeholder="Re-enter your password"
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
              <UserPlus className="h-4 w-4" />
              <span>{loading ? "Creating account..." : "Create Account"}</span>
            </span>
          </button>

          <p className="text-sm text-slate-600">
            Already have an account?{" "}
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
