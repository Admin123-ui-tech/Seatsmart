import Link from "next/link";
import { ArrowRight, GraduationCap, Shield, UserRound } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f8f5ee]">
      <header className="bg-[#0f2746] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <div className="flex items-center space-x-2">
            <GraduationCap className="h-8 w-8 text-orange-300" />
            <span className="text-2xl font-bold">SeatSmart</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900">
            Exam Seating Plan System
          </h1>
          <p className="text-slate-600 mt-3 text-lg">
            Admin uploads data, system generates QR codes, and students find seat
            details instantly.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-7">
            <div className="w-14 h-14 rounded-xl bg-[#0f2746]/10 flex items-center justify-center mb-4">
              <Shield className="h-7 w-7 text-[#0f2746]" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Admin Panel</h2>
            <p className="text-slate-600 mt-2 mb-5">
              Manage schools, centers, rooms, students, seating plans, and QR
              codes from one dashboard.
            </p>
            <Link
              href="/admin/login"
              className="inline-flex items-center justify-center w-full py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors"
            >
              <span>Admin Login</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-7">
            <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center mb-4">
              <UserRound className="h-7 w-7 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Student Panel</h2>
            <p className="text-slate-600 mt-2 mb-5">
              Sign in to quickly check your room and seat details using roll
              number or QR link.
            </p>
            <Link
              href="/student/login"
              className="inline-flex items-center justify-center w-full py-3 rounded-lg bg-[#0f2746] hover:bg-[#17365d] text-white font-semibold transition-colors"
            >
              <span>Student Portal</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
