"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { LocationMap } from "@/components/maps/location-map";
import {
  DataTable,
  PageHeader,
  SectionCard,
  StatPill,
  Td,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Ban,
  Check,
  Copy,
  ExternalLink,
  MapPin,
  RefreshCw,
  Upload,
} from "lucide-react";

interface InvestigationDetail {
  investigation: {
    id: string;
    title: string;
    caseReference: string;
    description: string;
    priority: string;
    investigationType: string;
    status: string;
    locationRequired: boolean;
    maximumViews: number;
    notes: string;
    aiAnalysis?: {
      riskIndicator?: string | null;
      summary?: string | null;
      indicators?: string[];
      humanReviewStatus?: string;
      disclaimer?: string;
    };
    createdAt: string;
  };
  images: Array<{ id: string; originalFilename: string; sizeBytes: number }>;
  links: Array<{
    id: string;
    shortCode: string;
    status: string;
    expiresAt: string;
    maximumViews: number;
    currentViews: number;
    locationRequired: boolean;
    lastAccessAt?: string;
  }>;
  events: Array<{
    id: string;
    eventType: string;
    consentStatus: string;
    accuracy?: number;
    browser?: string | null;
    operatingSystem?: string | null;
    deviceCategory?: string | null;
    city?: string | null;
    country?: string | null;
    address?: string | null;
    approximateLocation?: string | null;
    timestamp: string;
  }>;
}

type LocationRow = {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string | null;
  houseNumber?: string | null;
  street?: string | null;
  postcode?: string | null;
  city?: string | null;
  country?: string | null;
  capturedAt: string;
};

type CaptureRow = {
  id: string;
  facingMode?: string | null;
  width?: number | null;
  height?: number | null;
  sizeBytes: number;
  capturedAt: string;
  deviceCategory?: string | null;
  browser?: string | null;
  operatingSystem?: string | null;
  thumbnailUrl: string;
  imageUrl: string;
};

