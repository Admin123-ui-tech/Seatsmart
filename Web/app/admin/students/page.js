"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { getFriendlySupabaseError, toCsv } from "@/lib/students";
import StudentFormModal from "@/components/StudentFormModal";

const PAGE_SIZE = 20;

export default function StudentsPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    center: "",
    school: "",
    className: "",
    room: "",
  });
  const [options, setOptions] = useState({
    centers: [],
    schools: [],
    classes: [],
    rooms: [],
    colleges: [],
    examCenters: [],
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  );

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    loadRows();
  }, [search, filters, page]);

  async function loadOptions() {
    try {
      const payload = await apiGet("/api/students/options");
      setOptions({
        centers: payload.centers || [],
        schools: payload.schools || [],
        classes: payload.classes || [],
        rooms: payload.rooms || [],
        colleges: payload.colleges || [],
        examCenters: payload.examCenters || [],
      });
    } catch {
      setOptions({
        centers: [],
        schools: [],
        classes: [],
        rooms: [],
        colleges: [],
        examCenters: [],
      });
    }
  }

  async function loadRows() {
    setLoading(true);
    setError("");
    try {
      const payload = await apiGet("/api/students", {
        search,
        center: filters.center,
        school: filters.school,
        className: filters.className,
        room: filters.room,
        page,
        pageSize: PAGE_SIZE,
      });
      setRows(payload.rows || []);
      setTotal(payload.total || 0);
    } catch (fetchError) {
      setError(getFriendlySupabaseError(fetchError, "Unable to load students."));
      setRows([]);
      setTotal(0);
    }
    setLoading(false);
  }

  async function handleSaveStudent(payload) {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (payload.id) {
        await apiPost("/api/students/update", payload);
        setSuccess("Student updated successfully.");
      } else {
        await apiPost("/api/students/create", payload);
        setSuccess("Student created successfully.");
      }
      setModalOpen(false);
      setEditingStudent(null);
      await loadRows();
      await loadOptions();
    } catch (saveError) {
      setSuccess("");
      setError(getFriendlySupabaseError(saveError, "Unable to save student."));
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    const proceed = window.confirm("Delete this student record?");
    if (!proceed) return;
    setError("");
    setSuccess("");
    try {
      await apiPost("/api/students/delete", { id });
      await loadRows();
      await loadOptions();
      setSuccess("Student deleted successfully.");
    } catch (deleteError) {
      setSuccess("");
      setError(getFriendlySupabaseError(deleteError, "Unable to delete student."));
    }
  }

  async function handleExport() {
    try {
      const payload = await apiGet("/api/students", {
        search,
        center: filters.center,
        school: filters.school,
        className: filters.className,
        room: filters.room,
        all: true,
      });
      const csv = toCsv(payload.rows || []);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "students.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(getFriendlySupabaseError(exportError, "Unable to export students."));
    }
  }

  function openCreate() {
    setEditingStudent(null);
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditingStudent(row);
    setModalOpen(true);
  }

  function setFilter(key, value) {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students</h1>
          <p className="text-slate-600 mt-1">
            Manage student records with filters and bulk export
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 inline-flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 inline-flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </button>
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div className="xl:col-span-2 relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search roll no, name, school, center..."
              className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2"
            />
          </div>
          <select
            value={filters.center}
            onChange={(e) => setFilter("center", e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2"
          >
            <option value="">All Centers</option>
            {options.centers.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            value={filters.school}
            onChange={(e) => setFilter("school", e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2"
          >
            <option value="">All Schools</option>
            {options.schools.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            value={filters.className}
            onChange={(e) => setFilter("className", e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2"
          >
            <option value="">All Classes</option>
            {options.classes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            value={filters.room}
            onChange={(e) => setFilter("room", e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2"
          >
            <option value="">All Rooms</option>
            {options.rooms.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Roll No",
                  "Student Name",
                  "Class",
                  "School / College",
                  "Exam Center",
                  "Room",
                  "Seat",
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
                    No students found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-sm text-slate-900">{row.rollno}</td>
                    <td className="px-4 py-3 text-sm text-slate-900">{row.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.class_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {row.display_school}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {row.display_center}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.room}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.seat}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(row)}
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

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-slate-600">
            Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of{" "}
            {total}
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

      <StudentFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingStudent(null);
        }}
        onSave={handleSaveStudent}
        loading={saving}
        title={editingStudent ? "Edit Student" : "Add Student"}
        options={options}
        initialValue={editingStudent}
      />
    </div>
  );
}
