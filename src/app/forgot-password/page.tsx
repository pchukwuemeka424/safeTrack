"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "request", email }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(data.message || "If an account exists, a reset email has been sent.");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center oals-grid-bg px-4">
      <div className="mb-8">
        <Logo />
      </div>
      <Card className="w-full max-w-md">
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold">
          Reset password
        </h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {message && <p className="text-sm text-oals-success">{message}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            Send reset link
          </Button>
        </form>
        <Link href="/login" className="mt-4 inline-block text-sm text-oals-muted hover:text-oals-text">
          Back to sign in
        </Link>
      </Card>
    </div>
  );
}
