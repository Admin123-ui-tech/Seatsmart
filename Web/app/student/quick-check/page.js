"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, House, LogIn, Search } from "lucide-react";
import { apiPost } from "@/lib/api";
import { getFriendlySupabaseError } from "@/lib/students";

const emptyResult = null;

function formatDisplayDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString();
}

function normalizeIsoDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const ddmmyyyy = raw.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function StudentQuickCheckContent() {
  const searchParams = useSearchParams();
  const center = searchParams.get("center") || "";
  const centerCode = searchParams.get("centerCode") || "";
  const centerId = searchParams.get("centerId") || "";
  const initialCenterCode = centerCode || center;
  const loginQuery = center
    ? `?center=${encodeURIComponent(center)}`
    : centerCode
      ? `?centerCode=${encodeURIComponent(centerCode)}`
      : centerId
        ? `?centerId=${encodeURIComponent(centerId)}`
        : "";

  const [essential, setEssential] = useState({
    exam_date: "",
    exam_center_code: initialCenterCode,
    enrollment_or_rollno: "",
  });
  const [optional, setOptional] = useState({
    exam_date: "",
    exam_center_code: initialCenterCode,
    exam_shift: "",
    enrollment_or_rollno: "",
    name: "",
    dob: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [result, setResult] = useState(emptyResult);
  const [activeTab, setActiveTab] = useState("seating");

  const resolvedCenterHint = useMemo(
    () => centerCode || center || "",
    [centerCode, center],
  );

  function updateEssential(key, value) {
    setEssential((prev) => ({ ...prev, [key]: value }));
  }

  function updateOptional(key, value) {
    setOptional((prev) => ({ ...prev, [key]: value }));
  }

  function syncOptionalFromEssential() {
    setOptional((prev) => ({
      ...prev,
      exam_date: essential.exam_date || prev.exam_date,
      exam_center_code: essential.exam_center_code || prev.exam_center_code,
      enrollment_or_rollno:
        essential.enrollment_or_rollno || prev.enrollment_or_rollno,
    }));
  }

  async function handleEssentialSubmit(event) {
    event.preventDefault();
    setError("");
    setInfo("");
    setResult(null);
    setActiveTab("seating");

    const examDate = normalizeIsoDate(essential.exam_date);
    const centerInput = String(essential.exam_center_code || "").trim();
    const rollInput = String(essential.enrollment_or_rollno || "").trim();

    if (!examDate) {
      setError("Exam Date is required.");
      return;
    }
    if (!centerInput) {
      setError("Exam Centre Code is required.");
      return;
    }
    if (!rollInput) {
      setError("Enrollment Number / Roll No is required.");
      return;
    }

    setLoading(true);
    try {
      const payload = await apiPost("/api/student-seat/quick-check", {
        mode: "essential",
        exam_date: examDate,
        exam_center_code: centerInput,
        enrollment_number: rollInput,
        rollno: rollInput,
        center: center,
        centerCode: centerCode,
        centerId: centerId,
      });

      if (payload?.status === "multiple") {
        setShowOptional(true);
        syncOptionalFromEssential();
        setInfo(
          payload.message ||
            "Multiple records found. Please enter optional details to verify.",
        );
      } else {
        setShowOptional(false);
        setResult(payload.student || null);
      }
    } catch (submitError) {
      setShowOptional(false);
      setError(
        getFriendlySupabaseError(
          submitError,
          "No seating details found. Please check your details.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleOptionalSubmit(event) {
    event.preventDefault();
    setError("");
    setInfo("");
    setResult(null);
    setActiveTab("seating");

    const examDate = normalizeIsoDate(optional.exam_date);
    const dobDate = normalizeIsoDate(optional.dob);
    const centerInput = String(optional.exam_center_code || "").trim();
    const rollInput = String(optional.enrollment_or_rollno || "").trim();
    const nameInput = String(optional.name || "").trim();

    if (!examDate) {
      setError("Exam Date is required.");
      return;
    }
    if (!centerInput) {
      setError("Exam Centre Code is required.");
      return;
    }
    if (!rollInput) {
      setError("Enrollment Number / Roll No is required.");
      return;
    }
    if (!nameInput) {
      setError("Name is required for optional verification.");
      return;
    }

    setLoading(true);
    try {
      const payload = await apiPost("/api/student-seat/quick-check", {
        mode: "optional",
        exam_date: examDate,
        exam_center_code: centerInput,
        exam_shift: String(optional.exam_shift || "").trim(),
        enrollment_number: rollInput,
        rollno: rollInput,
        name: nameInput,
        dob: dobDate || null,
        center: center,
        centerCode: centerCode,
        centerId: centerId,
      });

      if (payload?.status === "multiple") {
        setInfo(
          payload.message ||
            "Multiple records still found. Please refine optional details.",
        );
      } else {
        setResult(payload.student || null);
      }
    } catch (submitError) {
      setError(
        getFriendlySupabaseError(
          submitError,
          "No seating details found. Please check your details.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  const tabButtonClass = (tab) =>
    `flex-1 py-3 text-sm font-medium transition-colors ${
      activeTab === tab
        ? "bg-[#0f2746] text-white"
        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
    }`;

  return (
    <div className="min-h-screen bg-[#f8f5ee] p-4">
      <div className="max-w-xl mx-auto space-y-6 pb-10">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-[#0f2746] p-6 text-white">
            <h1 className="text-xl sm:text-2xl font-bold">Quick Seating Check</h1>
            <p className="text-slate-200 text-sm mt-1">
              Find your seat instantly with exam details
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/student/login${loginQuery}`}
                className="inline-flex items-center px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-sm"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Student Login
              </Link>
              <Link
                href="/"
                className="inline-flex items-center px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
              >
                <House className="h-4 w-4 mr-2" />
                Home
              </Link>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {resolvedCenterHint ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                Center from QR: <span className="font-medium">{resolvedCenterHint}</span>
              </div>
            ) : null}

            <form onSubmit={handleEssentialSubmit} className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Essential Details</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Exam Date
                </label>
                <input
                  type="date"
                  value={essential.exam_date}
                  onChange={(e) => updateEssential("exam_date", e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Exam Centre Code
                </label>
                <input
                  value={essential.exam_center_code}
                  onChange={(e) =>
                    updateEssential("exam_center_code", e.target.value)
                  }
                  placeholder="e.g. D-1058"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Enrollment Number / Roll No
                </label>
                <input
                  value={essential.enrollment_or_rollno}
                  onChange={(e) =>
                    updateEssential("enrollment_or_rollno", e.target.value)
                  }
                  placeholder="Enter enrollment/roll number"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg py-3 transition-colors disabled:opacity-60 inline-flex items-center justify-center"
              >
                <Search className="h-4 w-4 mr-2" />
                {loading ? "Checking..." : "Seating Plan"}
              </button>
            </form>

            {showOptional ? (
              <form onSubmit={handleOptionalSubmit} className="space-y-4 pt-2">
                <h2 className="text-lg font-semibold text-slate-900">Optional Details</h2>
                <p className="text-sm text-slate-600">
                  Add extra details to verify the correct student record.
                </p>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Exam Date
                  </label>
                  <input
                    type="date"
                    value={optional.exam_date}
                    onChange={(e) => updateOptional("exam_date", e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Exam Centre Code
                  </label>
                  <input
                    value={optional.exam_center_code}
                    onChange={(e) =>
                      updateOptional("exam_center_code", e.target.value)
                    }
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Exam Shift
                  </label>
                  <input
                    value={optional.exam_shift}
                    onChange={(e) => updateOptional("exam_shift", e.target.value)}
                    placeholder="Morning / Afternoon"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Enrollment Number / Roll No
                  </label>
                  <input
                    value={optional.enrollment_or_rollno}
                    onChange={(e) =>
                      updateOptional("enrollment_or_rollno", e.target.value)
                    }
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Name
                  </label>
                  <input
                    value={optional.name}
                    onChange={(e) => updateOptional("name", e.target.value)}
                    placeholder="Enter student name"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    DOB
                  </label>
                  <input
                    type="date"
                    value={optional.dob}
                    onChange={(e) => updateOptional("dob", e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg py-3 transition-colors disabled:opacity-60 inline-flex items-center justify-center"
                >
                  <Search className="h-4 w-4 mr-2" />
                  {loading ? "Checking..." : "Seating Plan"}
                </button>
              </form>
            ) : null}

            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            {info ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{info}</span>
              </div>
            ) : null}
          </div>
        </section>

        {result ? (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="bg-orange-500 px-6 py-4 text-white">
              <h2 className="text-lg font-semibold inline-flex items-center">
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Seating Details
              </h2>
            </div>

            <div className="p-6 pb-20">
              {activeTab === "seating" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    ["Student Name", result.name],
                    ["Roll No", result.rollno],
                    [
                      "Enrollment Number",
                      result.enrollment_number || result.rollno || "-",
                    ],
                    ["Class", result.class_name],
                    ["School / College", result.school_name],
                    ["Exam Date", formatDisplayDate(result.exam_date)],
                    ["Exam Shift", result.exam_shift || "-"],
                    ["Exam Centre Code", result.exam_center_code || "-"],
                    ["Exam Center", result.exam_center],
                    ["Room No", result.room],
                    ["Seat No", result.seat],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {label}
                      </p>
                      <p className="text-slate-900 font-semibold mt-1">{value || "-"}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {activeTab === "datesheet" ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Exam Date
                    </p>
                    <p className="text-slate-900 font-semibold mt-1">
                      {formatDisplayDate(result.exam_date)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Shift
                    </p>
                    <p className="text-slate-900 font-semibold mt-1">
                      {result.exam_shift || "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Centre
                    </p>
                    <p className="text-slate-900 font-semibold mt-1">
                      {result.exam_center_code || "-"} / {result.exam_center || "-"}
                    </p>
                  </div>
                </div>
              ) : null}

              {activeTab === "note" ? (
                <div className="space-y-2 text-sm text-slate-700">
                  <p>- Reach exam center on time.</p>
                  <p>- Carry admit card and valid ID card.</p>
                  <p>- Check room number and seat number carefully.</p>
                  <p>- Follow all instructions from the exam center team.</p>
                </div>
              ) : null}
            </div>

            <div className="sticky bottom-0 border-t border-slate-200 bg-white flex">
              <button
                onClick={() => setActiveTab("seating")}
                className={tabButtonClass("seating")}
              >
                Seating Plan
              </button>
              <button
                onClick={() => setActiveTab("datesheet")}
                className={tabButtonClass("datesheet")}
              >
                Datesheet
              </button>
              <button
                onClick={() => setActiveTab("note")}
                className={tabButtonClass("note")}
              >
                Exam Note
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export default function StudentQuickCheckPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f5ee]" />}>
      <StudentQuickCheckContent />
    </Suspense>
  );
}

