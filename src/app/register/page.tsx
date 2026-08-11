"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Registration failed");
      return;
    }
    setMessage(data.message);
    setTimeout(() => router.push("/login"), 1500);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center oals-grid-bg px-4 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <Card className="w-full max-w-md">
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold">
          Create Account
        </h1>
        <p className="mt-2 text-sm text-oals-muted">
          Register as an authorised investigator.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={10}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <p className="text-xs text-oals-dim">
              At least 10 characters with upper, lower, and number.
            </p>
          </div>
          {error && (
            <p className="text-sm text-oals-danger" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="text-sm text-oals-success" role="status">
              {message}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Create Account"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-oals-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-oals-accent hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
