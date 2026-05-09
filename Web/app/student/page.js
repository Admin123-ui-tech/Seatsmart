"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, GraduationCap, LogIn, Search } from "lucide-react";

function StudentEntryContent() {
  const searchParams = useSearchParams();
  const center = searchParams.get("center") || "";
  const centerId = searchParams.get("centerId") || "";
  const centerCode = searchParams.get("centerCode") || "";

  const forwardQuery = center
    ? `?center=${encodeURIComponent(center)}`
    : centerCode
      ? `?centerCode=${encodeURIComponent(centerCode)}`
      : centerId
        ? `?centerId=${encodeURIComponent(centerId)}`
        : "";

  return (
    <div className="min-h-screen bg-[#f8f5ee] p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-[#0f2746] p-6 text-white text-center">
            <div className="inline-flex p-3 rounded-xl bg-white/15 mb-3">
              <GraduationCap className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">Student Portal</h1>
            <p className="text-slate-200 text-sm mt-1">
              Choose how you want to access your seating details
            </p>
          </div>

          <div className="p-6 grid gap-4 sm:grid-cols-2">
            <Link
              href={`/student/login${forwardQuery}`}
              className="group rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all p-5"
            >
              <div className="w-11 h-11 rounded-lg bg-[#0f2746]/10 text-[#0f2746] flex items-center justify-center mb-3">
                <LogIn className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Student Login</h2>
              <p className="text-sm text-slate-600 mt-1">
                Sign in with your student account to view your personal seat details.
              </p>
              <div className="mt-4 inline-flex items-center text-orange-600 font-medium text-sm">
                Continue
                <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </Link>

            <Link
              href={`/student/quick-check${forwardQuery}`}
              className="group rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all p-5"
            >
              <div className="w-11 h-11 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center mb-3">
                <Search className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Quick Seating Check</h2>
              <p className="text-sm text-slate-600 mt-1">
                Search with exam details and roll number without account login.
              </p>
              <div className="mt-4 inline-flex items-center text-orange-600 font-medium text-sm">
                Continue
                <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function StudentEntryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f5ee]" />}>
      <StudentEntryContent />
    </Suspense>
  );
}

