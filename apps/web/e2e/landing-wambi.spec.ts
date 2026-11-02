import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { expect, type Page, test } from "@playwright/test";

/**
 * The 2.5D Wambi on the built landing page, with JavaScript on: the founder's sprite sheets in an
 * overlay that mounts once the page is idle, rolls in once per session, takes each spot's pose
 * (waves, points, thinks, points, celebrates: each gesture once on arriving, nothing loops),
 * never stands over text and never takes clicks but on his body; the prerendered 2D Wambi stays
 * under reduced motion. No WebGL, no three.js. Also the JavaScript budget of `/`.
 */

test.use({ javaScriptEnabled: true });
test.describe.configure({ timeout: 60_000 });

const BUILD = fileURLToPath(new URL("../build/", import.meta.url));
const CLIENT = `${BUILD}client/`;
const BUDGET_GZIP = 300 * 1024;
/** A string every three.js build carries (its renderer's class name survives minification). */
const THREE_SIGNATURE = "WebGLRenderer";

/** Collects console errors and page errors for the whole test. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

/** Gives the idle loader time to decide before asserting an absence. */
async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
}

/** Scrolls so a spot's center sits where it takes over (40% down the viewport). */
async function scrollToSpot(page: Page, id: string) {
  await page.evaluate((spotId) => {
    const spot = document.querySelector<HTMLElement>(`[data-wambi-spot='${spotId}']`);
    const box = spot?.getBoundingClientRect();
    if (!box) throw new Error(`no spot ${spotId}`);
    const top = box.top + window.scrollY + box.height / 2 - window.innerHeight * 0.4 + 2;
    window.scrollTo({ top, behavior: "instant" });
  }, id);
}

/** The computed sheet of the pose he is showing. */
function activeSheet(page: Page) {
  return page
    .locator("[data-wambi-traveler] .lk-traveler-mood.is-active .lk-wambi-sprite")
    .evaluate((el) => getComputedStyle(el).backgroundImage);
}

/** Whether the element's center gets the pointer (nothing covers it). */
function getsThePointer(page: Page, selector: string) {
  return page.locator(selector).evaluate((el) => {
    const box = el.getBoundingClientRect();
    const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return top === el || el.contains(top);
  });
}

async function centerDistance(page: Page, a: string, b: string): Promise<number> {
  const [boxA, boxB] = [await page.locator(a).boundingBox(), await page.locator(b).boundingBox()];
  if (!boxA || !boxB) return Number.POSITIVE_INFINITY;
  return Math.hypot(
    boxA.x + boxA.width / 2 - (boxB.x + boxB.width / 2),
    boxA.y + boxA.height / 2 - (boxB.y + boxB.height / 2),
  );
}

