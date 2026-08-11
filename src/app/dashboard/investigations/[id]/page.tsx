"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";
import { LocationMap } from "@/components/maps/location-map";
import { Copy, Check, Ban } from "lucide-react";

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
    timestamp: string;
  }>;
}

export default function InvestigationDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<InvestigationDetail | null>(null);
  const [locations, setLocations] = useState<
    Array<{
      id: string;
      latitude: number;
      longitude: number;
      accuracy: number;
      address?: string | null;
      city?: string | null;
      country?: string | null;
      capturedAt: string;
    }>
  >([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/investigations/${params.id}`);
    if (!res.ok) {
      setError("Unable to load investigation");
      return;
    }
    const json = await res.json();
    setData(json);
    const locRes = await fetch(`/api/investigations/${params.id}/locations`);
    if (locRes.ok) {
      const locJson = await locRes.json();
      setLocations(locJson.locations || []);
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
    setMessage("Image uploaded securely.");
    load();
  }

  async function generateLink() {
    setMessage("");
    const res = await fetch(`/api/investigations/${params.id}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to generate link");
      return;
    }
    setMessage(`Protected link created: ${json.url}`);
    load();
  }

  async function revokeLink(id: string) {
    await fetch(`/api/links/${id}`, { method: "DELETE" });
    setMessage("Link revoked.");
    load();
  }

  async function runAi() {
    const res = await fetch(`/api/investigations/${params.id}/ai`, {
      method: "POST",
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "AI analysis failed");
      return;
    }
    setMessage("AI analysis complete — requires human review.");
    load();
  }

  function copyUrl(shortCode: string) {
    const url =
      // Prefer server-built absolute URL shape via env
      process.env.NEXT_PUBLIC_USE_SUBDOMAIN_LINKS === "true"
        ? (() => {
            const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "mylos.cyou";
            const protocol = root.includes("localhost") ? "http" : "https";
            return `${protocol}://${shortCode}.${root}`;
          })()
        : `${(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")}/l/${shortCode}`;
    navigator.clipboard.writeText(url);
    setCopied(shortCode);
    setTimeout(() => setCopied(null), 2000);
  }

  if (error && !data) {
    return <p className="text-oals-danger">{error}</p>;
  }
  if (!data) {
    return <p className="text-oals-muted">Loading…</p>;
  }

  const inv = data.investigation;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-oals-accent">{inv.caseReference}</p>
          <h1 className="mt-1 font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold">
            {inv.title}
          </h1>
          <p className="mt-2 text-sm text-oals-muted">{inv.description}</p>
        </div>
        <div className="flex gap-2">
          <Badge tone="info">{inv.status}</Badge>
          <Badge tone="warning">{inv.priority}</Badge>
        </div>
      </div>

      {(message || error) && (
        <p className={message ? "text-sm text-oals-success" : "text-sm text-oals-danger"}>
          {message || error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Evidence Image</h2>
          <p className="mt-1 text-sm text-oals-muted">
            JPEG, PNG, or WebP. Metadata stripped. Private storage only.
          </p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onUpload}
            className="mt-4 block w-full text-sm text-oals-muted file:mr-4 file:rounded-md file:border-0 file:bg-oals-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            disabled={uploading}
          />
          <ul className="mt-4 space-y-2 text-sm">
            {data.images.map((img) => (
              <li key={img.id} className="flex justify-between text-oals-muted">
                <span>{img.originalFilename}</span>
                <span>{Math.round(img.sizeBytes / 1024)} KB</span>
              </li>
            ))}
          </ul>
          <Button className="mt-4" onClick={generateLink} disabled={data.images.length === 0}>
            Generate Protected Link
          </Button>
        </Card>

        <Card>
          <h2 className="font-semibold">Generated Links</h2>
          <div className="mt-4 space-y-3">
            {data.links.length === 0 && (
              <p className="text-sm text-oals-dim">No links yet.</p>
            )}
            {data.links.map((link) => (
              <div
                key={link.id}
                className="rounded-md border border-oals-border bg-oals-bg p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <code className="text-sm text-oals-accent">
                    {process.env.NEXT_PUBLIC_USE_SUBDOMAIN_LINKS === "true"
                      ? `${link.shortCode}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || "mylos.cyou"}`
                      : `${(process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "") || "…"}/l/${link.shortCode}`}
                  </code>
                  <Badge
                    tone={
                      link.status === "ACTIVE"
                        ? "success"
                        : link.status === "REVOKED"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {link.status}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-oals-dim">
                  Views {link.currentViews}/{link.maximumViews} · Expires{" "}
                  {format(new Date(link.expiresAt), "dd MMM yyyy HH:mm")} ·
                  Location {link.locationRequired ? "Required" : "Optional"}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => copyUrl(link.shortCode)}>
                    {copied === link.shortCode ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    Copy Link
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
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Consented Locations</h2>
          <p className="text-xs text-oals-dim">Encrypted at rest · RBAC protected</p>
        </div>
        <div className="mt-4">
          <LocationMap locations={locations} />
        </div>
        {locations.length > 0 && (
          <ul className="mt-4 space-y-3 text-sm text-oals-muted">
            {locations.map((loc) => (
              <li key={loc.id} className="space-y-1 border-t border-oals-border pt-3 first:border-0 first:pt-0">
                <p>
                  {format(new Date(loc.capturedAt), "dd MMM yyyy HH:mm")} · Accuracy ±
                  {Math.round(loc.accuracy)}m
                </p>
                <p className="font-mono text-xs text-oals-dim">
                  {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                </p>
                {(loc.address || loc.city || loc.country) && (
                  <p className="text-oals-text">
                    {loc.address ||
                      [loc.city, loc.country].filter(Boolean).join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold">AI Investigation Assist</h2>
          <Button size="sm" variant="secondary" onClick={runAi}>
            Run Analysis
          </Button>
        </div>
        <p className="mt-2 text-xs text-oals-warning">
          AI-generated analysis is an investigative aid and must not be treated as
          proof of criminal activity.
        </p>
        {inv.aiAnalysis?.riskIndicator && (
          <div className="mt-4 space-y-2">
            <Badge
              tone={
                inv.aiAnalysis.riskIndicator === "HIGH"
                  ? "danger"
                  : inv.aiAnalysis.riskIndicator === "MEDIUM"
                    ? "warning"
                    : "success"
              }
            >
              Risk Indicators: {inv.aiAnalysis.riskIndicator}
            </Badge>
            <p className="text-sm text-oals-muted">{inv.aiAnalysis.summary}</p>
            <ul className="list-disc pl-5 text-sm text-oals-muted">
              {inv.aiAnalysis.indicators?.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <Badge tone="accent">
              {inv.aiAnalysis.humanReviewStatus || "PENDING_REVIEW"}
            </Badge>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold">Access Events</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-oals-dim">
              <tr>
                <th className="pb-2">Event</th>
                <th className="pb-2">Consent</th>
                <th className="pb-2">Accuracy</th>
                <th className="pb-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((e) => (
                <tr key={e.id} className="border-t border-oals-border/60">
                  <td className="py-2">{e.eventType}</td>
                  <td className="py-2">{e.consentStatus}</td>
                  <td className="py-2">
                    {e.accuracy != null ? `±${Math.round(e.accuracy)}m` : "—"}
                  </td>
                  <td className="py-2 text-oals-muted">
                    {format(new Date(e.timestamp), "dd MMM yyyy HH:mm")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
