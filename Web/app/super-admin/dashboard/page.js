"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  DoorOpen,
  QrCode,
  School,
  Upload,
  UserCog,
  Users,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { getFriendlySupabaseError } from "@/lib/students";

const statCards = [
  { key: "total_admins", label: "Total Admins", icon: UserCog },
  { key: "total_colleges", label: "Total Schools / Colleges", icon: School },
  { key: "total_exam_centers", label: "Total Exam Centers", icon: Building2 },
  { key: "total_rooms", label: "Total Rooms", icon: DoorOpen },
  { key: "total_students", label: "Total Students", icon: Users },
  { key: "total_qr_codes", label: "Total QR Codes", icon: QrCode },
];

const quickActions = [
  { label: "Create Admin", href: "/super-admin/admins", icon: UserCog },
  { label: "Add School", href: "/super-admin/colleges", icon: School },
  { label: "Add Center", href: "/super-admin/centers", icon: Building2 },
  { label: "Upload Data", href: "/super-admin/upload", icon: Upload },
  { label: "Generate QR", href: "/super-admin/qrcodes", icon: QrCode },
];

function HealthCard({ label, status }) {
  const ok = Boolean(status?.ok);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">{label}</p>
        <span
          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
            ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {ok ? "Healthy" : "Issue"}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-700">{status?.message || "Not checked"}</p>
    </div>
  );
}

export default function SuperAdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    stats: {},
    recentActivity: [],
    systemHealth: {
      api: { ok: false, message: "Not checked" },
      database: { ok: false, message: "Not checked" },
      superAdminAuth: { ok: false, message: "Not checked" },
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const payload = await apiGet("/api/dashboard");
      setData({
        stats: payload.stats || {},
        recentActivity: payload.recentActivity || [],
        systemHealth: payload.systemHealth || {
          api: { ok: false, message: "Not checked" },
          database: { ok: false, message: "Not checked" },
          superAdminAuth: { ok: false, message: "Not checked" },
        },
      });
    } catch (fetchError) {
      setError(getFriendlySupabaseError(fetchError, "Failed to load dashboard."));
      setData({
        stats: {},
        recentActivity: [],
        systemHealth: {
          api: { ok: false, message: "Not checked" },
          database: { ok: false, message: "Not checked" },
          superAdminAuth: { ok: false, message: "Not checked" },
        },
      });
    }
    setLoading(false);
  }

  const stats = useMemo(() => data.stats || {}, [data.stats]);

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-3xl font-bold text-slate-900">Super Admin Dashboard</h1>
        <p className="text-slate-600 mt-1">
          Platform-wide controls for admins, schools, centers, rooms, students,
          seating, and system status
        </p>
      </section>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 flex items-start space-x-2 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-600">{card.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">
                    {loading ? "..." : Number(stats[card.key] || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-orange-100">
                  <Icon className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="inline-flex items-center justify-center rounded-lg px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors"
              >
                <Icon className="h-4 w-4 mr-2" />
                <span>{action.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-3 inline-flex items-center">
            <Activity className="h-4 w-4 mr-2 text-orange-600" />
            Recent Activity
          </h2>
          <div className="space-y-2">
            {(data.recentActivity || []).length === 0 ? (
              <p className="text-sm text-slate-500">
                {loading ? "Loading..." : "No activity yet."}
              </p>
            ) : (
              data.recentActivity.map((item, idx) => (
                <p key={`${item}-${idx}`} className="text-sm text-slate-700">
                  - {item}
                </p>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <HealthCard label="API" status={data.systemHealth?.api} />
          <HealthCard label="Database" status={data.systemHealth?.database} />
          <HealthCard
            label="Super Admin Auth"
            status={data.systemHealth?.superAdminAuth}
          />

          {data.systemHealth?.api?.ok &&
          data.systemHealth?.database?.ok &&
          data.systemHealth?.superAdminAuth?.ok ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>System is ready for super admin operations.</span>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

