"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Building2, CheckCircle2, Plus, Search } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { getFriendlySupabaseError } from "@/lib/students";

const emptyForm = {
  id: "",
  name: "",
  code: "",
  address: "",
  city: "",
  state: "",
  total_rooms: 0,
  capacity: 0,
  status: "active",
  college_id: "",
};

export default function CentersPage() {
  const [rows, setRows] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    loadRows();
  }, [search, cityFilter, statusFilter]);

  async function loadInitial() {
    try {
      const options = await apiGet("/api/students/options");
      setColleges(options.colleges || []);
    } catch {
      setColleges([]);
    }
  }

  async function loadRows() {
    setLoading(true);
    setError("");
    try {
      const payload = await apiGet("/api/exam-centers", {
        search,
        city: cityFilter,
        status: statusFilter,
      });
      setRows(payload.rows || []);
    } catch (fetchError) {
      setError(getFriendlySupabaseError(fetchError, "Unable to load centers."));
      setRows([]);
    }
    setLoading(false);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditing(false);
  }

  function startEdit(row) {
    setEditing(true);
    setForm({
      id: row.id,
      name: row.name || "",
      code: row.code || "",
      address: row.address || "",
      city: row.city || "",
      state: row.state || "",
      total_rooms: row.total_rooms || 0,
      capacity: row.capacity || 0,
      status: row.status || "active",
      college_id: row.college_id || "",
    });
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editing) {
        await apiPost("/api/exam-centers/update", form);
        setSuccess("Exam center updated successfully.");
      } else {
        await apiPost("/api/exam-centers/create", form);
        setSuccess("Exam center created successfully.");
      }
      resetForm();
      await loadRows();
    } catch (saveError) {
      setSuccess("");
      setError(getFriendlySupabaseError(saveError, "Unable to save center."));
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    const proceed = window.confirm("Delete this center?");
    if (!proceed) return;
    setError("");
    setSuccess("");
    try {
      await apiPost("/api/exam-centers/delete", { id });
      await loadRows();
      setSuccess("Exam center deleted successfully.");
    } catch (deleteError) {
      setSuccess("");
      setError(getFriendlySupabaseError(deleteError, "Unable to delete center."));
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900">Exam Centers</h1>
        <p className="text-slate-600 mt-1">
          Manage exam centers, capacity, and readiness
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
        <div className="grid md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search center by name/code/city..."
              className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2"
            />
          </div>
          <input
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="Filter by city"
            className="border border-slate-300 rounded-lg px-3 py-2"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 inline-flex items-center">
          <Plus className="h-4 w-4 mr-2 text-orange-600" />
          {editing ? "Edit Exam Center" : "Add Exam Center"}
        </h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <input
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Center Name"
              className="border border-slate-300 rounded-lg px-3 py-2"
            />
            <input
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
              placeholder="Center Code"
              className="border border-slate-300 rounded-lg px-3 py-2"
            />
            <select
              value={form.college_id}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, college_id: e.target.value }))
              }
              className="border border-slate-300 rounded-lg px-3 py-2"
            >
              <option value="">Unassigned College</option>
              {colleges.map((college) => (
                <option key={college.id} value={college.id}>
                  {college.name}
                </option>
              ))}
            </select>
            <input
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Address"
              className="border border-slate-300 rounded-lg px-3 py-2 md:col-span-2"
            />
            <input
              value={form.city}
              onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              placeholder="City"
              className="border border-slate-300 rounded-lg px-3 py-2"
            />
            <input
              value={form.state}
              onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
              placeholder="State"
              className="border border-slate-300 rounded-lg px-3 py-2"
            />
            <input
              type="number"
              min={0}
              value={form.total_rooms}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, total_rooms: Number(e.target.value || 0) }))
              }
              placeholder="Total Rooms"
              className="border border-slate-300 rounded-lg px-3 py-2"
            />
            <input
              type="number"
              min={0}
              value={form.capacity}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, capacity: Number(e.target.value || 0) }))
              }
              placeholder="Capacity"
              className="border border-slate-300 rounded-lg px-3 py-2"
            />
            <select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              className="border border-slate-300 rounded-lg px-3 py-2"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium disabled:opacity-60"
            >
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </button>
            {editing ? (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 inline-flex items-center">
            <Building2 className="h-4 w-4 mr-2 text-orange-600" />
            Centers
          </h2>
          <span className="text-sm text-slate-500">{rows.length} centers</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Center",
                  "Code",
                  "City",
                  "Rooms",
                  "Capacity",
                  "Students",
                  "Status",
                  "Actions",
                ].map((head) => (
                  <th
                    key={head}
                    className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-sm text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-sm text-slate-500">
                    No centers found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-sm text-slate-900">{row.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.code || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.city || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.rooms_count || 0}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.capacity || 0}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.students_count || 0}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(row)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
