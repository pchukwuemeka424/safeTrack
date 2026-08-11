"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Copy, ImagePlus, Link2, Loader2, MessageCircle } from "lucide-react";

type Step = "upload" | "generating" | "done";

export default function NewInvestigationPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [caseId, setCaseId] = useState("");
  const [copied, setCopied] = useState(false);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] || null;
    setError("");
    setLinkUrl("");
    setStep("upload");

    if (!selected) {
      setFile(null);
      setPreview(null);
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setError("Please choose a JPEG, PNG, or WebP image.");
      setFile(null);
      setPreview(null);
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function generateLink() {
    if (!file) {
      setError("Upload an image first.");
      return;
    }

    setStep("generating");
    setError("");

    try {
      const stamp = Date.now().toString(36).toUpperCase();
      const caseReference = `LINK-${stamp}`;
      const title =
        file.name.replace(/\.[^.]+$/, "").slice(0, 80) ||
        `Protected image ${stamp}`;

      const createRes = await fetch("/api/investigations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          caseReference,
          description: "",
          priority: "MEDIUM",
          investigationType: "DIGITAL_INVESTIGATION",
          locationRequired: true,
          linkExpiryHours: 72,
          maximumViews: 1,
          allowViewWithoutLocation: false,
          subjectLabel: "INVESTIGATION_SUBJECT",
        }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createJson.error || "Failed to create case");
      }

      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch(
        `/api/investigations/${createJson.id}/images`,
        { method: "POST", body: form },
      );
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadJson.error || "Upload failed");
      }

      const linkRes = await fetch(
        `/api/investigations/${createJson.id}/links`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageId: uploadJson.id }),
        },
      );
      const linkJson = await linkRes.json();
      if (!linkRes.ok) {
        throw new Error(linkJson.error || "Failed to generate link");
      }

      setCaseId(createJson.id);
      setLinkUrl(linkJson.url);
      setStep("done");
    } catch (err) {
      setStep("upload");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function copyLink() {
    if (!linkUrl) return;
    await navigator.clipboard.writeText(linkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareToWhatsApp() {
    if (!linkUrl) return;
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(linkUrl)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold">
          Create Protected Link
        </h1>
        <p className="mt-1 text-sm text-oals-muted">
          Upload an image and generate a consent-based location link.
        </p>
      </div>

      <Card className="space-y-5">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-oals-border bg-oals-bg px-4 py-10 text-center transition-colors hover:border-oals-accent/50"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Selected image preview"
              className="max-h-56 w-auto rounded-md object-contain"
            />
          ) : (
            <>
              <ImagePlus className="h-8 w-8 text-oals-accent" />
              <p className="mt-3 text-sm font-medium text-oals-text">
                Choose an image
              </p>
              <p className="mt-1 text-xs text-oals-dim">JPEG, PNG, or WebP</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        {file && (
          <p className="truncate text-xs text-oals-dim">{file.name}</p>
        )}

        {error && (
          <p className="text-sm text-oals-danger" role="alert">
            {error}
          </p>
        )}

        {step !== "done" ? (
          <Button
            className="w-full"
            size="lg"
            onClick={generateLink}
            disabled={!file || step === "generating"}
          >
            {step === "generating" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating link…
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
                Generate Protected Link
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Link created. Share it with the recipient.
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-oals-border bg-oals-bg p-3">
              <code className="min-w-0 flex-1 truncate text-sm text-oals-accent">
                {linkUrl}
              </code>
              <Button size="sm" variant="secondary" onClick={copyLink}>
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button size="sm" variant="outline" onClick={shareToWhatsApp}>
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => router.push(`/dashboard/investigations/${caseId}`)}
              >
                View case
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setLinkUrl("");
                  setCaseId("");
                  setStep("upload");
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                Create another
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
