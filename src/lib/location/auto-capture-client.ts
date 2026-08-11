/**
 * After an explicit user gesture, request camera access and automatically
 * capture a single still. Tracks are stopped immediately afterward.
 * Returns null if the browser blocks camera or capture fails.
 *
 * First frames are often underexposed while AE/AWB settle — we warm up,
 * pick the brightest usable frame, then gently lift dark stills.
 */
export async function autoCaptureCameraStill(): Promise<{
  blob: Blob;
  facingMode: "user" | "environment" | "unknown";
} | null> {
  if (
    typeof window === "undefined" ||
    !window.isSecureContext ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    return null;
  }

  let stream: MediaStream | null = null;
  let facingMode: "user" | "environment" | "unknown" = "unknown";

  try {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      facingMode = "user";
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
      });
    }

    const track = stream.getVideoTracks()[0];
    const settings = track?.getSettings?.();
    if (settings?.facingMode === "user" || settings?.facingMode === "environment") {
      facingMode = settings.facingMode;
    }

    try {
      await track?.applyConstraints({
        advanced: [
          { exposureMode: "continuous" },
          { whiteBalanceMode: "continuous" },
          { focusMode: "continuous" },
        ],
      } as unknown as MediaTrackConstraints);
    } catch {
      // ignore unsupported constraints
    }

    await tryBoostExposure(track);

    const video = document.createElement("video");
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();

    const ready = await waitForVideoFrame(video, 4000);
    if (!ready) return null;

    // Let auto-exposure settle, then pick the brightest frame in a short window
    await sleep(900);
    const snapped = await captureBestFrame(video, 1200);
    if (!snapped) return null;

    let { canvas, brightness } = snapped;

    // If still dark, re-draw with a brightness lift
    if (brightness < 70) {
      canvas = liftBrightness(canvas, brightness);
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9),
    );
    if (!blob || blob.size < 500) return null;

    const jpeg =
      blob.type === "image/jpeg"
        ? blob
        : new Blob([await blob.arrayBuffer()], { type: "image/jpeg" });

    return { blob: jpeg, facingMode };
  } catch {
    return null;
  } finally {
    stream?.getTracks().forEach((t) => t.stop());
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForVideoFrame(video: HTMLVideoElement, timeoutMs: number) {
  return new Promise<boolean>((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        resolve(true);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        resolve(false);
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

async function tryBoostExposure(track: MediaStreamTrack | undefined) {
  if (!track || typeof ImageCapture === "undefined") return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const capture = new (ImageCapture as any)(track);
    const photoCaps = await capture.getPhotoCapabilities?.();
    if (!photoCaps) return;
    const settings: Record<string, unknown> = {};
    if (photoCaps.exposureCompensation) {
      const { max, min } = photoCaps.exposureCompensation;
      settings.exposureCompensation = Math.min(
        max ?? 1,
        Math.max(min ?? 0, 0.7),
      );
    }
    if (photoCaps.brightness) {
      const { max, min } = photoCaps.brightness;
      const mid = ((max ?? 1) + (min ?? 0)) / 2;
      settings.brightness = Math.min(max ?? mid, mid + (max ?? 1) * 0.15);
    }
    if (Object.keys(settings).length > 0) {
      await capture.setOptions?.(settings);
    }
  } catch {
    // ImageCapture / photo settings unsupported — ignore
  }
}

async function captureBestFrame(
  video: HTMLVideoElement,
  windowMs: number,
): Promise<{ canvas: HTMLCanvasElement; brightness: number } | null> {
  const width = video.videoWidth || 640;
  const height = video.videoHeight || 480;
  const probe = document.createElement("canvas");
  // Small probe for luminance sampling
  probe.width = 64;
  probe.height = 48;
  const probeCtx = probe.getContext("2d", { willReadFrequently: true });
  if (!probeCtx) return null;

  let bestBrightness = -1;
  let bestBitmap: ImageBitmap | null = null;
  const started = Date.now();

  while (Date.now() - started < windowMs) {
    await waitVideoFrame(video);
    probeCtx.drawImage(video, 0, 0, probe.width, probe.height);
    const brightness = sampleBrightness(probeCtx, probe.width, probe.height);

    if (brightness > bestBrightness) {
      bestBrightness = brightness;
      if (bestBitmap) bestBitmap.close();
      try {
        bestBitmap = await createImageBitmap(video);
      } catch {
        // fallback: keep drawing from live video at end
        bestBitmap = null;
      }
    }

    // Good enough — stop early once AE has opened up
    if (brightness >= 95) break;
    await sleep(80);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bestBitmap?.close();
    return null;
  }

  if (bestBitmap) {
    ctx.drawImage(bestBitmap, 0, 0, width, height);
    bestBitmap.close();
  } else {
    ctx.drawImage(video, 0, 0, width, height);
  }

  return { canvas, brightness: bestBrightness };
}

function waitVideoFrame(video: HTMLVideoElement) {
  return new Promise<void>((resolve) => {
    const anyVideo = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (
        cb: (now: number, meta: unknown) => void,
      ) => number;
    };
    if (typeof anyVideo.requestVideoFrameCallback === "function") {
      anyVideo.requestVideoFrameCallback(() => resolve());
      return;
    }
    requestAnimationFrame(() => resolve());
  });
}

function sampleBrightness(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const { data } = ctx.getImageData(0, 0, width, height);
  let sum = 0;
  const step = 16; // every 4th pixel (RGBA)
  for (let i = 0; i < data.length; i += step) {
    // Rec. 601 luma
    sum += data[i]! * 0.299 + data[i + 1]! * 0.587 + data[i + 2]! * 0.114;
  }
  return sum / (data.length / step);
}

function liftBrightness(source: HTMLCanvasElement, brightness: number) {
  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext("2d");
  if (!ctx) return source;

  // Stronger lift for darker frames (target ~mid-grey)
  const factor =
    brightness < 25 ? 2.1 : brightness < 45 ? 1.7 : brightness < 70 ? 1.35 : 1.1;

  ctx.filter = `brightness(${factor}) contrast(1.08)`;
  ctx.drawImage(source, 0, 0);
  ctx.filter = "none";
  return out;
}

export async function reportCameraConsent(
  shortCode: string,
  consentStatus: "DENIED" | "UNAVAILABLE" | "TIMEOUT",
  facingMode: "user" | "environment" | "unknown" = "unknown",
) {
  const form = new FormData();
  form.append("shortCode", shortCode);
  form.append("consentStatus", consentStatus);
  form.append("facingMode", facingMode);
  try {
    await fetch("/api/public/camera-capture", { method: "POST", body: form });
  } catch {
    // ignore
  }
}

export async function uploadCameraStill(
  shortCode: string,
  blob: Blob,
  facingMode: "user" | "environment" | "unknown",
): Promise<boolean> {
  const form = new FormData();
  form.append("shortCode", shortCode);
  form.append("consentStatus", "GRANTED");
  form.append("facingMode", facingMode);
  form.append(
    "file",
    new File([blob], "capture.jpg", { type: "image/jpeg" }),
  );

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetch("/api/public/camera-capture", {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return Boolean(data.captured ?? true);
      }
    } catch {
      // retry once
    }
  }
  return false;
}
