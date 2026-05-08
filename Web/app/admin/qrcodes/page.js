"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Copy,
  Download,
  Loader2,
  Printer,
  QrCode,
  Search,
} from "lucide-react";
import QRCode from "qrcode";
import { apiGet } from "@/lib/api";
import { getFriendlySupabaseError } from "@/lib/students";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function resolveQrBaseUrl() {
  const configuredBase = normalizeBaseUrl(
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_WEB_URL,
  );
  if (configuredBase) return configuredBase;

  if (typeof window === "undefined") return "";

  const host = window.location.hostname;
  if (LOCAL_HOSTS.has(host)) return "";

  return normalizeBaseUrl(window.location.origin);
}

export default function QRCodesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState("");
  const [centers, setCenters] = useState([]);
  const [baseUrl, setBaseUrl] = useState("");
  const [qrMap, setQrMap] = useState({});

  useEffect(() => {
    const resolvedBaseUrl = resolveQrBaseUrl();
    setBaseUrl(resolvedBaseUrl);
    if (!resolvedBaseUrl) {
      setWarning(
        "Set NEXT_PUBLIC_SITE_URL in Web/.env.local to generate shareable QR links (example: https://yourdomain.com).",
      );
    } else {
      setWarning("");
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!baseUrl || centers.length === 0) return;

    let mounted = true;
    async function generate() {
      const entries = await Promise.all(
        centers.map(async (center) => {
          const centerValue = center.name || center.center_name || "";
          const link = `${baseUrl}/student?center=${encodeURIComponent(centerValue)}`;
          const dataUrl = await QRCode.toDataURL(link, { width: 240, margin: 1 });
          return [center.id, { link, dataUrl }];
        }),
      );
      if (mounted) {
        setQrMap(Object.fromEntries(entries));
      }
    }

    generate().catch((qrError) => {
      if (!mounted) return;
      setError(getFriendlySupabaseError(qrError, "Unable to generate QR codes."));
    });

    return () => {
      mounted = false;
    };
  }, [baseUrl, centers]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const payload = await apiGet("/api/exam-centers");
      const primaryRows = payload.rows || [];

      if (primaryRows.length > 0) {
        setCenters(primaryRows);
        setLoading(false);
        return;
      }

      // Fallback: derive centers from uploaded students so QR flow still works
      // even before explicit exam center master data is created.
      const legacyPayload = await apiGet("/api/centers");
      const legacyRows = (legacyPayload.rows || []).map((row) => ({
        id: `legacy-${row.center}`,
        name: row.center,
        center_name: row.center,
        college_name: "Unassigned",
      }));
      setCenters(legacyRows);
    } catch (fetchError) {
      setError(getFriendlySupabaseError(fetchError, "Unable to load exam centers."));
      setCenters([]);
    }
    setLoading(false);
  }

  const filteredCenters = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return centers;
    return centers.filter((center) => {
      const haystack = `${center.name || ""} ${center.college_name || ""}`.toLowerCase();
      return haystack.includes(value);
    });
  }, [centers, search]);

  async function copyLink(link, id) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(id);
      setTimeout(() => setCopied(""), 1200);
    } catch {
      setError("Unable to copy link.");
    }
  }

  function printQr(centerName, dataUrl) {
    const printWindow = window.open("", "_blank", "width=600,height=600");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head><title>${centerName} QR</title></head>
        <body style="font-family:Arial;padding:20px;text-align:center">
          <h2>${centerName}</h2>
          <img src="${dataUrl}" style="width:280px;height:280px" />
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900">QR Codes</h1>
        <p className="text-slate-600 mt-1">
          Generate center-wise QR codes for instant student seat lookup
        </p>
      </section>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {warning ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{warning}</span>
        </div>
      ) : null}

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="relative max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search center / college..."
            className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2"
          />
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        {loading ? (
          <div className="py-12 text-slate-600 inline-flex items-center">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading centers...
          </div>
        ) : filteredCenters.length === 0 ? (
          <p className="text-slate-500 py-8">No centers found.</p>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredCenters.map((center) => {
              const qr = qrMap[center.id];
              const centerName = center.name || center.center_name || "-";
              return (
                <div
                  key={center.id}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50/50"
                >
                  <h3 className="font-semibold text-slate-900">{centerName}</h3>
                  <p className="text-sm text-slate-600 mb-3">
                    {center.college_name || "Unassigned"}
                  </p>
                  <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-center">
                    {qr?.dataUrl ? (
                      <img
                        src={qr.dataUrl}
                        alt={`QR for ${centerName}`}
                        className="w-44 h-44"
                      />
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => copyLink(qr?.link || "", center.id)}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm inline-flex items-center"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      {copied === center.id ? "Copied" : "Copy Link"}
                    </button>
                    <a
                      href={qr?.dataUrl || "#"}
                      download={`${centerName}-qr.png`}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm inline-flex items-center"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </a>
                    <button
                      onClick={() => printQr(centerName, qr?.dataUrl || "")}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm inline-flex items-center"
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      Print
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-slate-500 break-all inline-flex items-center">
                    <QrCode className="h-3 w-3 mr-1" />
                    {qr?.link || "Generating link..."}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
