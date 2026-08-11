import { redirect } from "next/navigation";
import { isValidShortCode } from "@/lib/links/hostname";

/**
 * Path-based public investigation links.
 * Works without wildcard DNS (required on many Vercel setups).
 */
export default async function PublicLinkByPathPage({
  params,
}: {
  params: Promise<{ shortCode: string }>;
}) {
  const { shortCode } = await params;
  const code = shortCode.toLowerCase().trim();
  if (!isValidShortCode(code)) {
    redirect("/public/investigation-link");
  }
  redirect(`/public/investigation-link?code=${encodeURIComponent(code)}`);
}
