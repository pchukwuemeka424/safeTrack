"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DecoyError, DecoyShell } from "@/components/public-link/decoy-shell";

type PageStatus =
  | "loading"
  | "ACTIVE"
  | "EXPIRED"
  | "REVOKED"
  | "MAX_VIEWS"
  | "UNAVAILABLE"
  | "error";

function codeFromHostname(): string {
  if (typeof window === "undefined") return "";
  const hostname = window.location.hostname.toLowerCase();
  if (hostname.endsWith(".localhost") && hostname !== "localhost") {
    return hostname.replace(/\.localhost$/, "");
  }
  // production: {code}.oals.online
  const parts = hostname.split(".");
  if (parts.length >= 3 && parts.slice(-2).join(".") === "oals.online") {
    const sub = parts[0];
    if (sub && sub !== "www" && sub !== "app") return sub;
  }
  return "";
}

function formatArticleDate() {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function readPosition(
  options: PositionOptions,
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function captureExactPosition(): Promise<GeolocationPosition> {
  try {
    return await readPosition({
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    });
  } catch (err) {
    // High-accuracy often times out indoors — retry with network/wifi fix.
    if (
      err instanceof GeolocationPositionError &&
      err.code === err.TIMEOUT
    ) {
      return readPosition({
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 60_000,
      });
    }
    throw err;
  }
}

export default function PublicInvestigationLinkPage({
  initialCode = "",
}: {
  initialCode?: string;
}) {
  const searchParams = useSearchParams();
  const code = useMemo(() => {
    const fromQuery = searchParams.get("code") || "";
    const fromHost = codeFromHostname();
    return (initialCode || fromQuery || fromHost).toLowerCase().trim();
  }, [initialCode, searchParams]);

  const [status, setStatus] = useState<PageStatus>("loading");
  const [blurUrl, setBlurUrl] = useState<string | null>(null);
  const [clearUrl, setClearUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<
    "idle" | "requesting" | "granted" | "denied" | "unavailable" | "timeout"
  >("idle");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!code) {
      setStatus("UNAVAILABLE");
      return;
    }
    const res = await fetch(`/api/public/link/${encodeURIComponent(code)}`);
    const data = await res.json();
    if (data.status === "ACTIVE") {
      setStatus("ACTIVE");
      setBlurUrl(data.blurImageUrl);
    } else {
      setStatus(data.status || "UNAVAILABLE");
    }
  }, [code]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function requestLocation() {
    setPhase("requesting");
    setMessage("");

    if (!window.isSecureContext || !navigator.geolocation) {
      setPhase("unavailable");
      await submitConsent("UNAVAILABLE");
      return;
    }

    // Geolocation is ONLY requested after explicit user click — never on page load.
    try {
      const pos = await captureExactPosition();
      const accuracy =
        typeof pos.coords.accuracy === "number" &&
        Number.isFinite(pos.coords.accuracy)
          ? pos.coords.accuracy
          : 0;

      setPhase("granted");
      await submitConsent("GRANTED", {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy,
        timestamp:
          typeof pos.timestamp === "number" && pos.timestamp > 1e11
            ? pos.timestamp
            : Date.now(),
      });
    } catch (err) {
      if (
        err instanceof GeolocationPositionError &&
        err.code === err.PERMISSION_DENIED
      ) {
        setPhase("denied");
        await submitConsent("DENIED");
      } else if (
        err instanceof GeolocationPositionError &&
        err.code === err.TIMEOUT
      ) {
        setPhase("timeout");
        await submitConsent("TIMEOUT");
      } else {
        setPhase("unavailable");
        await submitConsent("UNAVAILABLE");
      }
    }
  }

  async function submitConsent(
    consentStatus: "GRANTED" | "DENIED" | "UNAVAILABLE" | "TIMEOUT",
    coords?: {
      latitude: number;
      longitude: number;
      accuracy: number;
      timestamp: number;
    },
  ) {
    try {
      const res = await fetch("/api/public/location-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shortCode: code,
          consentStatus,
          ...coords,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.unlocked && data.imageUrl) {
        setClearUrl(data.imageUrl);
        setMessage("");
      } else if (consentStatus === "DENIED") {
        setMessage("We couldn’t confirm your location. This media stays locked.");
      } else if (consentStatus !== "GRANTED") {
        setMessage("Location is unavailable right now. Please try again later.");
      } else {
        setPhase("unavailable");
        setMessage(data.error || "Unable to open this media.");
      }
    } catch {
      setPhase("unavailable");
      setMessage("Unable to open this media. Please try again.");
    }
  }

  if (status === "loading") {
    return (
      <DecoyShell>
        <div className="flex flex-1 items-center justify-center py-24">
          <p className="text-sm text-slate-500">Loading media…</p>
        </div>
      </DecoyShell>
    );
  }

  if (status === "EXPIRED") {
    return (
      <DecoyShell>
        <DecoyError
          title="This story has expired"
          text="The shared media is no longer available."
        />
      </DecoyShell>
    );
  }

  if (status === "REVOKED") {
    return (
      <DecoyShell>
        <DecoyError
          title="Media unavailable"
          text="This link has been withdrawn by the publisher."
        />
      </DecoyShell>
    );
  }

  if (status === "MAX_VIEWS") {
    return (
      <DecoyShell>
        <DecoyError
          title="Viewing limit reached"
          text="This shared media is no longer accepting new views."
        />
      </DecoyShell>
    );
  }

  if (status !== "ACTIVE") {
    return (
      <DecoyShell>
        <DecoyError
          title="Page not found"
          text="We couldn’t find this media. The link may be incomplete or out of date."
        />
      </DecoyShell>
    );
  }

  const unlocked = Boolean(clearUrl);

  return (
    <DecoyShell>
      <article className="mx-auto w-full max-w-2xl animate-fade-up">
        <header className="mb-6 space-y-3 sm:mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal-700/80">
            Shared media
          </p>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {unlocked ? "Evening light, field study" : "View image"}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <time dateTime={new Date().toISOString()}>{formatArticleDate()}</time>
            <span aria-hidden className="text-slate-300">
              ·
            </span>
            <span>Northline Desk</span>
          </div>
        </header>

        <figure className="overflow-hidden rounded-xl bg-white shadow-[0_1px_0_rgba(15,23,42,0.04),0_18px_40px_-24px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={clearUrl || blurUrl || undefined}
            alt={unlocked ? "Shared media" : "Media preview"}
            className={`aspect-[4/3] w-full object-cover ${unlocked ? "animate-unlock" : "scale-[1.01] blur-[2px]"}`}
          />
          {unlocked ? (
            <figcaption className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:px-5">
              Field capture · shared privately via Northline
            </figcaption>
          ) : null}
        </figure>

        {!unlocked ? (
          <div className="mt-8 space-y-4">
            <p className="text-sm leading-relaxed text-slate-500">
              Confirm you’re nearby to view this media. Your browser will ask to
              share your current location.
            </p>
            <button
              type="button"
              onClick={requestLocation}
              disabled={phase === "requesting"}
              className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-slate-900 px-6 text-base font-medium text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[12rem]"
            >
              {phase === "requesting" ? "Confirming location…" : "View image"}
            </button>

            {(phase === "denied" ||
              phase === "unavailable" ||
              phase === "timeout") && (
              <p
                role="status"
                className="text-sm text-slate-500"
              >
                {message ||
                  "We couldn’t open this media. Please try again."}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-8 space-y-6 border-t border-slate-200/80 pt-8">
            <p className="text-base leading-relaxed text-slate-600">
              A quiet frame from the day’s brief — soft edges, warm tone, and the
              last of the available light.
            </p>
            <aside className="rounded-xl border border-slate-200/80 bg-white/70 px-4 py-4 sm:px-5">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                Related
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li className="flex items-center justify-between gap-3">
                  <span>Studio notes — late summer</span>
                  <span className="text-slate-400">Archive</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span>How we share private media</span>
                  <span className="text-slate-400">Guide</span>
                </li>
              </ul>
            </aside>
          </div>
        )}
      </article>
    </DecoyShell>
  );
}
