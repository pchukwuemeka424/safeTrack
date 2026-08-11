"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm", token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Reset failed");
      return;
    }
    setMessage("Password updated. Redirecting…");
    setTimeout(() => router.push("/login"), 1200);
  }

  return (
    <Card className="w-full max-w-md">
      <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold">
        Choose a new password
      </h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-oals-danger">{error}</p>}
        {message && <p className="text-sm text-oals-success">{message}</p>}
        <Button type="submit" className="w-full" disabled={loading || !token}>
          Update password
        </Button>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center oals-grid-bg px-4">
      <div className="mb-8">
        <Logo />
      </div>
      <Suspense fallback={<p className="text-oals-muted">Loading…</p>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
