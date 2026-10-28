import { expect as baseExpect, test } from "@playwright/test";
import { cancelParity, cancelParityMatchers } from "../../src/index.ts";
import { fairCancelFlow, signupFlow, unfairCancelFlow } from "../fixtures/flows.ts";
import { serve } from "../fixtures/serve.ts";

const expect = baseExpect.extend(cancelParityMatchers);

let site: Awaited<ReturnType<typeof serve>>;
let pay: Awaited<ReturnType<typeof serve>>;

test.beforeAll(async () => {
  site = await serve();
  pay = await serve();
});

test.afterAll(async () => {
  await site.close();
  await pay.close();
});

test("the fair StreamFlix pair has cancel parity", async ({ browser }, info) => {
  const report = await cancelParity(
    { flows: { signup: signupFlow(site.url, pay.url), cancel: fairCancelFlow(site.url) } },
    { browser, outDir: info.outputPath("fair") },
  );
  expect(report).toHaveCancelParity();
});

test("the unfair StreamFlix pair fails toHaveCancelParity with both values named", async ({ browser }, info) => {
  const report = await cancelParity(
    { flows: { signup: signupFlow(site.url, pay.url), cancel: unfairCancelFlow(site.url) } },
    { browser, outDir: info.outputPath("unfair") },
  );
  expect(report).not.toHaveCancelParity();
  expect(() => expect(report).toHaveCancelParity()).toThrow(/cancel took 5 screens, sign-up took 3/);
});
