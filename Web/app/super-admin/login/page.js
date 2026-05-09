"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Crown, House, ShieldCheck } from "lucide-react";
import PasswordField from "@/components/PasswordField";
import { loginSuperAdmin, verifySuperAdminSession } from "@/lib/superAdminAuth";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const session = await verifySuperAdminSession();
        if (!mounted) return;
        if (session?.authenticated) {
          router.replace("/super-admin/dashboard");
          return;
        }
      } catch {
        // keep login page visible on connectivity issues
      }

      if (mounted) setChecking(false);
    }

    checkSession();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      await loginSuperAdmin(normalizedEmail, password);
      router.replace("/super-admin/dashboard");
    } catch (loginError) {
      setError(
        String(loginError?.message || "Invalid super admin email or password."),
      );
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#f8f5ee] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full border border-slate-200">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-500 border-t-transparent"></div>
            <span className="text-slate-700">Checking super admin session...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f5ee] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-slate-200">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="p-3 bg-[#0f2746]/10 rounded-xl">
              <ShieldCheck className="h-8 w-8 text-[#0f2746]" />
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <Crown className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Super Admin Login</h1>
          <p className="text-slate-600">Sign in with platform owner credentials</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="owner@seatsmart.com"
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2 text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <Link
            href="/"
            className="w-full border border-slate-300 text-slate-700 py-3 px-4 rounded-lg font-semibold hover:bg-slate-50 transition-colors inline-flex items-center justify-center"
          >
            <House className="h-4 w-4 mr-2" />
            Home
          </Link>

          <p className="text-sm text-slate-600 pt-1">
            Need regular admin access?{" "}
            <Link
              href="/admin/login"
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              Admin Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

