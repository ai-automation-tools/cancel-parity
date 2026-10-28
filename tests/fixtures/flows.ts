import type { Page } from "@playwright/test";

// The parity fixture pair, shared by the node:test suite and the
// @playwright/test matcher spec. `site` and `pay` are the two local origins.
//
// Sign-up: 3 screens, 2 clicks, 2 typed fields; the middle screen is the
// sandbox payment page on the second origin, so 2 screens, 1 click and 1 typed
// field without it. Fair cancel: 3 screens, 2 clicks. Unfair cancel: 5 screens,
// 4 clicks, 1 typed field (a retention offer and an exit survey on the way).

export function signupFlow(site: string, pay: string) {
  const payUrl = `${pay}xorigin/pay.html?return=${encodeURIComponent(`${site}parity/welcome.html`)}`;
  return async (page: Page) => {
    await page.goto(`${site}parity/signup.html?pay=${encodeURIComponent(payUrl)}`);
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByRole("button", { name: "Continue to payment" }).click();
    await page.getByLabel("Name on card").fill("Test User");
    await page.getByRole("link", { name: "Return" }).click();
    await page.getByRole("heading", { name: "Welcome" }).waitFor();
  };
}

export function fairCancelFlow(site: string) {
  return async (page: Page) => {
    await page.goto(`${site}parity/account.html`);
    await page.getByRole("link", { name: "Cancel plan" }).click();
    await page.getByRole("link", { name: "Confirm cancellation" }).click();
    await page.getByRole("heading", { name: "cancelled" }).waitFor();
  };
}

export function unfairCancelFlow(site: string) {
  return async (page: Page) => {
    await page.goto(`${site}parity/account-unfair.html`);
    await page.getByRole("link", { name: "Cancel plan" }).click();
    await page.getByRole("link", { name: "No thanks" }).click();
    await page.getByLabel("Reason").fill("Too expensive");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("link", { name: "Confirm cancellation" }).click();
    await page.getByRole("heading", { name: "cancelled" }).waitFor();
  };
}
