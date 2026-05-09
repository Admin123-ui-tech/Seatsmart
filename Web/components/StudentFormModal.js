"use client";

import { useEffect, useState } from "react";

const emptyForm = {
  id: "",
  rollno: "",
  enrollment_number: "",
  name: "",
  class_name: "",
  school_name: "",
  exam_center: "",
  exam_center_code: "",
  exam_date: "",
  exam_shift: "",
  dob: "",
  room: "",
  seat: "",
  college_id: "",
  center_id: "",
};

export default function StudentFormModal({
  open,
  onClose,
  onSave,
  title,
  loading,
  options,
  initialValue,
}) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyForm,
      ...(initialValue || {}),
      college_id: initialValue?.college_id || "",
      center_id: initialValue?.center_id || initialValue?.exam_center_id || "",
    });
  }, [open, initialValue]);

  if (!open) return null;

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const selectedCollege = (options?.colleges || []).find(
      (item) => item.id === form.college_id,
    );
    const selectedCenter = (options?.examCenters || []).find(
      (item) => item.id === form.center_id,
    );

    await onSave({
      ...form,
      enrollment_number: form.enrollment_number || form.rollno || "",
      school_name: form.school_name || selectedCollege?.name || "",
      exam_center: form.exam_center || selectedCenter?.name || "",
      college_id: form.college_id || undefined,
      center_id: form.center_id || undefined,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 p-4 flex items-center justify-center">
      <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 text-sm"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Roll No
              </label>
              <input
                required
                value={form.rollno}
                onChange={(e) => update("rollno", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Enrollment Number (Optional)
              </label>
              <input
                value={form.enrollment_number}
                onChange={(e) => update("enrollment_number", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Student Name
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Class
              </label>
              <input
                required
                value={form.class_name}
                onChange={(e) => update("class_name", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                School / College
              </label>
              <input
                required
                value={form.school_name}
                onChange={(e) => update("school_name", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Exam Date (Optional)
              </label>
              <input
                type="date"
                value={form.exam_date || ""}
                onChange={(e) => update("exam_date", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Exam Shift (Optional)
              </label>
              <input
                value={form.exam_shift || ""}
                onChange={(e) => update("exam_shift", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                DOB (Optional)
              </label>
              <input
                type="date"
                value={form.dob || ""}
                onChange={(e) => update("dob", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Exam Center
              </label>
              <input
                required
                value={form.exam_center}
                onChange={(e) => update("exam_center", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Exam Center Code (Optional)
              </label>
              <input
                value={form.exam_center_code || ""}
                onChange={(e) => update("exam_center_code", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Room No
              </label>
              <input
                required
                value={form.room}
                onChange={(e) => update("room", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Seat No
              </label>
              <input
                required
                value={form.seat}
                onChange={(e) => update("seat", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                College Entity (Optional)
              </label>
              <select
                value={form.college_id}
                onChange={(e) => update("college_id", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              >
                <option value="">None</option>
                {(options?.colleges || []).map((college) => (
                  <option key={college.id} value={college.id}>
                    {college.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Center Entity (Optional)
              </label>
              <select
                value={form.center_id}
                onChange={(e) => update("center_id", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              >
                <option value="">None</option>
                {(options?.examCenters || []).map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
