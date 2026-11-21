"""Stage layout check: walks every open System Design lesson, step by step, at desktop and phone
sizes, and fails if anything overlaps: dots or floating labels over boxes, text sticking out of
its box, boxes behind the chart or other overlays, cut-off tile text, or a page that scrolls sideways.

usage: python3 apps/web/e2e/stage_audit.py [BASE] [slug ...]
"""
import asyncio
import os
import re
import sys

from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3123"
ONLY = sys.argv[2:]
AUDIT = open(os.path.join(os.path.dirname(__file__), "stage_audit.js")).read()
VIEWPORTS = [("desktop", 1440, 900), ("phone", 390, 844)]
SAMPLES, EVERY_MS, WORKERS = 8, 400, 4
CHROME = "/usr/bin/google-chrome" if os.path.exists("/usr/bin/google-chrome") else None


async def lessons(browser):
    page = await browser.new_page()
    await page.goto(BASE + "/system-design", wait_until="load")
    hrefs = await page.eval_on_selector_all("a[href^='/system-design/']", "els => els.map(e => e.getAttribute('href'))")
    await page.close()
    slugs = []
    for h in hrefs:
        m = re.fullmatch(r"/system-design/([a-z0-9-]+)", h or "")
        if m and m.group(1) not in slugs:
            slugs.append(m.group(1))
    return [s for s in slugs if not ONLY or s in ONLY]


async def check(browser, slug):
    found = []
    for vp, w, h in VIEWPORTS:
        ctx = await browser.new_context(viewport={"width": w, "height": h})
        await ctx.add_init_script(AUDIT)
        page = await ctx.new_page()
        await page.goto(f"{BASE}/system-design/{slug}", wait_until="load")
        await page.wait_for_selector(".stage-host[data-ready='true']", timeout=15000)
        last = None
        for step in range(1, 13):
            await page.wait_for_timeout(600)
            title = await page.locator(".narr h2").inner_text()
            if title == last:
                break
            seen = set()
            for _ in range(SAMPLES):
                for i in (await page.evaluate("window.__txAudit()"))["issues"]:
                    key = (i["kind"], i["where"], re.sub(r"[\d.]+px|covers \d+%", "", i["detail"]))
                    if key not in seen:
                        seen.add(key)
                        found.append(f"{slug} [{vp}] step {step}: {i['kind']} at {i['where']}: {i['detail']}")
                await page.wait_for_timeout(EVERY_MS)
            last = title
            await page.locator("body").click(position={"x": 2, "y": 2})
            await page.keyboard.press("ArrowRight")
        await ctx.close()
    return found


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=CHROME)
        slugs = await lessons(browser)
        queue, problems = list(slugs), []

        async def worker():
            while queue:
                slug = queue.pop(0)
                problems.extend(await check(browser, slug))

        await asyncio.gather(*(worker() for _ in range(WORKERS)))
        await browser.close()
    for line in sorted(problems):
        print("FAIL", line)
    print(f"{len(slugs)} lessons checked at desktop and phone sizes: {len(problems)} problems")
    sys.exit(1 if problems else 0)


asyncio.run(main())
