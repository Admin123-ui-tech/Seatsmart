"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Plus, School, Search } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { getFriendlySupabaseError } from "@/lib/students";

const emptyForm = {
  id: "",
  name: "",
  code: "",
  type: "school",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  status: "active",
};

export default function CollegesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    loadRows();
  }, [search, typeFilter, statusFilter]);

  async function loadRows() {
    setLoading(true);
    setError("");
    try {
      const payload = await apiGet("/api/colleges", {
        search,
        type: typeFilter,
        status: statusFilter,
      });
      setRows(payload.rows || []);
    } catch (fetchError) {
      setError(getFriendlySupabaseError(fetchError, "Unable to load colleges."));
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
      type: row.type || "school",
      contact_person: row.contact_person || "",
      phone: row.phone || "",
      email: row.email || "",
      address: row.address || "",
      city: row.city || "",
      state: row.state || "",
      status: row.status || "active",
    });
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editing) {
        await apiPost("/api/colleges/update", form);
        setSuccess("School/college updated successfully.");
      } else {
        await apiPost("/api/colleges/create", form);
        setSuccess("School/college created successfully.");
      }
      resetForm();
      await loadRows();
    } catch (saveError) {
      setSuccess("");
      setError(getFriendlySupabaseError(saveError, "Unable to save school/college."));
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    const proceed = window.confirm(
      "Delete this school/college? This cannot be undone.",
    );
    if (!proceed) return;

    setError("");
    setSuccess("");
    try {
      await apiPost("/api/colleges/delete", { id });
      await loadRows();
      setSuccess("School/college deleted successfully.");
    } catch (deleteError) {
      setSuccess("");
      setError(getFriendlySupabaseError(deleteError, "Unable to delete school/college."));
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900">Schools / Colleges</h1>
        <p className="text-slate-600 mt-1">
          Add, edit, search, and manage institution records
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
              placeholder="Search by name, code, city..."
              className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2"
          >
            <option value="">All Types</option>
            <option value="school">School</option>
            <option value="college">College</option>
          </select>
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
          {editing ? "Edit School / College" : "Add School / College"}
        </h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <input
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Name"
              className="border border-slate-300 rounded-lg px-3 py-2"
            />
            <input
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
              placeholder="Code"
              className="border border-slate-300 rounded-lg px-3 py-2"
            />
            <select
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              className="border border-slate-300 rounded-lg px-3 py-2"
            >
              <option value="school">School</option>
              <option value="college">College</option>
            </select>
            <input
              value={form.contact_person}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, contact_person: e.target.value }))
              }
              placeholder="Contact Person"
              className="border border-slate-300 rounded-lg px-3 py-2"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Phone"
              className="border border-slate-300 rounded-lg px-3 py-2"
            />
            <input
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email"
              className="border border-slate-300 rounded-lg px-3 py-2"
            />
            <input
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Address"
              className="border border-slate-300 rounded-lg px-3 py-2 md:col-span-2"
            />
            <select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              className="border border-slate-300 rounded-lg px-3 py-2"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
            <School className="h-4 w-4 mr-2 text-orange-600" />
            Schools / Colleges
          </h2>
          <span className="text-sm text-slate-500">{rows.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {["Name", "Code", "Type", "City", "Status", "Students", "Actions"].map(
                  (head) => (
                    <th
                      key={head}
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase"
                    >
                      {head}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-sm text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-sm text-slate-500">
                    No schools/colleges found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-sm text-slate-900">{row.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.code || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 capitalize">
                      {row.type || "school"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.city || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {row.total_students || 0}
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
