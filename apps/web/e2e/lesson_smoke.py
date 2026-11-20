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


async def cdn_flow(page):
    await page.goto(BASE + "/system-design/cdn", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Serve Mumbai from Mumbai")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='page'] .tx-v")).to_have_text("787 ms")
    ttl_panel = page.locator("section.try", has=page.locator("#ctl-ttlSec"))
    await expect(ttl_panel.locator(".try-readout")).to_have_text("Unlocks at step 5")
    await page.evaluate("document.querySelector('.stage-host').scrollIntoView()")
    await page.wait_for_timeout(1200)
    seen = set()
    for _ in range(8):
        seen.add(await page.locator(".tx-chartv").inner_text())
        await page.wait_for_timeout(200)
    assert seen == {"787 ms"}, f"chart label read {sorted(seen)} while step 1 says 787 ms"
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Hit or miss, in slow motion")
    await expect(page.locator("#ctl-originKm")).to_be_enabled()
    await page.locator("#ctl-originKm").focus()
    await page.keyboard.press("End")
    km_panel = page.locator("section.try", has=page.locator("#ctl-originKm"))
    await expect(km_panel.locator(".try-readout")).to_contain_text("250 ms")
    await expect(page.locator("[data-tile='rtt'] .tx-v")).to_have_text("250 ms", timeout=6000)
    await page.keyboard.press("Home")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Purge on change, keep pages short")
    await page.locator("#ctl-ttlSec").focus()
    await page.keyboard.press("Home")
    await expect(ttl_panel.locator(".try-readout")).to_contain_text("97%")
    await expect(page.locator("[data-tile='hits'] .tx-v")).to_have_text("97%", timeout=25000)
    return "CDN lesson: 787 ms with no edge, chart agrees, sliders unlock, a 10 s TTL keeps 97% at the edge"


async def cdn_resume_old_price(page):
    await page.goto(BASE + "/system-design/cdn", wait_until="load")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    for _ in range(3):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("The old price won't go away")
    await page.wait_for_timeout(600)  # the step is saved to IndexedDB asynchronously
    await page.reload(wait_until="load")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator(".narr h2")).to_have_text("The old price won't go away")
    await page.evaluate("document.querySelector('.stage-host').scrollIntoView()")
    await expect(page.locator("[data-price='origin']")).to_have_text("₹999", timeout=1500)
    await expect(page.locator("[data-price='origin']")).to_have_text("₹799", timeout=8000)
    return "resuming on the old-price step plays the price change instead of skipping it"


async def cdn_cheatsheet(page):
    res = await page.goto(BASE + "/system-design/cdn/cheatsheet", wait_until="load")
    assert res is not None and res.status == 200
    await expect(page.get_by_text("From Virginia a page takes 787 ms; from a Mumbai edge, 42 ms.")).to_be_visible()
    return "CDN cheatsheet quotes the model's numbers"


async def lesson_switch(page):
    await page.goto(BASE + "/system-design/caching", wait_until="load")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Cache-aside, in slow motion")
    await page.locator("aside.side a", has_text="Serve Mumbai from Mumbai").click()
    await page.wait_for_url("**/system-design/cdn")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator(".narr h2")).to_have_text("Mumbai waits on Virginia")
    await expect(page.locator("[data-tile='page']")).to_have_count(1)
    await expect(page.locator("[data-tile='load']")).to_have_count(0)
    return "switching lessons from Caching step 3 opens CDN fresh at step 1 with its own tiles"


async def subject_page(page):
    await page.goto(BASE + "/system-design", wait_until="load")
    await expect(page.get_by_text("2 open now")).to_be_visible()
    await page.goto(BASE + "/system-design/cdn", wait_until="load")
    await expect(page.get_by_text("2 of 30 open")).to_be_visible()
    return "System Design shows 2 lessons open"


async def main() -> None:
    failed = 0
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path="/usr/bin/google-chrome")
        for check in [lesson_flow, chart_matches_model, unknown_lesson_404, cheatsheet_numbers, light_pages_skip_engine, cdn_flow, cdn_resume_old_price, cdn_cheatsheet, lesson_switch, subject_page]:
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
