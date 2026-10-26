import { test } from "node:test";
import assert from "node:assert/strict";
import { changeRatio, Recorder } from "../src/recorder.ts";

test("changeRatio counts the share of words that differ", () => {
  assert.equal(changeRatio("a b c d", "a b c d"), 0);
  assert.equal(changeRatio("a b c d", "w x y z"), 1);
  assert.equal(changeRatio("a b c d", "a b x y"), 0.5);
  assert.equal(changeRatio("", ""), 0);
});

test("a URL change only starts a screen after the user did something", () => {
  const r = new Recorder(0.5);
  assert.equal(r.navigated("https://app.example.com/login"), true);
  assert.equal(r.navigated("https://app.example.com/home?token=abc#x"), false); // redirect, no action
  assert.equal(r.screens.length, 1);
  assert.equal(r.screens[0].url, "https://app.example.com/home");
  r.click();
  assert.equal(r.navigated("https://app.example.com/account"), true);
  assert.equal(r.screens.length, 2);
});

test("content that settles on its own is not a screen; a large change after an action is", () => {
  const r = new Recorder(0.5);
  r.navigated("https://app.example.com/");
  assert.equal(r.content("Loading"), false); // first text is the baseline
  assert.equal(r.content("Your plan Standard monthly"), false); // hydration, no action
  r.click();
  assert.equal(r.content("Your plan Standard monthly Next charge"), false); // below the threshold
  assert.equal(r.content("Tell us why you are leaving"), true);
  assert.deepEqual(
    r.screens.map((s) => s.clicks),
    [1, 0],
  );
});
