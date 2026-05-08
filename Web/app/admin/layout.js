"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Building2,
  Cog,
  House,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  QrCode,
  School,
  Upload,
  Users,
  X,
  DoorOpen,
} from "lucide-react";
import { getAdminEmail, logoutAdmin, verifyAdminSession } from "@/lib/adminAuth";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Schools / Colleges", href: "/admin/colleges", icon: School },
  { label: "Upload Data", href: "/admin/upload", icon: Upload },
  { label: "Students", href: "/admin/students", icon: Users },
  { label: "Seating Plan", href: "/admin/seating", icon: MapPinned },
  { label: "QR Codes", href: "/admin/qrcodes", icon: QrCode },
  { label: "Exam Centers", href: "/admin/centers", icon: Building2 },
  { label: "Rooms", href: "/admin/rooms", icon: DoorOpen },
  { label: "Settings", href: "/admin/settings", icon: Cog },
  { label: "System Health", href: "/admin/health", icon: Activity },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicAuthRoute =
    pathname === "/admin/login" ||
    pathname === "/admin/signup" ||
    pathname === "/admin/forgot-password";
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isPublicAuthRoute) {
      setLoading(false);
      setAuthError("");
      return;
    }

    let mounted = true;
    async function checkSession() {
      try {
        const session = await verifyAdminSession();
        if (!mounted) return;

        if (!session?.authenticated) {
          router.replace("/admin/login");
          return;
        }

        setAdminEmail(session?.admin?.email || getAdminEmail());
        setLoading(false);
      } catch {
        if (!mounted) return;
        setAuthError("Unable to verify admin session.");
        setLoading(false);
      }
    }

    checkSession();
    return () => {
      mounted = false;
    };
  }, [isPublicAuthRoute, router]);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  async function handleSignOut() {
    await logoutAdmin();
    router.replace("/admin/login");
  }

  if (isPublicAuthRoute) return children;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f5ee]">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-500 border-t-transparent"></div>
            <span className="text-slate-700">Checking admin session...</span>
          </div>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f5ee] p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="text-red-700 text-center">{authError}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f5ee]">
      <header className="bg-[#0f2746] border-b border-slate-800 shadow-sm sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="lg:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">SeatSmart Admin</h1>
                {adminEmail ? (
                  <p className="text-xs text-slate-200">{adminEmail}</p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Link
                href="/"
                className="flex items-center space-x-2 px-4 py-2 border border-white/40 text-white rounded-lg hover:bg-white/10 transition-colors font-medium"
              >
                <House className="h-4 w-4" />
                <span>Home</span>
              </Link>
              <Link
                href="/student/login"
                className="flex items-center space-x-2 px-4 py-2 border border-white/40 text-white rounded-lg hover:bg-white/10 transition-colors font-medium"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Student Panel</span>
                <span className="sm:hidden">Student</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex max-w-[1600px] mx-auto">
        <aside
          className={`
            fixed lg:sticky inset-y-0 lg:inset-y-auto left-0 lg:top-16 z-50 lg:z-30 w-72 lg:h-[calc(100vh-4rem)] lg:self-start lg:shrink-0 bg-white border-r border-slate-200 transform transition-transform duration-300 lg:translate-x-0
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <div className="h-16 lg:hidden flex items-center justify-between px-4 border-b border-slate-200">
            <span className="font-semibold text-slate-800">Menu</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded text-slate-600 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)] lg:h-full">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-lg border transition-colors font-medium
                    ${
                      active
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : "text-slate-700 border-transparent hover:bg-slate-50"
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {sidebarOpen ? (
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
