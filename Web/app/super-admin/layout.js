"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Building2,
  Cog,
  DoorOpen,
  House,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  QrCode,
  School,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from "lucide-react";
import {
  getSuperAdminEmail,
  logoutSuperAdmin,
  verifySuperAdminSession,
} from "@/lib/superAdminAuth";

const navItems = [
  { label: "Dashboard", href: "/super-admin/dashboard", icon: LayoutDashboard },
  { label: "Admins", href: "/super-admin/admins", icon: UserCog },
  { label: "Schools / Colleges", href: "/super-admin/colleges", icon: School },
  { label: "Exam Centers", href: "/super-admin/centers", icon: Building2 },
  { label: "Rooms", href: "/super-admin/rooms", icon: DoorOpen },
  { label: "Students", href: "/super-admin/students", icon: Users },
  { label: "Seating Plans", href: "/super-admin/seating", icon: MapPinned },
  { label: "QR Codes", href: "/super-admin/qrcodes", icon: QrCode },
  { label: "Settings", href: "/super-admin/settings", icon: Cog },
];

export default function SuperAdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicAuthRoute = pathname === "/super-admin/login";
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [superAdminEmail, setSuperAdminEmail] = useState("");
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
        const session = await verifySuperAdminSession();
        if (!mounted) return;

        if (!session?.authenticated) {
          router.replace("/super-admin/login");
          return;
        }

        setSuperAdminEmail(session?.superAdmin?.email || getSuperAdminEmail());
        setLoading(false);
      } catch {
        if (!mounted) return;
        setAuthError("Unable to verify super admin session.");
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
    await logoutSuperAdmin();
    router.replace("/super-admin/login");
  }

  if (isPublicAuthRoute) return children;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f5ee]">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-500 border-t-transparent"></div>
            <span className="text-slate-700">Checking super admin session...</span>
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
                <h1 className="text-xl font-bold text-white inline-flex items-center">
                  <ShieldCheck className="h-5 w-5 text-orange-300 mr-2" />
                  SeatSmart Super Admin
                </h1>
                {superAdminEmail ? (
                  <p className="text-xs text-slate-200">{superAdminEmail}</p>
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
                href="/admin/login"
                className="flex items-center space-x-2 px-4 py-2 border border-white/40 text-white rounded-lg hover:bg-white/10 transition-colors font-medium"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Admin Panel</span>
                <span className="sm:hidden">Admin</span>
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
            <Link
              href="/super-admin/health"
              onClick={() => setSidebarOpen(false)}
              className={`
                flex items-center space-x-3 px-4 py-3 rounded-lg border transition-colors font-medium
                ${
                  pathname === "/super-admin/health"
                    ? "bg-orange-50 text-orange-700 border-orange-200"
                    : "text-slate-700 border-transparent hover:bg-slate-50"
                }
              `}
            >
              <Activity className="h-5 w-5" />
              <span>System Health</span>
            </Link>
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
