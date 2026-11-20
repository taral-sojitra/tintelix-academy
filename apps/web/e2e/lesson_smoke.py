"""Smoke test for the Caching lesson against a running server.

Usage: python3 apps/web/e2e/lesson_smoke.py http://localhost:3123
Runs every check, prints ok or FAIL for each, and exits non-zero if any failed.
"""
import asyncio
import re
import sys
import urllib.request

from playwright.async_api import async_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3123"
STAGE_READY = ".stage-host[data-ready='true']"


async def lesson_flow(page):
    await page.goto(BASE + "/system-design/caching", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Survive the flash sale")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Cache-aside, in slow motion")
    slider = page.locator("#ctl-hitRate")
    await expect(slider).to_be_enabled()
    await slider.focus()
    await page.keyboard.press("Home")
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowLeft")
    await expect(page.locator("[data-tile='load'] .tx-v")).to_have_text("92%", timeout=6000)
    await expect(page.locator(".narr h2")).to_have_text("Cache-aside, in slow motion")
    await page.reload(wait_until="load")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator(".narr h2")).to_have_text("Cache-aside, in slow motion")
    return "lesson loads; arrows step; slider at 0% shows 92% load without changing the step; reload resumes step 3"


async def chart_matches_model(page):
    await page.goto(BASE + "/system-design/caching", wait_until="load")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await page.evaluate("document.querySelector('.stage-host').scrollIntoView()")
    await page.wait_for_timeout(1500)
    seen = set()
    for _ in range(12):
        seen.add(await page.locator(".tx-chartv").inner_text())
        await page.wait_for_timeout(200)
    assert seen == {"92%"}, f"chart label read {sorted(seen)} while the step says 92%"
    return "chart label holds at the model's 92%"


async def unknown_lesson_404(page):
    res = await page.goto(BASE + "/system-design/nope", wait_until="load")
    assert res is not None and res.status == 404, f"expected 404, got {res.status if res else None}"
    return "unknown lesson is a 404"


async def cheatsheet_numbers(page):
    res = await page.goto(BASE + "/system-design/caching/cheatsheet", wait_until="load")
    assert res is not None and res.status == 200
    await expect(page.get_by_text("the database serves 1,080 a second and is 17% busy")).to_be_visible()
    return "cheatsheet quotes the model's numbers"


async def light_pages_skip_engine(page):
    engine_markers = ["ALL KEYS EXPIRED", "$ZodType"]
    for path in ["/", "/system-design", "/components"]:
        html = urllib.request.urlopen(BASE + path).read().decode()
        for src in set(re.findall(r'src="(/_next/static/[^"]+\.js)"', html)):
            body = urllib.request.urlopen(BASE + src).read().decode()
            hits = [m for m in engine_markers if m in body]
            assert not hits, f"{path} loads {src}, which contains {hits}"
    return "Home, subject and components pages load neither the stage engine nor Zod"


async def main() -> None:
    failed = 0
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path="/usr/bin/google-chrome")
        for check in [lesson_flow, chart_matches_model, unknown_lesson_404, cheatsheet_numbers, light_pages_skip_engine]:
            ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
            page = await ctx.new_page()
            errors: list[str] = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            try:
                msg = await check(page)
                assert not errors, f"page errors: {errors}"
                print(f"ok: {msg}")
            except Exception as e:  # noqa: BLE001 - report every check
                failed += 1
                print(f"FAIL {check.__name__}: {str(e).splitlines()[0]}")
            await ctx.close()
        await browser.close()
    sys.exit(1 if failed else 0)


asyncio.run(main())