test.describe("2.5D Wambi", () => {
  test("appears after load from the sprite sheets: no canvas, no three.js", async ({ page }) => {
    const errors = collectErrors(page);
    const scripts: string[] = [];
    page.on("response", async (response) => {
      if (response.url().endsWith(".js")) scripts.push(await response.text().catch(() => ""));
    });
    await page.addInitScript(() => sessionStorage.setItem("wambito.entrance", "seen"));
    await page.goto("/");
    const layer = page.locator("[data-wambi-traveler]");
    await expect(layer).toBeVisible({ timeout: 30_000 });
    await expect(layer).toHaveAttribute("aria-hidden", "true");
    await expect(layer).toHaveAttribute("data-spot", "hero");
    await expect(layer).toHaveAttribute("data-pose", "wave");
    await expect(page.locator("html")).toHaveAttribute("data-wambi-live", "live");
    expect(await activeSheet(page)).toContain("/wambi/wave.webp");
    await expect(page.locator("canvas")).toHaveCount(0);
    await page.waitForLoadState("networkidle");
    expect(scripts.length).toBeGreaterThan(0);
    expect(scripts.filter((source) => source.includes(THREE_SIGNATURE))).toEqual([]);

    // He stands where the prerendered Wambi was; the box keeps its accessible name, the sprite hides.
    const slot = page.locator("#hero [data-slot='hero-mascot']");
    await expect(slot).toHaveAttribute("role", "img");
    await expect(slot).toHaveAttribute("aria-label", /.+/);
    await expect(slot.locator(".lk-wambi")).toBeHidden();
    await expect
      .poll(() => centerDistance(page, "#hero [data-slot='hero-mascot']", "[data-wambi-traveler]"))
      .toBeLessThan(8);

    // Only his body takes the pointer: a hover (or tap) makes him hop, and nothing navigates.
    const body = layer.locator(".lk-traveler-hit");
    await expect(layer).toHaveCSS("pointer-events", "none");
    await expect(body).toHaveCSS("pointer-events", "auto");
    await body.hover();
    await body.click();
    await expect(layer.locator(".lk-traveler-hop.is-hopping")).toHaveCount(1);
    await expect(page).toHaveURL(/\/$/);
    expect(await getsThePointer(page, "#hero a.lk-btn-primary")).toBe(true);
    expect(await getsThePointer(page, "#hero a.lk-btn-secondary")).toBe(true);
    expect(errors).toEqual([]);
  });

  test("rolls in once per session, then waves", async ({ page }) => {
    await page.goto("/");
    const layer = page.locator("[data-wambi-traveler]");
    await expect(layer).toBeAttached({ timeout: 30_000 });
    // The text was there first: he only arrives after the page has rendered.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(layer).toHaveAttribute("data-entrance", /playing|done/);
    expect(await page.evaluate(() => sessionStorage.getItem("wambito.entrance"))).toBe("seen");
    await expect(layer).toHaveAttribute("data-entrance", "done", { timeout: 15_000 });
    // Standing and waving: the wave sheet plays, nothing tucked or turned.
    await expect(layer.locator(".lk-traveler-body")).toHaveCSS("clip-path", "none");
    await expect(layer.locator(".lk-traveler-roller")).toHaveCSS("transform", "none");
    await expect(layer.locator(".lk-traveler-mood.is-active .lk-wambi-sprite")).toHaveClass(
      /is-playing/,
    );

    // He waves once, then holds on his first frame; no other pose loops either.
    const standing = layer.locator(".lk-traveler-mood[data-pose='wave'] .lk-wambi-sprite");
    await expect(standing).toHaveClass(/is-once/);
    await expect
      .poll(() => standing.evaluate((el) => el.getAnimations().length), { timeout: 5000 })
      .toBe(0);
    await expect(standing).toHaveCSS("background-position", "0% 0%");
    await expect(layer.locator(".lk-wambi-sprite.is-playing:not(.is-once)")).toHaveCount(0);

    // Same session: no second entrance.
    await page.reload();
    await expect(layer).toBeAttached({ timeout: 30_000 });
    await expect(layer).toHaveAttribute("data-entrance", "skipped");
    await expect(layer.locator(".lk-traveler-roller")).toHaveCSS("transform", "none");
  });

  test("plays each stop's gesture once on arriving, again on each return, then rests", async ({
    page,
  }) => {
    await page.addInitScript(() => sessionStorage.setItem("wambito.entrance", "seen"));
    await page.goto("/");
    const layer = page.locator("[data-wambi-traveler]");
    await expect(layer).toBeVisible({ timeout: 30_000 });
    const active = layer.locator(".lk-traveler-mood.is-active");
    const sprite = active.locator(".lk-wambi-sprite");
    /** No animation left in his pose (sheet or nudge): he rests. */
    const rests = async () => {
      await expect
        .poll(() => active.evaluate((el) => el.getAnimations({ subtree: true }).length), {
          timeout: 5000,
        })
        .toBe(0);
    };
    await rests();
    // Every start of a gesture (a sheet's x track, or the pointing nudge), per pose, from here on.
    await page.evaluate(() => {
      const w = window as unknown as { __gestures: Record<string, number> };
      w.__gestures = {};
      document.addEventListener("animationstart", (event) => {
        const name = event.animationName;
        if (!name.includes("sprite-x") && !name.includes("wambi-nudge")) return;
        const pose = (event.target as HTMLElement).closest<HTMLElement>("[data-pose]")?.dataset
          .pose;
        if (pose) w.__gestures[pose] = (w.__gestures[pose] ?? 0) + 1;
      });
    });
    const gestures = (pose: string) =>
      page.evaluate(
        (p) => (window as unknown as { __gestures: Record<string, number> }).__gestures[p] ?? 0,
        pose,
      );
    const journey = [
      { stop: "ways", pose: "point" },
      { stop: "how", pose: "think" },
      { stop: "faq", pose: "point" },
      { stop: "how", pose: "think" },
      { stop: "hero", pose: "wave" },
    ];
    for (const { stop, pose } of journey) {
      const started = await gestures(pose);
      await scrollToSpot(page, stop);
      await expect(layer).toHaveAttribute("data-spot", stop);
      await expect(layer).toHaveAttribute("data-pose", pose);
      await expect(active).toHaveAttribute("data-pose", pose);
      await expect.poll(() => gestures(pose), { timeout: 5000 }).toBe(started + 1);
      await expect
        .poll(() => centerDistance(page, `[data-wambi-spot='${stop}']`, "[data-wambi-traveler]"))
        .toBeLessThan(8);
      if (pose === "point") {
        // The pointing still: one nudge, no sheet playing at all.
        expect(await activeSheet(page)).toContain("/wambi/pointing.webp");
        await expect(sprite).not.toHaveClass(/is-playing/);
        await expect(active.locator(".lk-wambi")).toHaveClass(/is-nudge/);
      } else {
        // One pass of the sheet, never an endless loop.
        await expect(sprite).toHaveClass(/is-once/);
        expect(await sprite.evaluate((el) => getComputedStyle(el).animationIterationCount)).toBe(
          "2, 1",
        );
      }
      await rests();
      // He rests: waving on frame 0, thinking on frame 5 (three dots), pointing on his still.
      const rest = { wave: "0% 0%", think: "33.333% 100%", point: "0% 0%" }[pose];
      await expect(sprite).toHaveCSS("background-position", rest as string);
      // Nothing more starts while he stands there.
      const after = await gestures(pose);
      await page.waitForTimeout(800);
      expect(await gestures(pose)).toBe(after);
    }
    expect(await activeSheet(page)).toContain("/wambi/wave.webp");
  });

  test("thinks once in how it works, then rests on three dots", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("wambito.entrance", "seen"));
    await page.goto("/");
    const layer = page.locator("[data-wambi-traveler]");
    await expect(layer).toBeVisible({ timeout: 30_000 });
    await scrollToSpot(page, "how");
    await expect(layer).toHaveAttribute("data-pose", "think");
    await expect.poll(() => activeSheet(page)).toContain("/wambi/thinking.webp");
    const sprite = layer.locator(".lk-traveler-mood[data-pose='think'] .lk-wambi-sprite");
    await expect(sprite).toHaveClass(/is-once/);
    // One 1.8s pass: the columns run once per row (900ms), the rows once.
    const timing = await sprite.evaluate((el) =>
      el.getAnimations().map((a) => {
        const t = a.effect?.getComputedTiming();
        return [t?.duration, t?.iterations];
      }),
    );
    expect(timing).toEqual([
      [900, 2],
      [1800, 1],
    ]);
    await expect
      .poll(() => sprite.evaluate((el) => el.getAnimations().length), { timeout: 5000 })
      .toBe(0);
    // Frame 6 of the sheet (index 5): second column, second row.
    await expect(sprite).toHaveCSS("background-position", "33.333% 100%");
  });

  test("points with one nudge at ways and the FAQ, and nothing loops", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("wambito.entrance", "seen"));
    await page.goto("/");
    const layer = page.locator("[data-wambi-traveler]");
    await expect(layer).toBeVisible({ timeout: 30_000 });
    for (const stop of ["ways", "faq"]) {
      await scrollToSpot(page, stop);
      await expect(layer).toHaveAttribute("data-spot", stop);
      await expect(layer).toHaveAttribute("data-pose", "point");
      await expect.poll(() => activeSheet(page)).toContain("/wambi/pointing.webp");
      const wambi = layer.locator(".lk-traveler-mood.is-active .lk-wambi");
      await expect(wambi).toHaveClass(/is-nudge/);
      await expect
        .poll(() => wambi.evaluate((el) => el.getAnimations({ subtree: true }).length), {
          timeout: 3000,
        })
        .toBe(0);
      // Nothing anywhere in him loops: every animation left is finite (the idle bob aside).
      const endless = await layer.evaluate((el) =>
        el
          .getAnimations({ subtree: true })
          .map((a) => [(a as CSSAnimation).animationName, a.effect?.getComputedTiming().iterations])
          .filter(([name, n]) => n === Number.POSITIVE_INFINITY && !String(name).includes("bob")),
      );
      expect(endless).toEqual([]);
    }
  });

  test("skips the entrance when the page is already past the hero", async ({ page }) => {
    // The fragment scrolls the page down while it loads, before he mounts.
    await page.goto("/#closing");
    const layer = page.locator("[data-wambi-traveler]");
    await expect(layer).toHaveAttribute("data-entrance", "skipped", { timeout: 30_000 });
    await expect(layer).toHaveAttribute("data-pose", "celebrate");
  });

  test("thinks in how it works and celebrates once next to the final call to action", async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.addInitScript(() => sessionStorage.setItem("wambito.entrance", "seen"));
    await page.goto("/");
    const layer = page.locator("[data-wambi-traveler]");
    await expect(layer).toBeVisible({ timeout: 30_000 });

    await scrollToSpot(page, "how");
    await expect(layer).toHaveAttribute("data-spot", "how");
    await expect(layer).toHaveAttribute("data-pose", "think");
    await expect.poll(() => activeSheet(page)).toContain("/wambi/thinking.webp");
    await expect
      .poll(() => centerDistance(page, "[data-wambi-spot='how']", "[data-wambi-traveler]"))
      .toBeLessThan(8);

    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }),
    );
    await expect(layer).toHaveAttribute("data-spot", "closing");
    await expect(layer).toHaveAttribute("data-pose", "celebrate");
    await expect.poll(() => activeSheet(page)).toContain("/wambi/celebrate.webp");
    // One celebration, then he rests on frame 4 (fists up): no loop.
    const celebrating = layer.locator(".lk-traveler-mood.is-active .lk-wambi-sprite");
    await expect(celebrating).toHaveClass(/is-once/);
    await expect
      .poll(() => celebrating.evaluate((el) => el.getAnimations().length), { timeout: 5000 })
      .toBe(0);
    await expect(celebrating).toHaveCSS("background-position", "0% 100%");
    const closing = page.locator("[data-wambi-spot='closing']");
    await expect(closing.locator(".lk-wambi")).toBeHidden();
    await expect
      .poll(() => centerDistance(page, "[data-wambi-spot='closing']", "[data-wambi-traveler]"))
      .toBeLessThan(8);

    // Nothing on the page is covered for clicks: the closing button still gets them.
    await page.locator("#closing a.lk-btn").scrollIntoViewIfNeeded();
    expect(await getsThePointer(page, "#closing a.lk-btn")).toBe(true);
    expect(errors).toEqual([]);
  });

  test("never stands over text, at any scroll position", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("wambito.entrance", "seen"));
    await page.goto("/");
    await expect(page.locator("[data-wambi-traveler]")).toBeVisible({ timeout: 30_000 });
    const overlaps = await page.evaluate(async () => {
      const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const layer = document.querySelector<HTMLElement>("[data-wambi-traveler]");
      const turn = layer?.firstElementChild as HTMLElement | null;
      if (!layer || !turn) return ["no layer"];
      const texts: { rect: DOMRect; text: string }[] = [];
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const found: string[] = [];
      for (let top = 0; top <= max + 40; top += 40) {
        window.scrollTo({ top, behavior: "instant" });
        await frame();
        const opacity = Number(turn.style.opacity || 1);
        if (opacity < 0.05) continue;
        // His figure inside the square frame (measured on the sheets), narrowed by an edge-on turn.
        const turned = /rotateY\(([-\d.]+)deg\)/.exec(turn.style.transform);
        const cos = turned ? Math.cos((Number(turned[1]) * Math.PI) / 180) : 1;
        const b = layer.getBoundingClientRect();
        const half = b.width * 0.34 * cos;
        const figure = {
          left: b.left + b.width / 2 - half,
          right: b.left + b.width / 2 + half,
          top: b.top + b.height * 0.07,
          bottom: b.top + b.height * 0.94,
        };
        texts.length = 0;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (!node.textContent?.trim() || layer.contains(node)) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of range.getClientRects()) {
            if (rect.width > 0) texts.push({ rect, text: node.textContent.trim().slice(0, 40) });
          }
        }
        for (const { rect, text } of texts) {
          const hit =
            rect.left < figure.right &&
            rect.right > figure.left &&
            rect.top < figure.bottom &&
            rect.bottom > figure.top;
          if (hit) found.push(`${top}px (${layer.dataset.spot}): ${text}`);
        }
      }
      return [...new Set(found)];
    });
    expect(overlaps).toEqual([]);
  });

  test("causes no layout shift", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { shift: number }).shift = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        })[]) {
          if (!entry.hadRecentInput) (window as unknown as { shift: number }).shift += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto("/");
    const layer = page.locator("[data-wambi-traveler]");
    await expect(layer).toHaveAttribute("data-entrance", "done", { timeout: 30_000 });
    const shift = await page.evaluate(() => (window as unknown as { shift: number }).shift);
    expect(shift).toBeLessThan(0.01);
  });

  test("never leaves a spot empty when a sheet fails to load", async ({ page }) => {
    await page.route("**/wambi/thinking.webp", (route) => route.abort());
    await page.addInitScript(() => sessionStorage.setItem("wambito.entrance", "seen"));
    await page.goto("/");
    await expect(page.locator("[data-wambi-traveler]")).toBeVisible({ timeout: 30_000 });
    await scrollToSpot(page, "how");
    // Give the failed sheet time to fail and the layer time to react.
    await page.waitForTimeout(1500);
    const state = await page.evaluate(async () => {
      const layer = document.querySelector<HTMLElement>("[data-wambi-traveler]");
      if (!layer) {
        const hero = document.querySelector("#hero [data-slot='hero-mascot'] .lk-wambi");
        return {
          steppedAside: true,
          live: document.documentElement.hasAttribute("data-wambi-live"),
          heroVisible: hero ? getComputedStyle(hero).visibility === "visible" : false,
        };
      }
      const sprite = layer.querySelector(".lk-traveler-mood.is-active .lk-wambi-sprite");
      const url = sprite
        ? /url\("?([^")]+)"?\)/.exec(getComputedStyle(sprite).backgroundImage)?.[1]
        : undefined;
      const sheetLoads = await new Promise<boolean>((resolve) => {
        if (!url) return resolve(false);
        const image = new Image();
        image.onload = () => resolve(true);
        image.onerror = () => resolve(false);
        image.src = url;
      });
      return { steppedAside: false, spot: layer.dataset.spot, sheetLoads };
    });
    if (state.steppedAside) {
      // He stepped aside: the prerendered sprites are back.
      expect(state).toEqual({ steppedAside: true, live: false, heroVisible: true });
    } else {
      // He stands on the spot, showing a sheet that actually loaded (the pose he held).
      expect(state).toEqual({ steppedAside: false, spot: "how", sheetLoads: true });
    }
  });

  test("steps aside when reduced motion is switched on while the page is open", async ({
    page,
  }) => {
    await page.addInitScript(() => sessionStorage.setItem("wambito.entrance", "seen"));
    await page.goto("/");
    await expect(page.locator("[data-wambi-traveler]")).toBeVisible({ timeout: 30_000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("[data-wambi-traveler]")).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveAttribute("data-wambi-live", /.*/);
    const sprite = page.locator("#hero [data-slot='hero-mascot'] .lk-wambi-sprite");
    await expect(sprite).toBeVisible();
    expect(await sprite.evaluate((el) => el.getAnimations().length)).toBe(0);
  });

  test("keeps a still frame on every stop under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await settle(page);
    await expect(page.locator("[data-wambi-traveler]")).toHaveCount(0);
    await expect(page.locator("canvas")).toHaveCount(0);
    const stills = [
      ["#hero [data-slot='hero-mascot']", "/wambi/wave.webp", "0% 0%"],
      ["[data-wambi-spot='ways']", "/wambi/pointing.webp", "0% 0%"],
      ["[data-wambi-spot='how']", "/wambi/thinking.webp", "33.333% 100%"],
      ["[data-wambi-spot='faq']", "/wambi/pointing.webp", "0% 0%"],
      ["[data-wambi-spot='closing']", "/wambi/celebrate.webp", "0% 100%"],
    ] as const;
    for (const [spot, sheet, frame] of stills) {
      await page.locator(spot).scrollIntoViewIfNeeded();
      const wambi = page.locator(`${spot} .lk-wambi`);
      const sprite = wambi.locator(".lk-wambi-sprite");
      await expect(sprite).toBeVisible();
      await expect(sprite).toHaveCSS("background-image", new RegExp(sheet.replaceAll(".", "\\.")));
      await expect(sprite).toHaveCSS("background-position", frame);
      expect(await wambi.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
    }
  });
});

