import type { RiskIndicator } from "@/types";

/**
 * Optional AI investigation-assistance module.
 * NEVER classifies individuals as criminals or predators.
 * Results are investigative aids requiring human review.
 */
export interface AiAnalysisResult {
  riskIndicator: RiskIndicator;
  summary: string;
  indicators: string[];
  disclaimer: string;
  humanReviewStatus: "PENDING_REVIEW";
  potentialMatches?: Array<{
    label: string;
    similarity: number;
    status: "REQUIRES_HUMAN_REVIEW";
  }>;
}

const DISCLAIMER =
  "AI-generated analysis is an investigative aid and must not be treated as proof of criminal activity.";

export async function analyzeInvestigation(input: {
  title: string;
  description: string;
  investigationType: string;
  priority: string;
  imageChecksum?: string;
  duplicateChecksumCount?: number;
}): Promise<AiAnalysisResult> {
  const indicators: string[] = [];
  let score = 0;

  if (input.priority === "HIGH" || input.priority === "CRITICAL") {
    score += 2;
    indicators.push("Elevated case priority assigned by investigator");
  }

  if (input.investigationType === "SAFEGUARDING") {
    score += 1;
    indicators.push("Safeguarding investigation type selected");
  }

  if (input.investigationType === "MISSING_PERSON") {
    score += 1;
    indicators.push("Missing person investigation type selected");
  }

  if ((input.duplicateChecksumCount || 0) > 0) {
    score += 2;
    indicators.push("Potential duplicate image detected in authorised dataset");
  }

  if (input.description.length > 200) {
    indicators.push("Detailed case description provided");
  }

  const riskIndicator: RiskIndicator =
    score >= 4 ? "HIGH" : score >= 2 ? "MEDIUM" : "LOW";

  return {
    riskIndicator,
    summary:
      "Automated signal analysis completed. Indicators reflect case metadata and authorised dataset patterns only. Human review is required before any operational decision.",
    indicators,
    disclaimer: DISCLAIMER,
    humanReviewStatus: "PENDING_REVIEW",
    potentialMatches:
      (input.duplicateChecksumCount || 0) > 0
        ? [
            {
              label: "Authorised dataset image similarity",
              similarity: 87,
              status: "REQUIRES_HUMAN_REVIEW",
            },
          ]
        : undefined,
  };
}
