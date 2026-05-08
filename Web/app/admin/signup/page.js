"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Copy, GraduationCap, Shield } from "lucide-react";
import PasswordField from "@/components/PasswordField";
import { upsertAdminCredentials } from "@/lib/adminAuth";

export default function AdminSignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [envPreview, setEnvPreview] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setCopied(false);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password || !confirmPassword) {
      setError("Email, password and confirm password are required.");
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

    setSaving(true);
    try {
      const payload = await upsertAdminCredentials(normalizedEmail, password);
      const snippet =
        String(payload?.envPreview || "").trim() ||
        `ADMIN_EMAIL=${normalizedEmail}\nADMIN_PASSWORD=${password}`;
      setEnvPreview(snippet);
      setSuccess(
        "Admin credentials saved to Supabase. Env values are also prepared below.",
      );
    } catch (submitError) {
      setError(String(submitError?.message || "Unable to save admin credentials."));
    } finally {
      setSaving(false);
    }
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
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-slate-200">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="p-3 bg-[#0f2746]/10 rounded-xl">
              <GraduationCap className="h-8 w-8 text-[#0f2746]" />
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <Shield className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Create Admin</h1>
          <p className="text-slate-600">
            Admin login is controlled by backend environment variables
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Admin Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@seatsmart.com"
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
            placeholder="Enter new password"
          />

          <PasswordField
            label="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="Confirm password"
          />

          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2 text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start space-x-2 text-green-700 text-sm">
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
            disabled={saving}
            className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Continue"}
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
