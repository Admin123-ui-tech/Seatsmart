"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { API_BASE_URL, apiGet, getApiBaseUrl } from "@/lib/api";

function StatusPill({ ok }) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
        ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {ok ? "Healthy" : "Issue"}
    </span>
  );
}

export default function AdminHealthPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [apiHealth, setApiHealth] = useState(null);
  const [supabaseHealth, setSupabaseHealth] = useState({
    ok: false,
    message: "Not checked",
    statusCode: null,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  async function checkSupabase() {
    if (!supabaseUrl || !supabaseAnon) {
      return {
        ok: false,
        message: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
        statusCode: null,
      };
    }

    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
        headers: { apikey: supabaseAnon },
      });
      return {
        ok: response.ok,
        message: response.ok
          ? "Supabase Auth reachable"
          : `Supabase Auth returned ${response.status}`,
        statusCode: response.status,
      };
    } catch (fetchError) {
      return {
        ok: false,
        message: fetchError?.message || "Unable to reach Supabase Auth",
        statusCode: null,
      };
    }
  }

  async function runChecks() {
    setLoading(true);
    setError("");
    try {
      const [apiPayload, supabasePayload] = await Promise.all([
        apiGet("/api/system/health"),
        checkSupabase(),
      ]);
      setApiHealth(apiPayload);
      setSupabaseHealth(supabasePayload);
    } catch (fetchError) {
      setError(fetchError?.message || "Failed to load system health.");
      setApiHealth(null);
      setSupabaseHealth({
        ok: false,
        message: "Not checked",
        statusCode: null,
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    runChecks();
  }, []);

  const summaryOk = useMemo(() => {
    const apiOk = apiHealth?.status === "ok";
    return Boolean(apiOk && supabaseHealth.ok);
  }, [apiHealth, supabaseHealth]);

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">System Health</h1>
            <p className="text-slate-600 mt-1">
              One-click checks for API, database, Supabase, and env configuration
            </p>
          </div>
          <button
            onClick={runChecks}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium disabled:opacity-60 inline-flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Checking..." : "Run Health Check"}
          </button>
        </div>
      </section>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start space-x-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">Overall Status</p>
            <StatusPill ok={summaryOk} />
          </div>
          <p className="mt-3 text-sm text-slate-700">
            {summaryOk ? "All critical checks passed." : "Some checks need attention."}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">API + Database</p>
            <StatusPill ok={apiHealth?.status === "ok"} />
          </div>
          <p className="mt-3 text-sm text-slate-700">
            {apiHealth?.checks?.database?.message || "Not checked"}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">Supabase Auth</p>
            <StatusPill ok={supabaseHealth.ok} />
          </div>
          <p className="mt-3 text-sm text-slate-700">{supabaseHealth.message}</p>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3 inline-flex items-center">
          <Activity className="h-4 w-4 mr-2 text-orange-600" />
          Runtime Details
        </h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-slate-500">Configured API base</p>
            <p className="font-mono text-slate-800 break-all">{API_BASE_URL}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-slate-500">Resolved API base</p>
            <p className="font-mono text-slate-800 break-all">{getApiBaseUrl()}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-slate-500">Supabase URL</p>
            <p className="font-mono text-slate-800 break-all">
              {supabaseUrl || "Not configured"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-slate-500">API service status</p>
            <p className="font-mono text-slate-800">
              {apiHealth?.service || "Unknown"} / {apiHealth?.status || "Unknown"}
            </p>
          </div>
        </div>

        {apiHealth?.checks ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-800 mb-2">API checks</p>
            <ul className="space-y-1 text-slate-700">
              <li>
                - Database: {apiHealth.checks.database?.message || "N/A"}
              </li>
              <li>
                - Admin env: {apiHealth.checks.adminAuth?.message || "N/A"}
              </li>
            </ul>
          </div>
        ) : null}

        {summaryOk ? (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-start space-x-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>System is ready for admin operations.</span>
          </div>
        ) : null}
      </section>
    </div>
  );
}
