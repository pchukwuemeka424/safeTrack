import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connection";
import { SystemSetting, DEFAULT_SETTINGS } from "@/models/SystemSetting";
import { requireAuthPermission, toErrorResponse } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/write";
import { getClientIp } from "@/lib/rate-limit";

export async function GET() {
  try {
    await requireAuthPermission("settings:manage");
    await connectDb();
    const settings = await SystemSetting.find().lean();
    const map: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return NextResponse.json({ settings: map });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuthPermission("settings:manage");
    const body = await req.json();
    await connectDb();

    const allowed = [
      "retentionDays",
      "maxUploadBytes",
      "storeRawIp",
      "allowRegistration",
      "aiModuleEnabled",
      "mapProvider",
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === "retentionDays") {
          const days = Number(body[key]);
          if (![7, 30, 90].includes(days) && !(days > 0 && days <= 365)) {
            return NextResponse.json(
              { error: "Invalid retention period" },
              { status: 400 },
            );
          }
        }
        await SystemSetting.findOneAndUpdate(
          { key },
          {
            key,
            value: body[key],
            updatedBy: user.id,
            description: key,
          },
          { upsert: true },
        );
      }
    }

    await writeAuditLog({
      actorId: user.id,
      action: "SETTINGS_UPDATED",
      resourceType: "SystemSetting",
      ip: getClientIp(req),
      metadata: { keys: Object.keys(body) },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
