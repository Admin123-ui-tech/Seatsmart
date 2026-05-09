"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Power,
  Search,
  Trash2,
  UserCog,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { getFriendlySupabaseError } from "@/lib/students";

const PAGE_SIZE = 10;

const emptyForm = {
  full_name: "",
  email: "",
  phone: "",
  role: "admin",
  status: "active",
  assigned_college_ids: [],
  assigned_center_ids: [],
};

function normalizeIdArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  try {
    const parsed = JSON.parse(String(value));
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item)).filter(Boolean);
    }
  } catch {
    // keep fallback
  }
  return [];
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function getLabelsFromIds(ids, rows) {
  if (!ids || ids.length === 0) return "-";
  const names = ids
    .map((id) => rows.find((row) => String(row.id) === String(id))?.name || String(id))
    .filter(Boolean);
  if (names.length === 0) return "-";
  return names.join(", ");
}

export default function SuperAdminAdminsPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [options, setOptions] = useState({ colleges: [], centers: [] });
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyForm);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  );

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    loadRows();
  }, [search, roleFilter, statusFilter, page]);

  async function loadOptions() {
    try {
      const payload = await apiGet("/api/admins/options");
      setOptions({
        colleges: payload.colleges || [],
        centers: payload.centers || [],
      });
    } catch {
      setOptions({ colleges: [], centers: [] });
    }
  }

  async function loadRows() {
    setLoading(true);
    setError("");
    try {
      const payload = await apiGet("/api/admins", {
        search,
        role: roleFilter,
        status: statusFilter,
        page,
        pageSize: PAGE_SIZE,
      });
      setRows(payload.rows || []);
      setTotal(Number(payload.total || 0));
    } catch (fetchError) {
      setRows([]);
      setTotal(0);
      setError(getFriendlySupabaseError(fetchError, "Unable to load admins."));
    }
    setLoading(false);
  }

  function resetForm() {
    setEditingId("");
    setForm(emptyForm);
  }

  function openEdit(row) {
    setEditingId(String(row.id));
    setForm({
      full_name: row.full_name || "",
      email: row.email || "",
      phone: row.phone || "",
      role: row.role || "admin",
      status: row.status || "active",
      assigned_college_ids: normalizeIdArray(row.assigned_college_ids),
      assigned_center_ids: normalizeIdArray(row.assigned_center_ids),
    });
  }

  async function handleSave(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      role: form.role.trim().toLowerCase(),
      status: form.status.trim().toLowerCase(),
      assigned_college_ids: form.assigned_college_ids,
      assigned_center_ids: form.assigned_center_ids,
    };

    if (!payload.full_name || !payload.email) {
      setError("Full name and email are required.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await apiPost("/api/admins/update", { id: editingId, ...payload });
        setSuccess("Admin updated successfully.");
      } else {
        await apiPost("/api/admins/create", payload);
        setSuccess("Admin created successfully.");
      }
      resetForm();
      await loadRows();
    } catch (saveError) {
      setSuccess("");
      setError(getFriendlySupabaseError(saveError, "Unable to save admin."));
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    const proceed = window.confirm("Delete this admin? This action cannot be undone.");
    if (!proceed) return;

    setError("");
    setSuccess("");
    try {
      await apiPost("/api/admins/delete", { id });
      await loadRows();
      setSuccess("Admin deleted successfully.");
      if (String(editingId) === String(id)) resetForm();
    } catch (deleteError) {
      setSuccess("");
      setError(getFriendlySupabaseError(deleteError, "Unable to delete admin."));
    }
  }

  async function handleToggleStatus(row) {
    const nextStatus = (row.status || "active") === "active" ? "inactive" : "active";
    setError("");
    setSuccess("");
    try {
      await apiPost("/api/admins/toggle-status", { id: row.id, status: nextStatus });
      await loadRows();
      setSuccess(
        nextStatus === "active"
          ? "Admin enabled successfully."
          : "Admin disabled successfully.",
      );
      if (String(editingId) === String(row.id)) {
        setForm((prev) => ({ ...prev, status: nextStatus }));
      }
    } catch (toggleError) {
      setSuccess("");
      setError(getFriendlySupabaseError(toggleError, "Unable to update status."));
    }
  }

  function readMultiSelectValues(event) {
    return Array.from(event.target.selectedOptions).map((option) => option.value);
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900 inline-flex items-center">
          <Crown className="h-5 w-5 mr-2 text-orange-600" />
          Admin Management
        </h1>
        <p className="text-slate-600 mt-1">
          Create, update, disable, search, filter, and remove admin accounts
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search by name, email, phone..."
              className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setPage(1);
              setRoleFilter(e.target.value);
            }}
            className="border border-slate-300 rounded-lg px-3 py-2"
          >
            <option value="">All Roles</option>
            <option value="admin">admin</option>
            <option value="manager">manager</option>
            <option value="operator">operator</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value);
            }}
            className="border border-slate-300 rounded-lg px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 inline-flex items-center">
          <UserCog className="h-4 w-4 mr-2 text-orange-600" />
          {editingId ? "Edit Admin" : "Add Admin"}
        </h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <input
              required
              value={form.full_name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, full_name: e.target.value }))
              }
              placeholder="Full Name"
              className="border border-slate-300 rounded-lg px-3 py-2"
            />
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email"
              className="border border-slate-300 rounded-lg px-3 py-2"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Phone"
              className="border border-slate-300 rounded-lg px-3 py-2"
            />
            <select
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
              className="border border-slate-300 rounded-lg px-3 py-2"
            >
              <option value="admin">admin</option>
              <option value="manager">manager</option>
              <option value="operator">operator</option>
            </select>
            <select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              className="border border-slate-300 rounded-lg px-3 py-2"
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
            <div></div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Assigned Schools / Colleges
              </label>
              <select
                multiple
                size={4}
                value={form.assigned_college_ids}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    assigned_college_ids: readMultiSelectValues(e),
                  }))
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              >
                {(options.colleges || []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Assigned Exam Centers
              </label>
              <select
                multiple
                size={4}
                value={form.assigned_center_ids}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    assigned_center_ids: readMultiSelectValues(e),
                  }))
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              >
                {(options.centers || []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium disabled:opacity-60"
            >
              {saving ? "Saving..." : editingId ? "Update Admin" : "Add Admin"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Name",
                  "Email",
                  "Phone",
                  "Role",
                  "Status",
                  "Assigned Schools",
                  "Assigned Centers",
                  "Created At",
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
                  <td colSpan={9} className="px-4 py-6 text-sm text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-sm text-slate-500">
                    No admins found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const collegeIds = normalizeIdArray(row.assigned_college_ids);
                  const centerIds = normalizeIdArray(row.assigned_center_ids);
                  const nextStatus = row.status === "active" ? "inactive" : "active";
                  return (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-sm text-slate-900">{row.full_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.email}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.phone || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.role}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                            row.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {getLabelsFromIds(collegeIds, options.colleges)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {getLabelsFromIds(centerIds, options.centers)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(row)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleStatus(row)}
                            className="px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 inline-flex items-center"
                          >
                            <Power className="h-4 w-4 mr-1" />
                            {nextStatus === "active" ? "Enable" : "Disable"}
                          </button>
                          <button
                            onClick={() => handleDelete(row.id)}
                            className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 inline-flex items-center"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-slate-600">
            Showing {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} to{" "}
            {Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-50 inline-flex items-center"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </button>
            <span className="text-sm text-slate-700">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-50 inline-flex items-center"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

