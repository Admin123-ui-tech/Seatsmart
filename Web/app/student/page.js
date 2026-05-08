"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  LogOut,
  User,
  MapPin,
  GraduationCap,
  BookOpen,
  Building,
  Hash,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getFriendlySupabaseError } from "@/lib/students";
import { apiGet } from "@/lib/api";

export default function StudentPortalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [centerFromQuery, setCenterFromQuery] = useState("");
  const [centerIdFromQuery, setCenterIdFromQuery] = useState("");
  const [authChecking, setAuthChecking] = useState(true);
  const [studentEmail, setStudentEmail] = useState("");
  const [studentName, setStudentName] = useState("");
  const [rollno, setRollno] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [student, setStudent] = useState(null);

  useEffect(() => {
    setCenterFromQuery(searchParams.get("center") || "");
    setCenterIdFromQuery(searchParams.get("centerId") || "");
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;

    async function checkStudentSession() {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!mounted) return;

      if (sessionError || !data?.session) {
        const query = centerFromQuery
          ? `?center=${encodeURIComponent(centerFromQuery)}`
          : centerIdFromQuery
            ? `?centerId=${encodeURIComponent(centerIdFromQuery)}`
            : "";
        router.replace(`/student/login${query}`);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!mounted) return;

      const user = userData?.user;
      const metadata = user?.user_metadata || {};
      const savedRollno = String(metadata?.rollno || "").trim();
      const savedName = String(metadata?.full_name || "").trim();

      setStudentEmail(String(user?.email || ""));
      setStudentName(savedName);
      if (savedRollno) setRollno(savedRollno);
      setAuthChecking(false);
    }

    checkStudentSession().catch(() => {
      if (!mounted) return;
      setAuthChecking(false);
      const query = centerFromQuery
        ? `?center=${encodeURIComponent(centerFromQuery)}`
        : centerIdFromQuery
          ? `?centerId=${encodeURIComponent(centerIdFromQuery)}`
          : "";
      router.replace(`/student/login${query}`);
    });

    return () => {
      mounted = false;
    };
  }, [centerFromQuery, centerIdFromQuery, router]);

  async function handleSearch(event) {
    event.preventDefault();
    setError("");
    setStudent(null);

    if (!rollno.trim()) {
      setError("Please enter your roll number.");
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error("Student session expired. Please sign in again.");
      }

      const data = await apiGet("/api/student-seat", {
        rollno: rollno.trim(),
        center: centerFromQuery,
        centerId: centerIdFromQuery,
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      setStudent(data.student || null);
    } catch (fetchError) {
      setError(
        getFriendlySupabaseError(
          fetchError,
          "No seating details found. Please check your roll number.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    const query = centerFromQuery
      ? `?center=${encodeURIComponent(centerFromQuery)}`
      : centerIdFromQuery
        ? `?centerId=${encodeURIComponent(centerIdFromQuery)}`
        : "";
    router.replace(`/student/login${query}`);
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#f8f5ee] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-500 border-t-transparent"></div>
            <span className="text-slate-700">Checking student session...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f5ee] p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6 border border-slate-200">
          <div className="bg-[#0f2746] p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                  Student Seat Lookup
                </h1>
                <p className="text-slate-200">
                  Enter your roll number to view your exam seating details
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-lg transition-colors font-medium"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              {centerFromQuery ? (
                <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                  <MapPin className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-800 text-sm font-medium">
                    Exam Center: {centerFromQuery}
                  </span>
                </div>
              ) : null}
              {studentEmail ? (
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2">
                  <User className="h-4 w-4 text-slate-600" />
                  <span className="text-slate-700 text-sm">{studentEmail}</span>
                </div>
              ) : null}
              {studentName ? (
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2">
                  <GraduationCap className="h-4 w-4 text-slate-600" />
                  <span className="text-slate-700 text-sm">{studentName}</span>
                </div>
              ) : null}
            </div>

            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={rollno}
                  onChange={(e) => setRollno(e.target.value)}
                  placeholder="Enter your roll number"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-lg"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span>Find Seat</span>
                  </>
                )}
              </button>
            </form>

            {error ? (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-red-700">{error}</p>
              </div>
            ) : null}
          </div>
        </div>

        {student ? (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <div className="bg-orange-500 p-6 text-white">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6" />
                <h2 className="text-xl font-bold">Your Seat Details</h2>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="h-4 w-4 text-slate-600" />
                    <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                      Student Name
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">
                    {student.name || "-"}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Hash className="h-4 w-4 text-slate-600" />
                    <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                      Roll Number
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">
                    {student.rollno || "-"}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <BookOpen className="h-4 w-4 text-slate-600" />
                    <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                      Class
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">
                    {student.class_name || "-"}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <GraduationCap className="h-4 w-4 text-slate-600" />
                    <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                      School / College
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">
                    {student.school_name || "-"}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Building className="h-4 w-4 text-slate-600" />
                    <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                      Exam Center
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">
                    {student.exam_center || "-"}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <MapPin className="h-4 w-4 text-slate-600" />
                    <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                      Room Number
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">
                    {student.room || "-"}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 col-span-full sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-slate-600" />
                    <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                      Seat Number
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">
                    {student.seat || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
