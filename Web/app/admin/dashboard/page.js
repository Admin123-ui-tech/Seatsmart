"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Building2,
  DoorOpen,
  QrCode,
  ShieldCheck,
  School,
  Upload,
  Users,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { getFriendlySupabaseError } from "@/lib/students";

const statCards = [
  { key: "total_students", label: "Total Students", icon: Users },
  { key: "total_colleges", label: "Schools / Colleges", icon: School },
  { key: "total_exam_centers", label: "Exam Centers", icon: Building2 },
  { key: "total_rooms", label: "Total Rooms", icon: DoorOpen },
  { key: "total_qr_codes", label: "QR Codes", icon: QrCode },
];

const quickActions = [
  { label: "Upload Data", href: "/admin/upload", icon: Upload },
  { label: "Add School/College", href: "/admin/colleges", icon: School },
  { label: "Add Center", href: "/admin/centers", icon: Building2 },
  { label: "Generate QR", href: "/admin/qrcodes", icon: QrCode },
  { label: "View Seating Plan", href: "/admin/seating", icon: Users },
  { label: "System Health", href: "/admin/health", icon: ShieldCheck },
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    stats: {},
    centers: [],
    collegeWise: [],
    recentActivity: [],
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
        centers: payload.centers || [],
        collegeWise: payload.collegeWise || [],
        recentActivity: payload.recentActivity || [],
      });
    } catch (fetchError) {
      setError(getFriendlySupabaseError(fetchError, "Failed to load dashboard."));
    }
    setLoading(false);
  }

  const stats = useMemo(() => data.stats || {}, [data.stats]);

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">
          Multi-college exam seating control center
        </p>
      </section>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
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
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Center Allocation</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                    Center
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                    Students
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                    Rooms
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {(data.centers || []).length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-500" colSpan={4}>
                      {loading ? "Loading..." : "No center allocation data found."}
                    </td>
                  </tr>
                ) : (
                  data.centers.map((row, idx) => (
                    <tr key={row.id || idx} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-sm text-slate-900">{row.center}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.students || 0}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.rooms_used || 0}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          {row.status || "Ready"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              College-wise Student Count
            </h2>
            <div className="space-y-3">
              {(data.collegeWise || []).length === 0 ? (
                <p className="text-sm text-slate-500">
                  {loading ? "Loading..." : "No college data found."}
                </p>
              ) : (
                data.collegeWise.map((row, idx) => (
                  <div key={`${row.college_name}-${idx}`} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{row.college_name}</span>
                    <span className="font-semibold text-slate-900">{row.students}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-3 inline-flex items-center">
              <Activity className="h-4 w-4 mr-2 text-orange-600" />
              Recent Activity
            </h2>
            <div className="space-y-2">
              {(data.recentActivity || []).length === 0 ? (
                <p className="text-sm text-slate-500">No activity yet.</p>
              ) : (
                data.recentActivity.map((item, idx) => (
                  <p key={`${item}-${idx}`} className="text-sm text-slate-700">
                    - {item}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
