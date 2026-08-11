import { test, expect } from "@playwright/test";

test.describe("subdomain public links", () => {
  test("active link shows decoy view image CTA", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("http://s3xedbkp2b.localhost:3000/", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await expect(page.getByText("Page not found")).toHaveCount(0);
    await expect(page.getByText("Northline").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByRole("heading", { name: "View image" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "View image" }),
    ).toBeVisible();
    await expect(page.getByText("OALS")).toHaveCount(0);
    await expect(page.getByText("Consent-based access")).toHaveCount(0);
    await expect(page.getByText("PROTECTED IMAGE")).toHaveCount(0);
    await expect(
      page.getByText("Location Verification Required"),
    ).toHaveCount(0);
    await expect(page.getByText(/investigation/i)).toHaveCount(0);
    await context.close();
  });
});
