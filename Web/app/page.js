import Link from "next/link";
import {
  ArrowRight,
  Crown,
  GraduationCap,
  Shield,
  UserRound,
} from "lucide-react";

const cards = [
  {
    title: "Admin Panel",
    description:
      "Manage schools, centers, rooms, students, seating plans, and QR codes from one dashboard.",
    href: "/admin/login",
    buttonLabel: "Admin Login",
    icon: Shield,
    iconWrapClass: "bg-[#0f2746]/10",
    iconClass: "text-[#0f2746]",
    buttonClass: "bg-orange-500 hover:bg-orange-600",
  },
  {
    title: "Student Panel",
    description:
      "Sign in to quickly check your room and seat details using roll number or QR link.",
    href: "/student/login",
    buttonLabel: "Student Portal",
    icon: UserRound,
    iconWrapClass: "bg-orange-100",
    iconClass: "text-orange-600",
    buttonClass: "bg-[#0f2746] hover:bg-[#17365d]",
  },
  {
    title: "Super Admin Panel",
    description:
      "Manage platform-wide settings, admins, colleges, centers, and complete system access.",
    href: "/super-admin/login",
    buttonLabel: "Super Admin Login",
    icon: Crown,
    iconWrapClass: "bg-[#0f2746]/10",
    iconClass: "text-[#0f2746]",
    buttonClass: "bg-orange-500 hover:bg-orange-600",
  },
];

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="group bg-white rounded-2xl shadow-lg border border-slate-200 p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className={`w-14 h-14 rounded-xl ${card.iconWrapClass} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105`}
                >
                  <Icon className={`h-7 w-7 ${card.iconClass}`} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{card.title}</h2>
                <p className="text-slate-600 mt-2 mb-5">{card.description}</p>
                <Link
                  href={card.href}
                  className={`inline-flex items-center justify-center w-full py-3 rounded-lg text-white font-semibold transition-colors ${card.buttonClass}`}
                >
                  <span>{card.buttonLabel}</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
