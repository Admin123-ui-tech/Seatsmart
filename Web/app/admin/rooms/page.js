"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, DoorOpen, Plus, Search } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { getFriendlySupabaseError } from "@/lib/students";

const emptyForm = {
  id: "",
  center_id: "",
  room_no: "",
  floor: "",
  capacity: "",
  status: "",
};

export default function RoomsPage() {
  const [rows, setRows] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [centerFilter, setCenterFilter] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    loadCenters();
  }, []);

  useEffect(() => {
    loadRows();
  }, [search, centerFilter]);

  async function loadCenters() {
    try {
      const payload = await apiGet("/api/students/options");
      setCenters(payload.examCenters || []);
    } catch {
      setCenters([]);
    }
  }

  async function loadRows() {
    setLoading(true);
    setError("");
    try {
      const payload = await apiGet("/api/rooms", {
        search,
        centerId: centerFilter,
      });
      setRows(payload.rows || []);
    } catch (fetchError) {
      setError(getFriendlySupabaseError(fetchError, "Unable to load rooms."));
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
      center_id: row.center_id || "",
      room_no: row.room_no || "",
      floor: row.floor || "",
      capacity: row.capacity ?? "",
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
        await apiPost("/api/rooms/update", form);
        setSuccess("Room updated successfully.");
      } else {
        await apiPost("/api/rooms/create", form);
        setSuccess("Room created successfully.");
      }
      resetForm();
      await loadRows();
    } catch (saveError) {
      setSuccess("");
      setError(getFriendlySupabaseError(saveError, "Unable to save room."));
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    const proceed = window.confirm("Delete this room?");
    if (!proceed) return;
    setError("");
    setSuccess("");
    try {
      await apiPost("/api/rooms/delete", { id });
      await loadRows();
      setSuccess("Room deleted successfully.");
    } catch (deleteError) {
      const message = getFriendlySupabaseError(deleteError, "Unable to delete room.");
      const linkedToStudents = String(message)
        .toLowerCase()
        .includes("linked to students");

      if (linkedToStudents) {
        const forceProceed = window.confirm(
          "This room is linked to students. Delete room and unassign those students from this room?",
        );

        if (!forceProceed) {
          setError(message);
          return;
        }

        try {
          const result = await apiPost("/api/rooms/delete", { id, force: true });
          await loadRows();
          const unlinkedCount = Number(result?.unlinked_students || 0);
          setSuccess(
            unlinkedCount > 0
              ? `Room deleted. ${unlinkedCount} student record(s) were unassigned from this room.`
              : "Room deleted successfully.",
          );
          return;
        } catch (forceDeleteError) {
          setSuccess("");
          setError(
            getFriendlySupabaseError(forceDeleteError, "Unable to delete room."),
          );
          return;
        }
      }

      setSuccess("");
      setError(message);
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900">Rooms</h1>
        <p className="text-slate-600 mt-1">
          Add and manage center-wise room allocation
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
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search room by room no, floor, center..."
              className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2"
            />
          </div>
          <select
            value={centerFilter}
            onChange={(e) => setCenterFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2"
          >
            <option value="">Filter by Exam Center (All)</option>
            {centers.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 inline-flex items-center">
          <Plus className="h-4 w-4 mr-2 text-orange-600" />
          {editing ? "Edit Room" : "Add Room"}
        </h2>
        <form onSubmit={handleSave} className="grid md:grid-cols-3 gap-4">
          <select
            required
            value={form.center_id}
            onChange={(e) => setForm((prev) => ({ ...prev, center_id: e.target.value }))}
            className="border border-slate-300 rounded-lg px-3 py-2"
          >
            <option value="">Select Exam Center</option>
            {centers.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </select>
          <input
            required
            value={form.room_no}
            onChange={(e) => setForm((prev) => ({ ...prev, room_no: e.target.value }))}
            placeholder="Room No"
            className="border border-slate-300 rounded-lg px-3 py-2"
          />
          <input
            value={form.floor}
            onChange={(e) => setForm((prev) => ({ ...prev, floor: e.target.value }))}
            placeholder="Floor"
            className="border border-slate-300 rounded-lg px-3 py-2"
          />
          <input
            type="number"
            min={0}
            value={form.capacity}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                capacity: e.target.value === "" ? "" : Number(e.target.value),
              }))
            }
            placeholder="Capacity"
            className="border border-slate-300 rounded-lg px-3 py-2"
          />
          <select
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            className="border border-slate-300 rounded-lg px-3 py-2"
          >
            <option value="">Select Status (Default: Active)</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
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
            <DoorOpen className="h-4 w-4 mr-2 text-orange-600" />
            Rooms
          </h2>
          <span className="text-sm text-slate-500">{rows.length} rooms</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {["Center", "Room", "Floor", "Capacity", "Students", "Status", "Actions"].map(
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
                    No rooms found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-sm text-slate-900">{row.center_name || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.room_no}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.floor || "-"}</td>
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
