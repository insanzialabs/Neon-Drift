import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5174/");
  await page.waitForTimeout(1800);
  await page.screenshot({ path: "qa/desktop-garage.png" });
  await page.locator("#start").click();
  await page.waitForTimeout(1000);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("p");
  if (
    !(await page
      .locator("#overlay-title")
      .textContent()
      .then((v) => v === "CITY ON HOLD."))
  )
    throw Error("Pause failed");
  await page.locator("#retry").click();
  await page.keyboard.down("Space");
  await page.waitForTimeout(700);
  await page.keyboard.up("Space");
  await page.screenshot({ path: "qa/desktop-racing.png" });
  await page.locator("#pause").click();
  await page.locator("#home").click();
  await page.locator("#start").click();
  await page.waitForTimeout(13000);
  if (!(await page.locator("#overlay").isVisible()))
    throw Error("Expected natural crash");
  await page.screenshot({ path: "qa/crash.png" });
  await page.locator("#retry").click();
  if (!(await page.locator("#score").isVisible())) throw Error("Retry failed");
  await page.locator("#pause").click();
  await page.locator("#home").click();
  const bestBeforeDemo = await page.evaluate(() =>
    localStorage.getItem("neon-best"),
  );
  await page.locator("#demo").click();
  await page.waitForTimeout(9000);
  await page.screenshot({ path: "qa/tunnel.png" });
  await page.waitForTimeout(8500);
  await page.screenshot({ path: "qa/showcase.png" });
  const demoState = {
    sector: await page.locator("#sector").textContent(),
    near: await page.locator("#near").textContent(),
    crashed: await page.locator("#overlay").isVisible(),
  };
  if (
    demoState.crashed ||
    Number(demoState.near) < 3 ||
    !demoState.sector.includes("SKYBRIDGE")
  )
    throw Error("Showcase failed to reach the bridge with real near misses");
  if (
    (await page.evaluate(() => localStorage.getItem("neon-best"))) !==
    bestBeforeDemo
  )
    throw Error("Showcase changed best score");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#pause").click();
  await page.locator("#home").click();
  await page.screenshot({ path: "qa/mobile-garage.png" });
  await page.locator("#start").click();
  await page.locator("#right").dispatchEvent("pointerdown");
  await page.waitForTimeout(800);
  await page.screenshot({ path: "qa/mobile-racing.png" });
  if (!(await page.locator("#left").isVisible()))
    throw Error("Mobile controls unavailable");
  await page.evaluate(() =>
    document
      .querySelector("canvas")
      .dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
  );
  if (!(await page.locator("#fallback").isVisible()))
    throw Error("Context loss fallback failed");
  const result = {
    errors,
    demoState,
    checks: [
      "desktop garage",
      "start",
      "steer",
      "pause/resume",
      "boost",
      "natural collision",
      "retry",
      "showcase",
      "mobile garage",
      "mobile controls",
      "context-loss fallback",
    ],
  };
  await fs.writeFile("qa/browser-report.json", JSON.stringify(result, null, 2));

  if (errors.length) throw Error(errors.join("\n"));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
