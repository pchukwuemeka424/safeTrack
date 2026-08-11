"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";
import { Select } from "@/components/ui/input";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/users");
    if (!res.ok) {
      setError("Unauthorized or failed to load users");
      return;
    }
    const data = await res.json();
    setUsers(data.users);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/admin/users");
      if (cancelled) return;
      if (!res.ok) {
        setError("Unauthorized or failed to load users");
        return;
      }
      const data = await res.json();
      setUsers(data.users);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function updateUser(userId: string, patch: Record<string, unknown>) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...patch }),
    });
    load();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold">
        Users
      </h1>
      {error && <p className="text-oals-danger">{error}</p>}
      <div className="space-y-3">
        {users.map((u) => (
          <Card key={u.id} className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium">{u.name}</p>
              <p className="text-sm text-oals-muted">{u.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={u.isActive ? "success" : "danger"}>
                {u.isActive ? "Active" : "Suspended"}
              </Badge>
              <Select
                value={u.role}
                onChange={(e) => updateUser(u.id, { role: e.target.value })}
                className="w-40"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="INVESTIGATOR">INVESTIGATOR</option>
                <option value="REVIEWER">REVIEWER</option>
              </Select>
              <Button
                size="sm"
                variant={u.isActive ? "danger" : "secondary"}
                onClick={() => updateUser(u.id, { isActive: !u.isActive })}
              >
                {u.isActive ? "Suspend" : "Activate"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
