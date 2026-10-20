import { chromium, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), "../../.."));
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
      String(5190 + i),
    ],
    { cwd, stdio: "ignore" },
  ),
);
let browser;
const reports = [];
try {
  for (let i = 0; i < 2; i++)
    for (let n = 0; n < 50; n++) {
      try {
        if ((await fetch(`http://127.0.0.1:${5190 + i}`)).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  for (let i = 0; i < 2; i++) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      for (const k of [
        "neon-soundtrack",
        "neon-sfx",
        "sonic-music",
        "sonic-sfx",
      ])
        localStorage.setItem(k, "off");
    });
    await page.goto(`http://127.0.0.1:${5190 + i}`);
    if (i) await expect(page.locator("#loading")).toBeHidden();
    const dir = `${roots[i]}/qa/evolution`;
    await mkdir(dir, { recursive: true });
    await page.locator("#activity").selectOption(i ? "rush" : "sprint");
    await expect(page.locator("#menu")).toBeVisible();
    await page.reload();
    if (i) await expect(page.locator("#loading")).toBeHidden();
    await expect(page.locator("#activity")).toHaveValue(i ? "rush" : "sprint");
    await page.locator("#help").click();
    await expect(
      page.locator(
        i ? "#trail option[value=ion]" : "#livery option[value=ion]",
      ),
    ).toBeDisabled();
    await page.locator("#close-guide").click();
    await page.screenshot({ path: `${dir}/01-menu.png` });
    for (const [width, height] of [
      [320, 740],
      [390, 844],
      [844, 390],
    ]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(100);
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )
      )
        throw Error(`horizontal overflow ${i} ${width}`);
      const start = await page.locator("#start").boundingBox();
      if (start.y + start.height > height - 20)
        throw Error(`start clipped ${i} ${width}: ${JSON.stringify(start)}`);
      await page.screenshot({ path: `${dir}/menu-${width}x${height}.png` });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.clock.install({ time: new Date("2026-10-20T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-20T00:00:01Z"));
    await page.locator("#start").click();
    if (!i) {
      await page.keyboard.press("ArrowLeft");
      await page.clock.runFor(1600);
      await expect(page.locator("#draft-label")).toHaveText(
        "SURGE READY · CHANGE LANE",
      );
      await page.keyboard.press("ArrowRight");
      await page.clock.runFor(100);
      await expect(page.locator("#draft-label")).toContainText("FREE SURGE");
      await page.screenshot({ path: `${dir}/02-player-surge.png` });
    }
    await page.locator("#pause").click();
    await page.locator("#home").click();
    const before = await page.evaluate(() =>
      JSON.stringify(
        Object.fromEntries(
          Object.entries(localStorage).filter(
            ([k]) =>
              k.includes("best") ||
              k.includes("badges") ||
              k.includes("rush-") ||
              k.includes("sprint-"),
          ),
        ),
      ),
    );
    await page.locator("#demo").click();
    let skillSeen = false;
    for (let step = 0; step < 61; step++) {
      await page.clock.runFor(1000);
      const notice = await page.locator("#notice").textContent();
      if (
        !skillSeen &&
        notice.includes(i ? "AIR DASH" : "SLIPSTREAM RELEASE")
      ) {
        skillSeen = true;
        await page.screenshot({ path: `${dir}/02-skill-play.png` });
      }
    }
    await page.screenshot({ path: `${dir}/03-challenge-result.png` });
    await expect(
      page.locator(i ? "#result-title" : "#overlay-title"),
    ).toContainText("COMPLETE");
    await expect(
      page.locator(i ? "#result-kicker" : "#overlay-kicker"),
    ).toContainText("NO REWARDS SAVED");
    const after = await page.evaluate(() =>
      JSON.stringify(
        Object.fromEntries(
          Object.entries(localStorage).filter(
            ([k]) =>
              k.includes("best") ||
              k.includes("badges") ||
              k.includes("rush-") ||
              k.includes("sprint-"),
          ),
        ),
      ),
    );
    if (before !== after) throw Error("showcase earned records or rewards");
    if (!skillSeen)
      throw Error(`showcase did not demonstrate new skill for ${i}`);
    await page.keyboard.press("r");
    await expect(page.locator("#overlay")).toBeHidden();
    await page.locator("#pause").click();
    await page.locator("#home").click();
    await page.locator("#help").click();
    await page.screenshot({ path: `${dir}/04-collection.png` });
    await page.locator("#close-guide").click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#start").click();
    await page.clock.runFor(500);
    await page.screenshot({ path: `${dir}/05-mobile-play.png` });
    if (i) await expect(page.locator("#dash")).toBeVisible();
    else await expect(page.locator("#draft-hud")).toBeVisible();
    const first = await page.locator(i ? "#dash" : "#draft-hud").boundingBox();
    const second = await page.locator(i ? "#jump" : ".speed").boundingBox();
    if (
      first.x < second.x + second.width &&
      first.x + first.width > second.x &&
      first.y < second.y + second.height &&
      first.y + first.height > second.y
    )
      throw Error("Mobile skill HUD/control overlap");
    await page.locator("#pause").click();
    await page.locator("#home").click();
    // Explicit prior-save fixture tests display/persistence, not earned gameplay.
    await page.evaluate((sonic) => {
      localStorage.setItem(
        sonic ? "sonic-rush-arcade" : "neon-sprint-arcade",
        JSON.stringify({
          score: sonic ? 35 : 10000,
          medal: "SILVER",
          badges: [],
        }),
      );
      localStorage.setItem(
        sonic ? "sonic-badges-arcade" : "neon-badges-arcade",
        JSON.stringify({ badges: [sonic ? "Sky dancer" : "Wake rider"] }),
      );
    }, !!i);
    await page.reload();
    if (i) await expect(page.locator("#loading")).toBeHidden();
    await expect(page.locator("#best")).toHaveText(i ? "35 RINGS" : "010000");
    await page.locator("#help").click();
    await page.locator(i ? "#trail" : "#livery").selectOption("ion");
    await page.locator("#close-guide").click();
    await page.reload();
    if (i) await expect(page.locator("#loading")).toBeHidden();
    await page.locator("#help").click();
    await expect(page.locator(i ? "#trail" : "#livery")).toHaveValue("ion");
    if (errors.length) throw Error(errors.join("\n"));
    reports.push({
      game: roots[i],
      errors,
      checks: [
        "format persists without accidental start",
        "locked cosmetic options",
        "320/390 portrait and short landscape menus fit",
        "60-second showcase challenge finishes",
        "showcase results explicitly labelled and no records/rewards saved",
        "R retry after success",
        "new skill demonstrated with normal simulation",
        "mobile skill HUD visible and controls do not overlap",
        "prior-save fixture displays record and unlocks a cosmetic that persists",
      ],
      skillSeen,
      limits: [
        "earned medal scoring and badge rules verified by unit tests; browser finish uses labelled showcase",
        "not a physical phone or speaker test",
      ],
    });
    await writeFile(
      `${dir}/report.json`,
      JSON.stringify(reports.at(-1), null, 2),
    );
    await page.close();
  }
  console.log(JSON.stringify(reports, null, 2));
} finally {
  await browser?.close();
  servers.forEach((s) => s.kill());
}