interface ManifestChunk {
  file: string;
  src?: string;
  isEntry?: boolean;
  imports?: string[];
  dynamicImports?: string[];
}

test.describe("JavaScript budget", () => {
  test("the initial JavaScript of / stays under 300 KB gzipped, with no three.js anywhere", async ({
    request,
  }, testInfo) => {
    // Vite's manifest is moved out of what ships (react-router.config.ts).
    expect(existsSync(`${CLIENT}.vite`)).toBe(false);
    const manifest = JSON.parse(readFileSync(`${BUILD}vite-manifest.json`, "utf8")) as Record<
      string,
      ManifestChunk
    >;
    const byFile = new Map(Object.entries(manifest).map(([key, chunk]) => [chunk.file, key]));

    // What the prerendered page loads: its module scripts and modulepreloads, plus everything
    // they import statically (never their dynamic imports: those load on demand).
    const html = await (await request.get("/")).text();
    const urls = [
      ...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="\/(assets\/[^"]+\.js)"/g),
      ...html.matchAll(/import\(?\s*"\/(assets\/[^"]+\.js)"/g),
      ...html.matchAll(/from\s*"\/(assets\/[^"]+\.js)"/g),
    ].map((m) => m[1] as string);
    expect(urls.length).toBeGreaterThan(0);

    const initial = new Set<string>();
    const visit = (key: string) => {
      const chunk = manifest[key];
      if (!chunk || initial.has(chunk.file)) return;
      initial.add(chunk.file);
      for (const next of chunk.imports ?? []) visit(next);
    };
    for (const url of urls) {
      const key = byFile.get(url);
      // React Router's route manifest (assets/manifest-*.js) is written after Vite's: count it as is.
      if (key) visit(key);
      else initial.add(url);
    }
    expect([...initial].some((file) => manifest[byFile.get(file) ?? ""]?.isEntry)).toBe(true);

    // The 3D experiment is never built into the site: no chunk at all carries three.js.
    const chunks = readdirSync(`${CLIENT}assets`).filter((file) => file.endsWith(".js"));
    const withThree = chunks.filter((file) =>
      readFileSync(`${CLIENT}assets/${file}`, "utf8").includes(THREE_SIGNATURE),
    );
    expect(withThree).toEqual([]);
    for (const chunk of Object.values(manifest)) {
      expect(chunk.src ?? "").not.toMatch(/node_modules\/(three|@react-three)\/|\/experimental\//);
    }

    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
      .map((m) => m[1] ?? "")
      .join("\n");
    const gzip = (text: string | Buffer) => gzipSync(text, { level: 9 }).length;
    const initialBytes =
      [...initial].reduce((sum, file) => sum + gzip(readFileSync(`${CLIENT}${file}`)), 0) +
      gzip(inline);
    testInfo.annotations.push({
      type: "js-budget",
      description: `initial ${(initialBytes / 1024).toFixed(1)} KB gz (${initial.size} files); ${chunks.length} chunks, none with three.js`,
    });
    console.log(testInfo.annotations.at(-1)?.description);
    expect(initialBytes).toBeLessThan(BUDGET_GZIP);
  });
});
