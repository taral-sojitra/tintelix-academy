"""Screenshot pages of a running Tintelix server with headless Chrome.

Usage: python3 scripts/shoot.py BASE_URL OUT_DIR path[,path...] [--sizes 1440x900,390x844] [--themes warm,blueprint] [--full] [--wait MS] [--keys ArrowRight,ArrowRight]
"""
import argparse
import asyncio
from pathlib import Path

from playwright.async_api import async_playwright


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("base")
    ap.add_argument("out")
    ap.add_argument("paths")
    ap.add_argument("--sizes", default="1440x900,390x844")
    ap.add_argument("--themes", default="warm")
    ap.add_argument("--full", action="store_true")
    ap.add_argument("--wait", type=int, default=600)
    ap.add_argument("--keys", default="")
    a = ap.parse_args()
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path="/usr/bin/google-chrome")
        for theme in a.themes.split(","):
            for size in a.sizes.split(","):
                w, h = (int(x) for x in size.split("x"))
                ctx = await browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=2)
                await ctx.add_init_script(f"try{{localStorage.setItem('tintelix-theme','{theme}')}}catch(e){{}}")
                page = await ctx.new_page()
                errors: list[str] = []
                page.on("pageerror", lambda e: errors.append(str(e)))
                page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
                for path in a.paths.split(","):
                    await page.goto(a.base + path, wait_until="load", timeout=20000)
                    await page.evaluate("document.fonts.ready")
                    for k in [k for k in a.keys.split(",") if k]:
                        await page.keyboard.press(k)
                        await page.wait_for_timeout(250)
                    await page.wait_for_timeout(a.wait)
                    name = (path.strip("/").replace("/", "_") or "home") + f"-{theme}-{w}x{h}.png"
                    await page.screenshot(path=str(out / name), full_page=a.full)
                    overflow = await page.evaluate("document.documentElement.scrollWidth > window.innerWidth")
                    print(out / name, "OVERFLOW-X" if overflow else "")
                if errors:
                    print("ERRORS:", *errors, sep="\n  ")
                await ctx.close()
        await browser.close()


asyncio.run(main())
