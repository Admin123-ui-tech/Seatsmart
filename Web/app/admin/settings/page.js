"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Settings2 } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { getFriendlySupabaseError } from "@/lib/students";

const settingKeys = [
  { key: "exam_title", label: "Exam Title" },
  { key: "exam_date", label: "Exam Date" },
  { key: "exam_time", label: "Exam Time" },
  { key: "board_session_name", label: "Board / Session Name" },
  { key: "default_student_portal_url", label: "Default Student Portal URL" },
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    exam_title: "",
    exam_date: "",
    exam_time: "",
    board_session_name: "",
    default_student_portal_url: "",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError("");
    try {
      const payload = await apiGet("/api/settings");
      setForm((prev) => ({
        ...prev,
        exam_title: payload.map?.exam_title || "",
        exam_date: payload.map?.exam_date || "",
        exam_time: payload.map?.exam_time || "",
        board_session_name: payload.map?.board_session_name || "",
        default_student_portal_url: payload.map?.default_student_portal_url || "",
      }));
    } catch (fetchError) {
      setError(getFriendlySupabaseError(fetchError, "Unable to load settings."));
    }
    setLoading(false);
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiPost("/api/settings/upsert", { settings: form });
      setSuccess("Settings saved successfully.");
    } catch (saveError) {
      setError(getFriendlySupabaseError(saveError, "Unable to save settings."));
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">
          Configure exam title, timing, board/session, and portal URL
        </p>
      </section>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
      {success ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 flex items-start space-x-2">
          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      ) : null}

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        {loading ? (
          <p className="text-slate-500">Loading settings...</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {settingKeys.map((item) => (
              <div key={item.key}>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {item.label}
                </label>
                <input
                  value={form[item.key]}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [item.key]: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium disabled:opacity-60 inline-flex items-center"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
