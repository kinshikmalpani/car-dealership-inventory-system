import { test, expect, type Page } from "@playwright/test";

async function signIn(page: Page, role = "admin") {
  await page.goto("/");
  await page.getByLabel("Email address").fill(`${role}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("E2ePassword123!");
  await page.getByRole("button", { name: "Sign in →" }).click();
  await expect(
    page.getByRole("heading", {
      name: role === "admin" ? "Vehicle inventory." : /A car for every/,
    }),
  ).toBeVisible();
  await expect(page.locator(".vehicle-card").first()).toBeVisible();
}

test("customer purchases a car with accessories and downloads a private invoice", async ({
  page,
}) => {
  await signIn(page, "customer");
  await expect(
    page.getByRole("button", { name: "＋ Add vehicle" }),
  ).toHaveCount(0);
  await page.getByLabel("Search vehicles").fill("Swift");
  await expect(page.locator(".vehicle-card")).toHaveCount(1);
  await page.getByRole("button", { name: "View details →" }).click();
  await expect(
    page.getByRole("heading", { name: "Swift", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review purchase →" }).click();
  await page.getByLabel("Full name").fill("Asha Kumar");
  await page.getByLabel("Registration city").fill("Pune");
  await page.getByLabel("Floor mat set", { exact: false }).check();
  await page.getByLabel("Registration estimate (₹)").fill("40000");
  await page.getByLabel("Insurance estimate (₹)").fill("20000");
  await expect(page.locator(".breakdown-total")).toContainText("₹6,45,400.00");
  await page
    .getByLabel("I understand that payment is simulated", { exact: false })
    .check();
  await page
    .getByRole("button", { name: "Confirm simulated purchase" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Great choice!" }),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText("Asha Kumar");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download invoice" }).click();
  expect((await download).suggestedFilename()).toMatch(
    /^invoice-MR-IN-.+\.html$/,
  );
  await page.getByRole("link", { name: "My purchases", exact: true }).click();
  await expect(page.locator(".order-row")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".order-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
});

test("admin adds, edits, restocks, and deletes a vehicle", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "＋ Add vehicle" }).click();
  await page.getByLabel("Make", { exact: true }).fill("Test Motors");
  await page.getByLabel("Model", { exact: true }).fill("Roadster");
  await page.getByLabel("Category", { exact: true }).fill("Coupe");
  await page.getByLabel("Price (INR)").fill("10000.50");
  await page.getByLabel("Initial quantity").fill("0");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add vehicle", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Search vehicles").fill("Test Motors");
  const card = page.locator(".vehicle-card");
  await expect(card).toHaveCount(1);
  await expect(
    card.getByRole("button", { name: /Purchase|Out of stock/ }),
  ).toHaveCount(0);
  await card.getByRole("button", { name: "Edit details" }).click();
  await page.getByLabel("Model", { exact: true }).fill("Roadster Plus");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(card).toContainText("Roadster Plus");
  await card.getByRole("button", { name: "＋ Restock" }).click();
  await page.getByLabel("Units to add").fill("3");
  await page.getByRole("button", { name: "Add stock" }).click();
  await expect(card).toContainText("3 in stock");
  await card.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete vehicle", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No vehicles found" }),
  ).toBeVisible();
});

test("registration creates a customer and validates wrong credentials", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Email address").fill("missing@example.com");
  await page.getByLabel("Password", { exact: true }).fill("WrongPassword123!");
  await page.getByRole("button", { name: "Sign in →" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Incorrect email or password",
  );
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Email address").fill(`new-${Date.now()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("NewPassword123!");
  await page.getByRole("button", { name: "Create account →" }).click();
  await expect(
    page.getByRole("heading", { name: /A car for every/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "＋ Add vehicle" }),
  ).toHaveCount(0);
});

test("filters handle empty results and invalid price ranges", async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole("button", { name: "Sedan", exact: true }).click();
  await expect(page.locator(".vehicle-card")).toHaveCount(1);
  await page.getByLabel("Minimum price").fill("50000");
  await page.getByLabel("Maximum price").fill("10000");
  await expect(page.getByRole("alert")).toContainText(
    "Minimum price must not exceed",
  );
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page.locator(".vehicle-card")).toHaveCount(6);
  await page.getByLabel("Search vehicles").fill("nonexistent-brand");
  await expect(
    page.getByRole("heading", { name: "No vehicles found" }),
  ).toBeVisible();
});

test("desktop and mobile layouts have no overflow and provide screenshots", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.screenshot({
    path: "../docs/screenshots/sign-in.png",
    fullPage: true,
  });
  await signIn(page);
  await expect(page.locator(".vehicle-card")).toHaveCount(6);
  await page.screenshot({
    path: "../docs/screenshots/inventory-desktop.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../docs/screenshots/inventory-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "＋ Add vehicle" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(errors).toEqual([]);
});
