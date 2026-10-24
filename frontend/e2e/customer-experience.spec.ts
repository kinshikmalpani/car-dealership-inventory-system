import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, role = "customer") {
  await page.goto("/");
  await page.getByLabel("Email address").fill(`${role}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("E2ePassword123!");
  await page.getByRole("button", { name: "Sign in →" }).click();
  await expect(page.locator(".vehicle-card").first()).toBeVisible();
}

test("customer filters seats, saves cars, compares, and submits a test-drive enquiry", async ({
  page,
}) => {
  await login(page);
  await page.getByLabel("Seating capacity").selectOption("7");
  await expect(page.locator(".vehicle-card")).toHaveCount(1);
  await expect(page.locator(".vehicle-card")).toContainText("Ertiga");
  await page.getByRole("button", { name: "♡ Save", exact: true }).click();
  await page.getByRole("button", { name: "⇄ Compare", exact: true }).click();
  await page.getByRole("link", { name: /^Compare \(/ }).click();
  await expect(page.locator(".comparison-grid")).toContainText("Ertiga");
  await page.getByRole("link", { name: /^Wishlist \(/ }).click();
  await expect(page.locator(".vehicle-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".vehicle-card")).toHaveCount(1);
  await page.getByRole("button", { name: "View details →" }).click();
  await page
    .getByRole("button", { name: "Request test drive", exact: true })
    .click();
  await page.getByLabel("Your name").fill("Rohan Shah");
  await page.getByLabel("Indian mobile number").fill("9876543210");
  await page.getByLabel("City", { exact: true }).fill("Mumbai");
  await page.getByLabel("Preferred date").fill("2099-01-01");
  await page
    .getByRole("button", { name: "Request a test drive", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Enquiry received" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View my enquiries" }).click();
  await expect(page.locator(".enquiry-grid")).toContainText("Ertiga");
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "admin");
  await page
    .getByRole("link", { name: /Test-drive enquiries/, exact: false })
    .first()
    .click();
  await expect(page.locator(".enquiry-grid")).toContainText("Rohan Shah");
  await page.getByLabel("Enquiry status").selectOption("contacted");
  await expect(page.locator(".status-pill")).toHaveText("contacted");
  await page.getByRole("link", { name: /Customers/, exact: false }).click();
  await expect(page.locator(".customer-table")).toContainText(
    "customer@example.com",
  );
});

test("customer desktop and mobile pages have correct imagery, prices, and no internal metrics", async ({
  page,
}) => {
  await login(page);
  await expect(page.locator("main")).not.toContainText(
    "Stock value on this page",
  );
  await expect(page.locator("main")).not.toContainText("MR /");
  await expect(page.locator("main")).not.toContainText("USD");
  await expect(page.locator("main")).toContainText("₹5,83,900.00");
  await expect(page.locator(".vehicle-card img")).toHaveCount(5);
  await expect
    .poll(() =>
      page
        .locator(".vehicle-card img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBeTruthy();
  await page.screenshot({
    path: "../docs/screenshots/customer-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "../docs/screenshots/customer-mobile.png",
    fullPage: true,
  });
  await page.getByLabel("Search vehicles").fill("Tiago");
  await expect(page.locator(".photo-fallback")).toContainText("Tiago.ev");
  await page.getByRole("button", { name: "View details →" }).click();
  await expect(
    page.getByRole("heading", { name: "Tiago.ev", exact: true }),
  ).toBeVisible();
});
