import { chromium, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
const server = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "5175"],
  { stdio: "ignore" },
);
let browser;
try {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch("http://127.0.0.1:5175/")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ hasTouch: true });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5175/");
  if (await page.locator("audio").count())
    throw Error("Audio created before gesture");
  await page.locator("#quality").click();
  await expect(page.locator("#menu")).toBeVisible();
  for (const key of ["k", "p", "Space", "ArrowLeft"]) {
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press(key);
    await expect(page.locator("#menu")).toBeHidden();
    await expect(page.locator("#overlay")).toBeHidden();
    await expect(page.locator("body")).not.toHaveClass(/boosting/);
    await page.locator("#pause").click();
    await page.locator("#home").click();
    await expect(page.locator("#menu")).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.touchscreen.tap(360, 400);
  await expect(page.locator("#menu")).toBeHidden();
  await page.locator("#pause").click();
  await page.locator("#home").click();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.mouse.click(1100, 400);
  await expect(page.locator("#menu")).toBeHidden();
  await expect
    .poll(() => page.locator("#soundtrack").evaluate((a) => a.currentTime), {
      timeout: 15000,
    })
    .toBeGreaterThan(0.1);
  const source = await page
    .locator("#soundtrack")
    .evaluate((a) => a.currentSrc);
  if (!decodeURIComponent(source).includes("Formula 1 — Hans Zimmer"))
    throw Error("Wrong soundtrack");
  await page.locator("#pause").click();
  const pausedAt = await page
    .locator("#soundtrack")
    .evaluate((a) => a.currentTime);
  await page.waitForTimeout(350);
  await expect(page.locator("#soundtrack")).toHaveJSProperty("paused", true);
  const stoppedAt = await page
    .locator("#soundtrack")
    .evaluate((a) => a.currentTime);
  if (Math.abs(stoppedAt - pausedAt) > 0.1) throw Error("Pause advanced music");
  await page.locator("#retry").click();
  await expect
    .poll(() => page.locator("#soundtrack").evaluate((a) => a.currentTime))
    .toBeGreaterThan(stoppedAt + 0.1);
  await page.locator("#music").click();
  await expect(page.locator("#soundtrack")).toHaveJSProperty("paused", true);
  await page.locator("#music").click();
  await expect(page.locator("#soundtrack")).toHaveJSProperty("paused", false);
  await page.locator("#pause").click();
  await page.locator("#home").click();
  await expect(page.locator("#soundtrack")).toHaveJSProperty("paused", true);
  await page.locator("#demo").click();
  await expect
    .poll(() => page.locator("#soundtrack").evaluate((a) => a.currentTime))
    .toBeLessThan(1);
  await expect(page.locator("#soundtrack")).toHaveJSProperty("paused", false);
  const result = {
    errors,
    source: decodeURIComponent(source).split("/").at(-1),
    checks: [
      "no music before gesture",
      "arbitrary key, P, Space and arrow start without extra game actions",
      "background click and mobile tap start",
      "settings remain usable and garage does not auto-restart",
      "supplied WebM decoded and playback time advanced",
      "pause freezes playback",
      "resume continues position",
      "music off/on",
      "garage stops music",
      "new run restarts music",
    ],
    audibleOutput: "Not assessed in headless Chrome",
  };
  if (errors.length) throw Error(errors.join("\n"));
  await writeFile("qa/audio-report.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser?.close();
  server.kill();
}
