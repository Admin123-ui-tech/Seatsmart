"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import * as XLSX from "xlsx";
import { apiGet, apiPost } from "@/lib/api";
import {
  getFriendlySupabaseError,
  normalizeUploadRow,
  validateStudentRow,
} from "@/lib/students";

function getLocalDuplicates(rows) {
  const seen = new Set();
  const duplicateRollnos = new Set();
  for (const row of rows) {
    const key = `${(row.rollno || "").toLowerCase()}::${(row.exam_center || "").toLowerCase()}`;
    if (seen.has(key)) duplicateRollnos.add(row.rollno || "");
    seen.add(key);
  }
  return [...duplicateRollnos];
}

export default function UploadPage() {
  const [options, setOptions] = useState({
    colleges: [],
    examCenters: [],
  });
  const [selectedCollege, setSelectedCollege] = useState("");
  const [selectedCenter, setSelectedCenter] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rows, setRows] = useState([]);
  const [invalidRows, setInvalidRows] = useState([]);
  const [duplicateRollnos, setDuplicateRollnos] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });

  const validRows = useMemo(
    () =>
      rows.filter((_, idx) => !invalidRows.some((item) => item.index === idx + 1)),
    [rows, invalidRows],
  );

  useEffect(() => {
    loadOptions();
  }, []);

  async function loadOptions() {
    try {
      const payload = await apiGet("/api/students/options");
      setOptions({
        colleges: payload.colleges || [],
        examCenters: payload.examCenters || [],
      });
    } catch {
      setOptions({ colleges: [], examCenters: [] });
    }
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage({ type: "", text: "" });
    setRows([]);
    setInvalidRows([]);
    setDuplicateRollnos([]);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      const mappedRows = rawRows.map(normalizeUploadRow);

      const invalid = [];
      mappedRows.forEach((row, index) => {
        const missing = validateStudentRow(row);
        if (missing.length > 0) invalid.push({ index: index + 1, missing });
      });

      setRows(mappedRows);
      setInvalidRows(invalid);
      setDuplicateRollnos(getLocalDuplicates(mappedRows));

      if (mappedRows.length === 0) {
        setMessage({ type: "error", text: "No rows found in uploaded file." });
      }
    } catch (parseError) {
      setMessage({
        type: "error",
        text: getFriendlySupabaseError(parseError, "Unable to parse uploaded file."),
      });
    }
    setLoading(false);
  }

  async function handleUpload() {
    if (validRows.length === 0) {
      setMessage({ type: "error", text: "No valid rows available to upload." });
      return;
    }

    setUploading(true);
    setMessage({ type: "", text: "" });

    try {
      const payload = await apiPost("/api/students/upload", {
        rows: validRows,
        college_id: selectedCollege || undefined,
        center_id: selectedCenter || undefined,
      });

      setMessage({
        type: "success",
        text: `Uploaded ${payload.inserted || 0} rows. Skipped ${payload.skippedDuplicates || 0} duplicates.`,
      });
      setRows([]);
      setInvalidRows([]);
      setDuplicateRollnos([]);
    } catch (uploadError) {
      setMessage({
        type: "error",
        text: getFriendlySupabaseError(uploadError, "Upload failed."),
      });
    }

    setUploading(false);
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900">Upload Data</h1>
        <p className="text-slate-600 mt-1">
          Upload CSV/Excel with columns: Roll No, Student Name, Room No, Seat
          No, School, Center, Class. Optional: Exam Date, Exam Centre Code,
          Exam Shift, Enrollment Number, DOB.
        </p>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select School/College (Optional)
            </label>
            <select
              value={selectedCollege}
              onChange={(e) => setSelectedCollege(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">Use CSV school column</option>
              {(options.colleges || []).map((college) => (
                <option key={college.id} value={college.id}>
                  {college.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Exam Center (Optional)
            </label>
            <select
              value={selectedCenter}
              onChange={(e) => setSelectedCenter(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">Use CSV center column</option>
              {(options.examCenters || []).map((center) => (
                <option key={center.id} value={center.id}>
                  {center.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label
          htmlFor="student-upload"
          className="block border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:border-orange-400 hover:bg-orange-50/40 transition-colors cursor-pointer"
        >
          {loading ? (
            <div className="inline-flex items-center text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Reading file...
            </div>
          ) : (
            <div className="inline-flex items-center text-slate-700">
              <UploadCloud className="h-5 w-5 mr-2 text-orange-600" />
              Choose CSV/Excel file
            </div>
          )}
          <input
            id="student-upload"
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFile}
            disabled={loading || uploading}
          />
        </label>

        {message.text ? (
          <div
            className={`rounded-lg p-3 text-sm flex items-start space-x-2 ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        ) : null}

        {invalidRows.length > 0 ? (
          <div className="rounded-lg p-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm">
            Invalid rows: {invalidRows.length}. They will be skipped.
          </div>
        ) : null}

        {duplicateRollnos.length > 0 ? (
          <div className="rounded-lg p-3 bg-orange-50 border border-orange-200 text-orange-700 text-sm">
            Duplicate roll numbers in file: {duplicateRollnos.slice(0, 8).join(", ")}
            {duplicateRollnos.length > 8 ? "..." : ""}
          </div>
        ) : null}
      </section>

      {rows.length > 0 ? (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Preview ({rows.length} rows)
            </h2>
            <button
              onClick={handleUpload}
              disabled={uploading || validRows.length === 0}
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium disabled:opacity-60"
            >
              {uploading ? "Uploading..." : `Upload ${validRows.length} Rows`}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Roll No",
                    "Enrollment",
                    "Student Name",
                    "Class",
                    "School",
                    "Center",
                    "Center Code",
                    "Exam Date",
                    "Shift",
                    "DOB",
                    "Room",
                    "Seat",
                  ].map((title) => (
                    <th
                      key={title}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase"
                    >
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((row, idx) => (
                  <tr
                    key={`${row.rollno}-${idx}`}
                    className={`border-t border-slate-100 ${
                      invalidRows.some((item) => item.index === idx + 1) ? "bg-red-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-sm">{row.rollno}</td>
                    <td className="px-4 py-3 text-sm">{row.enrollment_number || "-"}</td>
                    <td className="px-4 py-3 text-sm">{row.name}</td>
                    <td className="px-4 py-3 text-sm">{row.class_name}</td>
                    <td className="px-4 py-3 text-sm">{row.school_name}</td>
                    <td className="px-4 py-3 text-sm">{row.exam_center}</td>
                    <td className="px-4 py-3 text-sm">{row.exam_center_code || "-"}</td>
                    <td className="px-4 py-3 text-sm">{row.exam_date || "-"}</td>
                    <td className="px-4 py-3 text-sm">{row.exam_shift || "-"}</td>
                    <td className="px-4 py-3 text-sm">{row.dob || "-"}</td>
                    <td className="px-4 py-3 text-sm">{row.room}</td>
                    <td className="px-4 py-3 text-sm">{row.seat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
