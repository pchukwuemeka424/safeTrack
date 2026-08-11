import { Resend } from "resend";
import { env } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!env.resendApiKey) return null;
  if (!resend) resend = new Resend(env.resendApiKey);
  return resend;
}

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const client = getResend();
  if (!client) {
    logger.info("Email skipped (no provider configured)", {
      to: input.to,
      subject: input.subject,
    });
    return false;
  }

  try {
    await client.emails.send({
      from: env.emailFrom,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    return true;
  } catch (error) {
    logger.error("Failed to send email", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}

/** Never include coordinates or precise location in emails. */
export async function notifyLinkAccessed(to: string, caseReference: string) {
  return sendEmail({
    to,
    subject: "OALS — Investigation link accessed",
    html: `
      <p>An investigation link for case <strong>${caseReference}</strong> was accessed.</p>
      <p>View the event securely in OALS. Location details are never included in email notifications.</p>
      <p><a href="${env.appUrl}/dashboard">Open OALS Dashboard</a></p>
    `,
  });
}

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${env.appUrl}/verify-email?token=${token}`;
  return sendEmail({
    to,
    subject: "Verify your OALS account",
    html: `<p>Verify your email to activate your OALS account:</p><p><a href="${url}">${url}</a></p>`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${env.appUrl}/reset-password?token=${token}`;
  return sendEmail({
    to,
    subject: "Reset your OALS password",
    html: `<p>Reset your password using this link (expires in 1 hour):</p><p><a href="${url}">${url}</a></p>`,
  });
}
