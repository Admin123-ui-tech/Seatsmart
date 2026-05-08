"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Copy, KeyRound } from "lucide-react";
import PasswordField from "@/components/PasswordField";

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [envPreview, setEnvPreview] = useState("");
  const [copied, setCopied] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setCopied(false);

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

    const snippet = `ADMIN_EMAIL=${normalizedEmail}\nADMIN_PASSWORD=${password}`;
    setEnvPreview(snippet);
    setSuccess(
      "Reset values prepared. Copy and update backend env, then redeploy API.",
    );
  }

  async function handleCopyEnv() {
    if (!envPreview) return;
    try {
      await navigator.clipboard.writeText(envPreview);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setError("Unable to copy env values.");
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f5ee] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-[#0f2746] p-6 text-white text-center">
          <div className="inline-flex p-3 rounded-xl bg-white/15 mb-3">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Admin Forgot Password</h1>
          <p className="text-slate-200 text-sm mt-1">
            Password is managed from backend environment settings
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Admin Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@seatsmart.com"
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

          {envPreview ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-600 mb-2">Backend Env Update</p>
              <pre className="text-xs text-slate-800 whitespace-pre-wrap">{envPreview}</pre>
              <button
                type="button"
                onClick={handleCopyEnv}
                className="mt-3 inline-flex items-center px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm"
              >
                <Copy className="h-4 w-4 mr-2" />
                {copied ? "Copied" : "Copy Values"}
              </button>
            </div>
          ) : null}

          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg py-3 transition-colors"
          >
            Prepare Reset
          </button>

          <p className="text-sm text-slate-600">
            Back to{" "}
            <Link href="/admin/login" className="text-orange-600 hover:text-orange-700 font-medium">
              Admin Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