export default function InvestigationDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<InvestigationDetail | null>(null);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [captures, setCaptures] = useState<CaptureRow[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/investigations/${params.id}`);
    if (!res.ok) {
      setError("Unable to load investigation");
      return;
    }
    const json = await res.json();
    setData(json);
    const [locRes, capRes] = await Promise.all([
      fetch(`/api/investigations/${params.id}/locations`),
      fetch(`/api/investigations/${params.id}/captures`),
    ]);
    if (locRes.ok) {
      const locJson = await locRes.json();
      setLocations(locJson.locations || []);
    }
    if (capRes.ok) {
      const capJson = await capRes.json();
      setCaptures(capJson.captures || []);
    }
  }, [params.id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    setError("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/investigations/${params.id}/images`, {
      method: "POST",
      body: form,
    });
    setUploading(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error || "Upload failed");
      return;
    }
    setMessage("Image uploaded.");
    load();
  }

  async function generateLink() {
    setGenerating(true);
    setMessage("");
    setError("");
    const res = await fetch(`/api/investigations/${params.id}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    setGenerating(false);
    if (!res.ok) {
      setError(json.error || "Failed to generate link");
      return;
    }
    setMessage(`Link ready: ${json.url}`);
    if (json.url) {
      await navigator.clipboard.writeText(json.url);
      setCopied(json.shortCode || "new");
      setTimeout(() => setCopied(null), 2000);
    }
    load();
  }

  async function revokeLink(id: string) {
    await fetch(`/api/links/${id}`, { method: "DELETE" });
    setMessage("Link revoked.");
    load();
  }

  async function runAi() {
    setMessage("");
    const res = await fetch(`/api/investigations/${params.id}/ai`, {
      method: "POST",
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "AI analysis failed");
      return;
    }
    setMessage("AI analysis complete — needs human review.");
    load();
  }

  function shareBaseUrl() {
    const configured = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    if (
      configured &&
      !configured.includes("localhost") &&
      !configured.includes("127.0.0.1")
    ) {
      return configured;
    }
    if (typeof window !== "undefined") return window.location.origin;
    return "https://www.mylos.cyou";
  }

  function linkUrl(shortCode: string) {
    if (process.env.NEXT_PUBLIC_USE_SUBDOMAIN_LINKS === "true") {
      const root =
        process.env.NEXT_PUBLIC_ROOT_DOMAIN &&
        !process.env.NEXT_PUBLIC_ROOT_DOMAIN.includes("localhost")
          ? process.env.NEXT_PUBLIC_ROOT_DOMAIN
          : "mylos.cyou";
      return `https://${shortCode}.${root}`;
    }
    return `${shareBaseUrl()}/l/${shortCode}`;
  }

  function copyUrl(shortCode: string) {
    navigator.clipboard.writeText(linkUrl(shortCode));
    setCopied(shortCode);
    setTimeout(() => setCopied(null), 2000);
  }

  if (error && !data) {
    return <p className="text-oals-danger">{error}</p>;
  }
  if (!data) {
    return <p className="text-oals-muted">Loading case…</p>;
  }

  const inv = data.investigation;
  const granted = locations.length;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/dashboard/investigations"
          className="inline-flex items-center gap-1.5 text-sm text-oals-muted hover:text-oals-text"
        >
          <ArrowLeft className="h-4 w-4" />
          All investigations
        </Link>
        <PageHeader
          title={inv.title}
          description={inv.description || "Case workspace for evidence, links, and captured locations."}
          actions={
            <>
              <Badge tone="info">{inv.status}</Badge>
              <Badge tone="warning">{inv.priority}</Badge>
              <Button size="sm" variant="secondary" onClick={() => load()}>
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
            </>
          }
        />
        <p className="font-mono text-xs text-oals-accent">{inv.caseReference}</p>
      </div>

      {(message || error) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message || error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatPill label="Evidence files" value={data.images.length} />
        <StatPill label="Active links" value={data.links.filter((l) => l.status === "ACTIVE" || l.status === "MAX_VIEWS").length} />
        <StatPill label="Locations captured" value={granted} />
        <StatPill label="Camera stills" value={captures.length} />
        <StatPill label="Access events" value={data.events.length} />
      </div>

      <SectionCard
        title="1. Capture setup"
        description="Upload an image, then generate a shareable location link."
        actions={
          <Button
            size="sm"
            onClick={generateLink}
            disabled={data.images.length === 0 || generating}
          >
            {generating ? "Generating…" : "Generate link"}
          </Button>
        }
      >
        <div className="grid gap-0 lg:grid-cols-2">
          <div className="border-b border-oals-border p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-oals-border bg-slate-50 px-4 py-8 text-center hover:border-oals-accent/40">
              <Upload className="h-6 w-6 text-oals-accent" />
              <span className="mt-2 text-sm font-medium">
                {uploading ? "Uploading…" : "Upload evidence image"}
              </span>
              <span className="mt-1 text-xs text-oals-dim">JPEG, PNG, or WebP</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
            <DataTable
              columns={["File", "Size"]}
              empty="No evidence uploaded yet."
              minWidth="280px"
            >
              {data.images.map((img) => (
                <tr key={img.id} className="hover:bg-slate-50/80">
                  <Td>{img.originalFilename}</Td>
                  <Td className="text-oals-muted">
                    {Math.round(img.sizeBytes / 1024)} KB
                  </Td>
                </tr>
              ))}
            </DataTable>
          </div>

          <div>
            <DataTable
              columns={["Link", "Status", "Views", "Expires", "Actions"]}
              empty="No links yet — upload an image first, then generate."
              minWidth="640px"
            >
              {data.links.map((link) => (
                <tr key={link.id} className="hover:bg-slate-50/80">
                  <Td mono>
                    <a
                      href={linkUrl(link.shortCode)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-oals-accent hover:underline"
                    >
                      /l/{link.shortCode}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Td>
                  <Td>
                    <Badge
                      tone={
                        link.status === "ACTIVE" || link.status === "MAX_VIEWS"
                          ? "success"
                          : link.status === "REVOKED"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {link.status === "MAX_VIEWS" ? "ACTIVE" : link.status}
                    </Badge>
                  </Td>
                  <Td>{link.currentViews} views</Td>
                  <Td className="text-oals-muted whitespace-nowrap">
                    {format(new Date(link.expiresAt), "dd MMM yyyy HH:mm")}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyUrl(link.shortCode)}
                      >
                        {copied === link.shortCode ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        Copy
                      </Button>
                      {link.status === "ACTIVE" && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => revokeLink(link.id)}
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </DataTable>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="2. Captured locations"
        description="Consented GPS points with reverse-geocoded address. Coordinates are the primary evidence."
      >
        <div className="border-b border-oals-border p-4 sm:p-5">
          <LocationMap locations={locations} />
        </div>
        <DataTable
          columns={[
            "Captured",
            "No.",
            "Address",
            "Postcode",
            "Coordinates",
            "Accuracy",
            "City",
            "Country",
          ]}
          empty="No consented locations yet. Share a link and wait for the recipient to allow location."
          minWidth="980px"
        >
          {locations.map((loc) => (
            <tr key={loc.id} className="hover:bg-slate-50/80">
              <Td className="whitespace-nowrap text-oals-muted">
                {format(new Date(loc.capturedAt), "dd MMM yyyy HH:mm")}
              </Td>
              <Td className="font-medium tabular-nums">
                {loc.houseNumber || "—"}
              </Td>
              <Td>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-oals-accent" />
                  <span>
                    {loc.address ||
                      [loc.street, loc.city, loc.country]
                        .filter(Boolean)
                        .join(", ") ||
                      "—"}
                  </span>
                </div>
              </Td>
              <Td className="text-oals-muted">{loc.postcode || "—"}</Td>
              <Td mono>
                {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
              </Td>
              <Td>±{Math.round(loc.accuracy)}m</Td>
              <Td className="text-oals-muted">{loc.city || "—"}</Td>
              <Td className="text-oals-muted">{loc.country || "—"}</Td>
            </tr>
          ))}
        </DataTable>
      </SectionCard>

      <SectionCard
        title="3. Automatic camera stills"
        description="Saved recipient camera captures. Open any still full-size — images stay available while you are signed in."
      >
        {captures.length > 0 ? (
          <div className="border-b border-oals-border p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {captures.map((cap) => (
                <a
                  key={`grid-${cap.id}`}
                  href={cap.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative overflow-hidden rounded-lg ring-1 ring-oals-border transition hover:ring-oals-accent/50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cap.thumbnailUrl}
                    alt="Captured still"
                    className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2 text-[11px] text-white">
                    {format(new Date(cap.capturedAt), "dd MMM HH:mm")}
                  </span>
                </a>
              ))}
            </div>
          </div>
        ) : null}
        <DataTable
          columns={[
            "Preview",
            "Captured",
            "Camera",
            "Resolution",
            "Device",
            "Browser / OS",
            "Open",
          ]}
          empty="No camera stills yet. When a recipient allows camera access, a still is stored here automatically."
          minWidth="920px"
        >
          {captures.map((cap) => (
            <tr key={cap.id} className="hover:bg-slate-50/80">
              <Td>
                <a href={cap.imageUrl} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cap.thumbnailUrl}
                    alt="Captured still"
                    className="h-14 w-14 rounded-md object-cover ring-1 ring-oals-border"
                  />
                </a>
              </Td>
              <Td className="whitespace-nowrap text-oals-muted">
                {format(new Date(cap.capturedAt), "dd MMM yyyy HH:mm")}
              </Td>
              <Td className="text-oals-muted">
                {cap.facingMode === "user"
                  ? "Front"
                  : cap.facingMode === "environment"
                    ? "Rear"
                    : "—"}
              </Td>
              <Td className="text-oals-muted">
                {cap.width && cap.height
                  ? `${cap.width}×${cap.height}`
                  : "—"}
              </Td>
              <Td className="text-oals-muted">{cap.deviceCategory || "—"}</Td>
              <Td className="text-oals-muted">
                {[cap.browser, cap.operatingSystem].filter(Boolean).join(" · ") ||
                  "—"}
              </Td>
              <Td>
                <a
                  href={cap.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-oals-accent hover:underline"
                >
                  Full size
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Td>
            </tr>
          ))}
        </DataTable>
      </SectionCard>

      <SectionCard
        title="4. Access & device log"
        description="Every open, consent grant, denial, camera event, or timeout for this case."
      >
        <DataTable
          columns={[
            "Time",
            "Event",
            "Consent",
            "Device",
            "Browser / OS",
            "Address",
            "Accuracy",
          ]}
          empty="No access events recorded yet."
          minWidth="960px"
        >
          {data.events.map((e) => (
            <tr key={e.id} className="hover:bg-slate-50/80">
              <Td className="whitespace-nowrap text-oals-muted">
                {format(new Date(e.timestamp), "dd MMM yyyy HH:mm")}
              </Td>
              <Td>{e.eventType.replaceAll("_", " ")}</Td>
              <Td>
                <Badge
                  tone={
                    e.consentStatus === "GRANTED"
                      ? "success"
                      : e.consentStatus === "DENIED"
                        ? "danger"
                        : "neutral"
                  }
                >
                  {e.consentStatus}
                </Badge>
              </Td>
              <Td className="text-oals-muted">{e.deviceCategory || "—"}</Td>
              <Td className="text-oals-muted">
                {[e.browser, e.operatingSystem].filter(Boolean).join(" · ") ||
                  "—"}
              </Td>
              <Td className="max-w-[280px]">
                {e.address ||
                  e.approximateLocation ||
                  [e.city, e.country].filter(Boolean).join(", ") ||
                  "—"}
              </Td>
              <Td>
                {e.accuracy != null ? `±${Math.round(e.accuracy)}m` : "—"}
              </Td>
            </tr>
          ))}
        </DataTable>
      </SectionCard>

      <SectionCard
        title="AI assist"
        description="Optional investigative aid — not proof of criminal activity."
        actions={
          <Button size="sm" variant="secondary" onClick={runAi}>
            Run analysis
          </Button>
        }
      >
        <div className="space-y-3 p-4 sm:p-5">
          {!inv.aiAnalysis?.riskIndicator ? (
            <p className="text-sm text-oals-dim">No analysis run yet.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge
                  tone={
                    inv.aiAnalysis.riskIndicator === "HIGH"
                      ? "danger"
                      : inv.aiAnalysis.riskIndicator === "MEDIUM"
                        ? "warning"
                        : "success"
                  }
                >
                  Risk: {inv.aiAnalysis.riskIndicator}
                </Badge>
                <Badge tone="accent">
                  {inv.aiAnalysis.humanReviewStatus || "PENDING_REVIEW"}
                </Badge>
              </div>
              <p className="text-sm text-oals-muted">{inv.aiAnalysis.summary}</p>
              {inv.aiAnalysis.indicators && inv.aiAnalysis.indicators.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-oals-muted">
                  {inv.aiAnalysis.indicators.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
