"""Smoke test for the Caching lesson against a running server.

Usage: python3 apps/web/e2e/lesson_smoke.py http://localhost:3123
Exits non-zero on the first failed check.
"""
import asyncio
import sys

from playwright.async_api import async_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3123"


async def main() -> None:
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path="/usr/bin/google-chrome")
        ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await ctx.new_page()
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        await page.goto(BASE + "/system-design/caching", wait_until="load")
        await expect(page.get_by_role("heading", level=1)).to_have_text("Survive the flash sale")
        await page.wait_for_selector(".stage-host[data-ready='true']", timeout=10000)
        print("ok: lesson loads and the player is ready")

        await page.keyboard.press("ArrowRight")
        await page.keyboard.press("ArrowRight")
        await expect(page.locator(".narr h2")).to_have_text("Cache-aside, in slow motion")
        print("ok: ArrowRight twice reaches step 3")

        slider = page.locator("#ctl-hitRate")
        await expect(slider).to_be_enabled()
        await slider.focus()
        await page.keyboard.press("Home")
        await page.keyboard.press("ArrowRight")
        await page.keyboard.press("ArrowLeft")
        await expect(page.locator("[data-tile='load'] .tx-v")).to_have_text("92%", timeout=6000)
        await expect(page.locator(".narr h2")).to_have_text("Cache-aside, in slow motion")
        print("ok: slider to 0% shows 92% DB load, and arrow keys on the slider did not change the step")

        await page.reload(wait_until="load")
        await page.wait_for_selector(".stage-host[data-ready='true']", timeout=10000)
        await expect(page.locator(".narr h2")).to_have_text("Cache-aside, in slow motion")
        print("ok: reload returns to step 3")

        res = await page.goto(BASE + "/system-design/nope", wait_until="load")
        assert res is not None and res.status == 404, f"expected 404, got {res.status if res else None}"
        print("ok: unknown lesson is a 404")

        res = await page.goto(BASE + "/system-design/caching/cheatsheet", wait_until="load")
        assert res is not None and res.status == 200
        await expect(page.locator(".sheet-card").first).to_be_visible()
        await expect(page.get_by_text("the database serves 1,080 a second and is 17% busy")).to_be_visible()
        print("ok: cheatsheet quotes the model's numbers")

        assert not errors, f"page errors: {errors}"
        await browser.close()


asyncio.run(main())
