import { test, expect } from "@playwright/test";

test.describe("marketing site", () => {
  test("home page renders brand and CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("OALS").first()).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /Secure Investigation/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "Create Investigation" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign In" }).first()).toBeVisible();
  });

  test("privacy page explains consent-based location", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy" })).toBeVisible();
    await expect(page.getByText(/never collected automatically/i)).toBeVisible();
  });

  test("security page is available", async ({ page }) => {
    await page.goto("/security");
    await expect(page.getByRole("heading", { name: "Security" })).toBeVisible();
  });
});

test.describe("auth gates", () => {
  test("dashboard redirects unauthenticated users", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
  });
});

test.describe("public link error states", () => {
  test("invalid short code shows unavailable state", async ({ page }) => {
    // Valid format but non-existent code should return generic unavailable
    await page.goto("/public/investigation-link?code=zzzz9999aa");
    await expect(
      page.getByRole("heading", { name: "Link Unavailable" }),
    ).toBeVisible({ timeout: 15000 });
  });
});
