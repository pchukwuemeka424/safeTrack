"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Label } from "@/components/ui/input";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings || {}))
      .catch(() => undefined);
  }, []);

  async function save() {
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setMessage(res.ok ? "Settings saved." : "Failed to save.");
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold">
        System Settings
      </h1>
      <Card className="space-y-4">
        <div className="space-y-2">
          <Label>Location retention (days)</Label>
          <Select
            value={String(settings.retentionDays ?? 7)}
            onChange={(e) =>
              setSettings({ ...settings, retentionDays: Number(e.target.value) })
            }
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm text-oals-muted">
          <input
            type="checkbox"
            checked={Boolean(settings.storeRawIp)}
            onChange={(e) =>
              setSettings({ ...settings, storeRawIp: e.target.checked })
            }
          />
          Store encrypted raw IP addresses
        </label>
        <label className="flex items-center gap-2 text-sm text-oals-muted">
          <input
            type="checkbox"
            checked={settings.aiModuleEnabled !== false}
            onChange={(e) =>
              setSettings({ ...settings, aiModuleEnabled: e.target.checked })
            }
          />
          Enable AI assistance module
        </label>
        <Button onClick={save}>Save settings</Button>
        {message && <p className="text-sm text-oals-success">{message}</p>}
      </Card>
    </div>
  );
}
