import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connection";
import { Investigation } from "@/models/Investigation";
import { ImageAsset } from "@/models/ImageAsset";
import { requireAuthPermission, toErrorResponse } from "@/lib/auth/session";
import { analyzeInvestigation } from "@/lib/ai/analyze";
import { writeAuditLog } from "@/lib/audit/write";
import { getClientIp } from "@/lib/rate-limit";
import { env } from "@/lib/utils/env";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    if (!env.aiModuleEnabled) {
      return NextResponse.json(
        { error: "AI module is disabled" },
        { status: 403 },
      );
    }

    const user = await requireAuthPermission("ai:run");
    const { id } = await ctx.params;
    await connectDb();

    const investigation = await Investigation.findById(id);
    if (!investigation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (
      user.role !== "ADMIN" &&
      investigation.createdBy.toString() !== user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const images = await ImageAsset.find({ caseId: id }).lean();
    const checksums = images.map((i) => i.checksumSha256);
    let duplicateCount = 0;
    if (checksums.length > 0) {
      duplicateCount = await ImageAsset.countDocuments({
        checksumSha256: { $in: checksums },
        caseId: { $ne: id },
      });
    }

    const analysis = await analyzeInvestigation({
      title: investigation.title,
      description: investigation.description || "",
      investigationType: investigation.investigationType,
      priority: investigation.priority,
      imageChecksum: checksums[0],
      duplicateChecksumCount: duplicateCount,
    });

    investigation.aiAnalysis = {
      riskIndicator: analysis.riskIndicator,
      summary: analysis.summary,
      indicators: analysis.indicators,
      humanReviewStatus: "PENDING_REVIEW",
      reviewedBy: null,
      reviewedAt: null,
      disclaimer: analysis.disclaimer,
    };
    await investigation.save();

    await writeAuditLog({
      actorId: user.id,
      action: "AI_ANALYSIS_RUN",
      resourceType: "Investigation",
      resourceId: id,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({
      analysis: {
        ...analysis,
        potentialMatches: analysis.potentialMatches,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuthPermission("ai:review");
    const { id } = await ctx.params;
    const body = await req.json();
    await connectDb();

    const investigation = await Investigation.findById(id);
    if (!investigation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const status = body.humanReviewStatus as "REVIEWED" | "DISMISSED";
    if (!["REVIEWED", "DISMISSED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    if (!investigation.aiAnalysis) {
      return NextResponse.json({ error: "No analysis to review" }, { status: 400 });
    }

    investigation.aiAnalysis.humanReviewStatus = status;
    investigation.aiAnalysis.reviewedBy = user.id as unknown as typeof investigation.aiAnalysis.reviewedBy;
    investigation.aiAnalysis.reviewedAt = new Date();
    await investigation.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
