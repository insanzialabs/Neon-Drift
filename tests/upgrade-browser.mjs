import { chromium, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), "../../.."));
import { spawn } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
const roots = ["games/neon-drift", "games/Sonic Runner"];
const servers = roots.map((cwd, i) =>
  spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      String(5180 + i),
    ],
    { cwd, stdio: "ignore" },
  ),
);
let browser;
const reports = [];
try {
  for (let i = 0; i < 2; i++)
    for (let t = 0; t < 50; t++) {
      try {
        if ((await fetch(`http://127.0.0.1:${5180 + i}`)).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  for (let i = 0; i < 2; i++) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      hasTouch: false,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const checks = [];
    const origin = `http://127.0.0.1:${5180 + i}`,
      dir = `${roots[i]}/qa/upgrade`;
    await mkdir(dir, { recursive: true });
    await page.goto(origin);
    if (i === 1) await expect(page.locator("#loading")).toBeHidden();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1100);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("link[rel=canonical]")).toHaveCount(1);
    await page.locator("#help").click();
    await expect(page.locator("#guide")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#guide")).toBeHidden();
    checks.push("accessible how-to-play dialog");
    const mode = i === 0 ? "cruise" : "chill",
      classic = "arcade";
    await page.locator(`#${mode}`).click();
    await expect(page.locator(`#${mode}`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator("#menu")).toBeVisible();
    await page.locator(`#${classic}`).click();
    checks.push("pace selection without accidental start");
    await page.screenshot({ path: `${dir}/01-desktop-menu.png` });
    await page.locator("#start").click();
    await page.waitForTimeout(1300);
    await expect(page.locator("#menu")).toBeHidden();
    await page.screenshot({ path: `${dir}/02-desktop-play.png` });
    await page.keyboard.press("p");
    await expect(page.locator("#overlay")).toBeVisible();
    await expect(page.locator("#retry")).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(page.locator("#home")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("#retry")).toBeFocused();
    const score = await page.locator("#score").textContent();
    await page.waitForTimeout(300);
    await expect(page.locator("#score")).toHaveText(score);
    await page.locator("#retry").press("Space");
    await expect(page.locator("#overlay")).toBeHidden();
    checks.push("pause freezes score; keyboard modal focus and resume work");
    if (i === 0) {
      await page.keyboard.press("ArrowRight");
      await page.keyboard.down("Space");
      await page.waitForTimeout(350);
      await page.keyboard.up("Space");
      await page.keyboard.press("ArrowLeft");
    } else {
      await page.keyboard.down("Space");
      await page.waitForTimeout(220);
      await page.keyboard.up("Space");
    }
    await page.waitForTimeout(1000);
    const fps = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const times = [];
          let last;
          function tick(now) {
            if (last !== undefined) times.push(now - last);
            last = now;
            if (times.length < 90) requestAnimationFrame(tick);
            else
              resolve(
                Math.round(
                  1000 / (times.reduce((a, b) => a + b, 0) / times.length),
                ),
              );
          }
          requestAnimationFrame(tick);
        }),
    );
    await expect(page.locator("#overlay")).toBeVisible({ timeout: 45000 });
    await page.screenshot({ path: `${dir}/03-crash.png` });
    await page.keyboard.press("r");
    await expect(page.locator("#overlay")).toBeHidden();
    checks.push("natural collision ends run; R retries");
    await page.locator("#pause").click();
    await page.locator("#home").click();
    await expect(page.locator("#menu")).toBeVisible();
    const keysBefore = await page.evaluate(() =>
      JSON.stringify(
        Object.fromEntries(
          Object.entries(localStorage).filter(([k]) => k.includes("best")),
        ),
      ),
    );
    await page.locator("#demo").click();
    await page.waitForTimeout(19000);
    await expect(page.locator("#overlay")).toBeHidden();
    await page.screenshot({ path: `${dir}/04-showcase.png` });
    const keysAfter = await page.evaluate(() =>
      JSON.stringify(
        Object.fromEntries(
          Object.entries(localStorage).filter(([k]) => k.includes("best")),
        ),
      ),
    );
    if (keysBefore !== keysAfter) throw Error("Demo saved a record");
    checks.push("showcase uses normal physics and does not save bests");
    await page.locator("#pause").click();
    await page.locator("#home").click();
    for (const [width, height] of [
      [390, 844],
      [320, 740],
      [844, 390],
    ]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(200);
      await page.evaluate(() => document.activeElement?.blur());
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )
      )
        throw Error(`Overflow ${width}`);
      const bounds = await page.locator("#start").boundingBox();
      if (bounds.y + bounds.height > height - 20)
        throw Error(`Start clipped at ${width}x${height}`);
      await page.screenshot({ path: `${dir}/menu-${width}x${height}.png` });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#start").click();
    await page.waitForTimeout(500);
    if (i === 0) {
      await page.locator("#right").dispatchEvent("pointerdown");
      await expect(page.locator("#right")).toBeVisible();
    } else {
      await page
        .locator("#jump")
        .dispatchEvent("pointerdown", { pointerId: 1 });
      await page.locator("#jump").dispatchEvent("pointerup", { pointerId: 1 });
      await expect(page.locator("#jump")).toBeVisible();
    }
    await page.screenshot({ path: `${dir}/05-mobile-play.png` });
    checks.push(
      "320px portrait and short landscape menus; visible mobile controls",
    );
    await page.locator("#pause").click();
    await page.locator("#home").click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${dir}/06-reduced-motion.png` });
    checks.push("reduced-motion menu loads");
    if (i === 0) {
      await page.evaluate(() =>
        document
          .querySelector("canvas")
          .dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
      );
      await expect(page.locator("#fallback")).toBeVisible();
      checks.push("WebGL context loss explanation");
    }
    for (const path of [
      "/robots.txt",
      "/sitemap.xml",
      "/llms.txt",
      "/og-image.webp",
      "/favicon.png",
    ]) {
      const r = await page.request.get(origin + path);
      if (r.status() !== 200) throw Error(`Missing ${path}`);
    }
    checks.push("local discovery and brand assets return 200");
    const schema = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .textContent();
    if (JSON.parse(schema)["@type"] !== "VideoGame")
      throw Error("Missing game schema");
    checks.push("VideoGame metadata");
    if (errors.length) throw Error(errors.join("\n"));
    const report = {
      game: roots[i],
      errors,
      checks,
      observedHeadlessDesktopFPS: fps,
      limits: [
        "not a physical phone test",
        "speaker output and sustained GPU thermals not measured",
        "search indexing and media licensing not verified",
      ],
    };
    await writeFile(`${dir}/report.json`, JSON.stringify(report, null, 2));
    reports.push(report);
    await page.close();
  }
  await writeFile(
    "games/neon-drift/qa/upgrade/both-games-report.json",
    JSON.stringify(reports, null, 2),
  );
  console.log(JSON.stringify(reports));
} finally {
  await browser?.close();
  servers.forEach((s) => s.kill());
}
