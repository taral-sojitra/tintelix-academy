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


async def set_range(page, selector, value):
    """Sets a range input the way a drag would, so React sees the change."""
    await page.evaluate(
        """([sel, v]) => {
            const el = document.querySelector(sel);
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, String(v));
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
        }""",
        [selector, value],
    )


async def latency_flow(page):
    await page.goto(BASE + "/system-design/latency-percentiles", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("The average is lying")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='avg'] .tx-v")).to_have_text("12 ms")
    await expect(page.locator("[data-tile='p99'] .tx-v")).to_have_text("—")
    await page.evaluate("document.querySelector('.stage-host').scrollIntoView()")
    await page.wait_for_timeout(1200)
    seen = set()
    for _ in range(8):
        seen.add(await page.locator(".tx-chartv").inner_text())
        await page.wait_for_timeout(200)
    assert seen == {"12 ms"}, f"chart label read {sorted(seen)} while step 1 says 12 ms"
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Watch p99, not the average")
    await expect(page.locator("#ctl-slowPct")).to_be_enabled()
    panel = page.locator("section.try", has=page.locator("#ctl-slowPct"))
    # A *Pct slider holds the percentage itself: 0.9 is 0.9%, and the label says so.
    await set_range(page, "#ctl-slowPct", 0.9)
    await expect(panel.locator(".try-val")).to_have_text("0.9%")
    await expect(panel.locator(".try-readout")).to_contain_text("the average is 4 ms and p99 is 2 ms")
    await set_range(page, "#ctl-slowPct", 1.1)
    await expect(panel.locator(".try-readout")).to_contain_text("the average is 4 ms and p99 is 200 ms")
    await expect(page.locator("[data-tile='p99'] .tx-v")).to_have_text("200 ms", timeout=6000)
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Ten calls, and one is slow")
    await page.locator("#ctl-calls").focus()
    await page.keyboard.press("End")
    calls_panel = page.locator("section.try", has=page.locator("#ctl-calls"))
    await expect(calls_panel.locator(".try-readout")).to_contain_text("63% of pages wait on a slow call")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Ask twice, keep the first answer")
    await expect(page.locator("[data-tile='p99'] .tx-v")).to_have_text("12 ms", timeout=10000)
    return "Latency lesson: 12 ms average, chart agrees, p99 jumps across 1% while the average stays 4 ms, 100 calls make 63% of pages slow, hedging brings page p99 to 12 ms"


async def latency_cheatsheet(page):
    res = await page.goto(BASE + "/system-design/latency-percentiles/cheatsheet", wait_until="load")
    assert res is not None and res.status == 200
    await expect(page.get_by_text("With 95% of requests at 2 ms and 5% at 200 ms, the average is 12 ms, p50 is 2 ms and p99 is 200 ms.")).to_be_visible()
    await expect(page.get_by_text("a page making 10 calls is slow 40% of the time")).to_be_visible()
    return "Latency cheatsheet quotes the model's numbers"


async def home_start_here(page):
    await page.goto(BASE + "/", wait_until="load")
    await expect(page.get_by_text("Start here · System Design · Lesson 1 of 59")).to_be_visible()
    await expect(page.get_by_text("The average is lying").first).to_be_visible()
    return "a new learner's Home card starts at Lesson 1 of 59, The average is lying"


async def lesson_switch_latency(page):
    await page.goto(BASE + "/system-design/latency-percentiles", wait_until="load")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    for _ in range(3):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Ten calls, and one is slow")
    await page.locator("aside.side a", has_text="Survive the flash sale").click()
    await page.wait_for_url("**/system-design/caching")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator(".narr h2")).to_have_text("The database is drowning")
    await expect(page.locator("[data-tile='load']")).to_have_count(1)
    await expect(page.locator("[data-tile='slow']")).to_have_count(0)
    return "switching from Latency step 4 opens Caching fresh at step 1 with its own tiles"


async def queueing_flow(page):
    await page.goto(BASE + "/system-design/queueing", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Busy, then suddenly slow")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='response'] .tx-v")).to_have_text("20 ms")
    await expect(page.locator("[data-tile='busy'] .tx-v")).to_have_text("50%")
    await page.evaluate("document.querySelector('.stage-host').scrollIntoView()")
    await page.wait_for_timeout(1200)
    seen = set()
    for _ in range(8):
        seen.add(await page.locator(".tx-chartv").inner_text())
        await page.wait_for_timeout(200)
    assert seen == {"20 ms"}, f"chart label read {sorted(seen)} while step 1 says 20 ms"
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("The curve bends, then goes vertical")
    await expect(page.locator("#ctl-traffic")).to_be_enabled()
    panel = page.locator("section.try", has=page.locator("#ctl-traffic"))
    await set_range(page, "#ctl-traffic", 90)
    await expect(panel.locator(".try-readout")).to_contain_text("90% busy")
    await expect(panel.locator(".try-readout")).to_contain_text("takes 100 ms in all")
    await expect(page.locator("[data-tile='response'] .tx-v")).to_have_text("100 ms", timeout=8000)
    await expect(page.locator("[data-curve-label]")).to_have_text("90% busy → 100 ms", timeout=8000)
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Add a worker, buy headroom")
    await expect(page.locator("[data-tile='response'] .tx-v")).to_have_text("12.5 ms", timeout=8000)
    await page.locator("#ctl-workers").focus()
    await page.keyboard.press("End")
    workers_panel = page.locator("section.try", has=page.locator("#ctl-workers"))
    await expect(workers_panel.locator(".try-readout")).to_contain_text("With 4 workers")
    return "Queueing lesson: 20 ms at half busy, chart agrees, 90 a second reads 100 ms on the tile and the curve, a second worker brings it to 12.5 ms"


async def queueing_cheatsheet(page):
    res = await page.goto(BASE + "/system-design/queueing/cheatsheet", wait_until="load")
    assert res is not None and res.status == 200
    await expect(page.get_by_text("At 90 a second and 100 ms each, 9 requests are inside at once.")).to_be_visible()
    await expect(page.get_by_text("10× at 90%")).to_be_visible()
    return "Queueing cheatsheet quotes the model's numbers"


async def availability_flow(page):
    await page.goto(BASE + "/system-design/availability", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Nobody broke their promise")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='path'] .tx-v")).to_have_text("99.5%")
    await expect(page.locator("[data-tile='down'] .tx-v")).to_have_text("3 h 39 min")
    await expect(page.locator("[data-math-sum]")).to_have_text("99.9% × 5 services in a row = 99.5%")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Every hop costs you")
    await page.locator("#ctl-services").focus()
    await page.keyboard.press("End")
    panel = page.locator("section.try", has=page.locator("#ctl-services"))
    await expect(panel.locator(".try-readout")).to_contain_text("With 6 services in a row, checkout is up 99.4%")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Two copies of everything")
    await expect(page.locator("[data-tile='down'] .tx-v")).to_have_text("13 s", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Copies that fail together")
    await expect(page.locator("[data-tile='down'] .tx-v")).to_have_text("1 h 50 min", timeout=8000)
    return "Availability lesson: 99.5% and 3 h 39 min for five services, 6 services read 99.4%, two copies 13 s, shared failure 1 h 50 min"


async def estimation_flow(page):
    await page.goto(BASE + "/system-design/estimation", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("From users to servers")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-value='avg']")).to_have_text("926/s")
    await expect(page.locator("[data-tile='peak'] .tx-v")).to_have_text("—")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='peak'] .tx-v")).to_have_text("2,778/s", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Leave room for the queue")
    await expect(page.locator("[data-value='cores']")).to_have_text("24")
    await expect(page.locator(".tx-wlabel[data-wire='m3']")).to_have_text("÷ 120")
    await page.locator("#ctl-targetUtilPct").focus()
    await page.keyboard.press("End")
    panel = page.locator("section.try", has=page.locator("#ctl-targetUtilPct"))
    await expect(panel.locator(".try-readout")).to_contain_text("you need 16 cores")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("And next year?")
    await expect(page.locator("[data-tile='growth'] .tx-v")).to_have_text("42", timeout=8000)
    return "Estimation lesson: 926/s average, 2,778/s peak, 24 cores at 60% (16 at 90%), 42 cores next year"


async def scaling_flow(page):
    await page.goto(BASE + "/system-design/vertical-horizontal-scaling", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Bigger box or more boxes?")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='capacity'] .tx-v")).to_have_text("3,200/s")
    await page.locator("#ctl-cores").focus()
    await page.keyboard.press("End")
    panel = page.locator("section.try", has=page.locator("#ctl-cores"))
    await expect(panel.locator(".try-readout")).to_contain_text("With 64 cores the server handles 12,800 a second")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='served'] .tx-v")).to_have_text("64%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Scale out: more boxes")
    await expect(page.locator("[data-tile='capacity'] .tx-v")).to_have_text("25,600/s", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='speedup'] .tx-v")).to_have_text("10×", timeout=8000)
    await expect(page.locator("[data-curve-label]")).to_have_text("16 servers → 16,306/s")
    return "Scaling lesson: 64 cores cap at 12,800/s (64% served), 16 servers 25,600/s, shared parts 10× and 16,306/s"


async def lb_flow(page):
    await page.goto(BASE + "/system-design/load-balancing", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Who gets the next request?")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='served'] .tx-v")).to_have_text("48%")
    await expect(page.locator("[data-tile='lookups'] .tx-v")).to_have_text("overloaded")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='lookups'] .tx-v")).to_have_text("82 ms", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='lookups'] .tx-v")).to_have_text("27 ms", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Layer 4 or layer 7")
    await expect(page.locator("[data-tile='lookups'] .tx-v")).to_have_text("16 ms", timeout=8000)
    await expect(page.locator("[data-compare-row].on")).to_contain_text("Layer 7 by path")
    return "Load balancing lesson: one server 48% served, round robin 82 ms, least connections 27 ms, layer 7 by path 16 ms"


async def proxy_flow(page):
    await page.goto(BASE + "/system-design/proxies", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Who speaks for whom?")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("100 GB")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("99.8%")
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Slow phones hold the workers")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("134", timeout=8000)
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("75%")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("21 ms", timeout=8000)
    await expect(page.locator("[data-buffering]")).to_have_text("buffering on")
    return "Proxy lesson: forward proxy saves 99.8% of 100 GB; slow phones need 134 workers (75% served); buffering holds a worker 21 ms"


async def health_flow(page):
    await page.goto(BASE + "/system-design/health-checks", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Is anyone still there?")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("10%")
    await expect(page.locator("[data-tile='e'] .tx-v")).to_have_text("never")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Missed heartbeats give it away")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("9 of 10", timeout=16000)
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("0%")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Too eager to eject")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("0 of 10", timeout=28000)
    await expect(page.locator("[data-log]")).to_contain_text("no servers left")
    return "Health-check lesson: no checks fail 10%; checks eject the dead server (9 of 10, 0% failing); at the peak, ejection cascades to 0 of 10"


async def session_flow(page):
    await page.goto(BASE + "/system-design/stateless-services", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Where does my login live?")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("67%")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("0%", timeout=6000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("A routine deploy logs users out")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("5,000")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Keep sessions in a shared store")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("0")
    await expect(page.locator("[data-tile='d'] .tx-v")).to_have_text("151 ms")
    panel = page.locator("section.try", has=page.locator("#ctl-baseMs"))
    await set_range(page, "#ctl-baseMs", 10)
    await expect(panel.locator(".try-val")).to_have_text("10 ms")
    await expect(panel.locator(".try-readout")).to_contain_text("makes it 10% slower")
    return "Stateless lesson: round robin loses 67% of logins; sticky 0%; a deploy logs out 5,000; a shared store logs out 0 for 1 ms (10% on a 10 ms request)"


async def data_flow(page):
    await page.goto(BASE + "/system-design/sql-vs-nosql", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Tables or documents?")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("7 rows")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("1 read")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("A seller changes their name")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("20,000 writes")
    await expect(page.locator("[data-rewrite]")).to_have_text("all 20,000 rewritten", timeout=14000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("500 a day")
    return "SQL vs NoSQL lesson: 7 rows vs 1 read; a rename rewrites 20,000 listings in 10 s; 500 bad orders a day stored"


async def index_flow(page):
    await page.goto(BASE + "/system-design/indexing", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Stop reading every row")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("100,000")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("10 s")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("A B+ tree jumps straight there")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("0.5 ms")
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Every index taxes every write")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("4,000")
    panel = page.locator("section.try", has=page.locator("#ctl-secondary"))
    await set_range(page, "#ctl-secondary", 1)
    await expect(panel.locator(".try-readout")).to_contain_text("10,000 inserts a second")
    return "Indexing lesson: a scan reads 100,000 pages (10 s); the index reads 5 (0.5 ms); 4 extra indexes cut inserts to 4,000 a second"


async def repl_flow(page):
    await page.goto(BASE + "/system-design/replication", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Copies that fall behind")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("4,500")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("You save, then see the old value")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("45%")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("0%", timeout=6000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("The primary dies with writes in flight")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("90")
    await expect(page.locator("[data-role='r0']")).to_have_text("new primary: takes writes", timeout=16000)
    return "Replication lesson: 4,500 reads per replica; 45% of read-backs stale, 0% from the primary; a crash loses 90 writes, then Replica 1 is promoted"


async def shard_flow(page):
    await page.goto(BASE + "/system-design/sharding", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Too big for one database")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("400%")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Split by range: the newest shard burns")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("25%")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("80%", timeout=6000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("One hot key still burns one shard")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("176%", timeout=6000)
    panel = page.locator("section.try", has=page.locator("#ctl-split"))
    await set_range(page, "#ctl-split", 5)
    await expect(panel.locator(".try-readout")).to_contain_text("takes 4,000 writes a second")
    return "Sharding lesson: one primary 400% busy; range burns the last shard (25% stored); hash evens to 80%; a hot key 176% until split"


async def ring_flow(page):
    await page.goto(BASE + "/system-design/consistent-hashing", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Add a server, move few keys")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("80%")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("80%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Put keys and servers on a ring")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("19%", timeout=6000)
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Virtual nodes even it out")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("22%", timeout=6000)
    await expect(page.locator(".tx-ring circle.srv")).to_have_count(500)
    return "Consistent hashing lesson: mod N moves 80% of keys; a ring moves 19%; 100 virtual nodes bring the largest share to 22%"


async def bloom_flow(page):
    await page.goto(BASE + "/system-design/bloom-filters", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Definitely not here")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("10,000")
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Most misses never touch the disk")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("0.82%")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("2,066", timeout=6000)
    panel = page.locator("section.try", has=page.locator("#ctl-bitsPerKey"))
    await set_range(page, "#ctl-bitsPerKey", 20)
    await expect(panel.locator(".try-readout")).to_contain_text("false positives are 0.01%")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("14%")
    return "Bloom filter lesson: 10,000 disk reads become 2,066 at 0.82% false positives; 20 bits a key gives 0.01%; an outgrown filter climbs to 14%"


async def upload_flow(page):
    await page.goto(BASE + "/system-design/object-storage", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Let uploads skip your servers")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("16")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Hand out a signed URL")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("1", timeout=6000)
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Multipart: retry just one part")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("100 MB")
    panel = page.locator("section.try", has=page.locator("#ctl-partMb"))
    await set_range(page, "#ctl-partMb", 10)
    await expect(panel.locator(".try-val")).to_have_text("10 MB")
    await expect(panel.locator(".try-readout")).to_contain_text("a drop costs 10 MB: 16 s more")
    return "Object storage lesson: relaying uploads needs 16 servers; signed URLs need 1; multipart redoes one 100 MB part"


async def cap_flow(page):
    await page.goto(BASE + "/system-design/cap-theorem", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("When the network splits")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("2 ms")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("The link fails: refuse to stay correct")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("30%")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("30%", timeout=6000)
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("54,000")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("66 ms", timeout=6000)
    return "CAP lesson: CP refuses 30% during a split; AP answers all with 30% maybe stale and 54,000 writes to merge; cross-region writes take 66 ms"


async def timeline_flow(page):
    await page.goto(BASE + "/system-design/consistency-models", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("How current is this read?")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("no")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("a reply to nothing")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("yes", timeout=6000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Causal: no reply before its post")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("neither yet", timeout=6000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("70 ms", timeout=6000)
    return "Consistency lesson: eventual shows a reply to nothing; read-your-writes fixes Asha; causal holds the reply; strong reads take 70 ms"


async def txn_flow(page):
    await page.goto(BASE + "/system-design/distributed-transactions", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("One order, three services")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("2")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Two-phase commit: all or nothing")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("40 ms")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("900", timeout=6000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("A saga undoes the steps already done")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("50", timeout=6000)
    return "Distributed transactions lesson: 2 broken orders a second; 2PC locks 40 ms; a dead coordinator blocks 900 orders; a saga compensates"


async def mq_flow(page):
    await page.goto(BASE + "/system-design/message-queues", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Absorb the spike")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("45,000")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("75%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Put a queue in between")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("0")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("90 s")
    panel = page.locator("section.try", has=page.locator("#ctl-workers"))
    await set_range(page, "#ctl-workers", 8)
    await expect(panel.locator(".try-readout")).to_contain_text("drains 38 s after the sale")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Dead-letter after a few tries")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("1.2%", timeout=6000)
    return "Message queue lesson: direct calls lose 45,000 jobs; a queue loses none (90 s longest wait); dead letters cap retry waste at 1.2%"


async def idem_flow(page):
    await page.goto(BASE + "/system-design/idempotency", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Charged twice?")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("6")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Send an idempotency key")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("0", timeout=6000)
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Claim the key first")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("0", timeout=6000)
    return "Idempotency lesson: 6 double charges a second; a key stops retry doubles; an atomic claim stops the races"


async def limit_flow(page):
    await page.goto(BASE + "/system-design/rate-limiting", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("One client floods the API")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("40%")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("100%", timeout=6000)
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("10/s")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Short bursts are allowed")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("30 of 30")
    panel = page.locator("section.try", has=page.locator("#ctl-bucket"))
    await set_range(page, "#ctl-bucket", 20)
    await expect(panel.locator(".try-readout")).to_contain_text("lets 20 of a 30-request burst through")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("40/s", timeout=6000)
    return "Rate limiting lesson: a flood leaves 40% served; a token bucket restores 100% and holds the flooder to 10/s; bursts of 30 pass; per-server buckets give 40/s"


async def fanout_flow(page):
    await page.goto(BASE + "/system-design/fan-out", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("A celebrity posts")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("1,500,000/s")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("20 s", timeout=6000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("4,000,000/s", timeout=6000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Push most posts, pull celebrities")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("120,000/s", timeout=6000)
    return "Fan-out lesson: push writes 1,500,000 a second; a celebrity post takes 20 s; pull costs 4,000,000 lookups a second; hybrid 120,000"


async def gateway_flow(page):
    await page.goto(BASE + "/system-design/api-gateway", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("One front door")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("6")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("1", timeout=6000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("One call for the whole screen")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("144 ms")
    panel = page.locator("section.try", has=page.locator("#ctl-rttMs"))
    await set_range(page, "#ctl-rttMs", 300)
    await expect(panel.locator(".try-val")).to_have_text("300 ms")
    await expect(panel.locator(".try-readout")).to_contain_text("takes 344 ms")
    return "API gateway lesson: 6 sign-in checks become 1; aggregation brings the home screen to 144 ms (344 ms on a 300 ms link)"


async def micro_flow(page):
    await page.goto(BASE + "/system-design/monolith-vs-microservices", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Split it, or keep it whole?")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("12 h")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Split it along team lines")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("15 min", timeout=6000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("99.5%", timeout=6000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("10 GB", timeout=6000)
    return "Monolith vs microservices lesson: a 12-hour shared deploy line; 15-minute team deploys; checkout at 99.5% over network calls; scaling search takes 10 GB instead of 40"


async def retry_flow(page):
    await page.goto(BASE + "/system-design/retries-and-circuit-breakers", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Don't kick a slow service")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("100 ms")
    panel = page.locator("section.try", has=page.locator("#ctl-pricingTimeoutMs"))
    await set_range(page, "#ctl-pricingTimeoutMs", 800)
    await expect(panel.locator(".try-readout")).to_contain_text("-300 ms spare")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("A slow service, then a retry storm")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("1,500/s")
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("A circuit breaker gives it room")
    await expect(page.locator("[data-brk]")).to_contain_text("OPEN", timeout=6000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("100%", timeout=16000)
    return "Retries lesson: a 100 ms timeout margin (-300 ms if pricing gets 800 ms); a storm offers 1,500 calls a second; the breaker opens, then recovers to 100%"


async def leader_flow(page):
    await page.goto(BASE + "/system-design/leader-election", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Who's in charge now?")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("3 of 5")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("The leader dies: an election")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("n2", timeout=8000)
    panel = page.locator("section.try", has=page.locator("#ctl-electionTimeoutMs"))
    await set_range(page, "#ctl-electionTimeoutMs", 300)
    await expect(panel.locator(".try-readout")).to_contain_text("310 ms")
    await expect(panel.locator(".try-readout")).to_contain_text("60 needless elections")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Split in two, only the majority leads")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("2 of 5")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("A fencing token stops a stale write")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("rejected", timeout=12000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("34")
    return "Leader election lesson: a majority of 3 of 5; n2 takes over (310 ms with a 300 ms timeout, 60 needless elections a day); a 2-server side can't lead; token 33 is rejected after 34"


async def region_flow(page):
    await page.goto(BASE + "/system-design/multi-region", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("A whole region goes dark")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("172 ms")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Mumbai goes dark")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("90 s")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("2.5 min")
    await expect(page.locator("[data-fotext]")).to_contain_text("everyone on Virginia", timeout=20000)
    panel = page.locator("section.try", has=page.locator("#ctl-dnsTtlSec"))
    await set_range(page, "#ctl-dnsTtlSec", 300)
    await expect(panel.locator(".try-readout")).to_contain_text("6.5 min")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Both regions serve")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("10 ms")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("0 s")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Replication lag crosses the ocean")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("new address", timeout=8000)
    return "Multi-region lesson: the standby trails by 172 ms; active-passive stops writes for 90 s and moves everyone in 2.5 min (6.5 min with a 300 s TTL); active-active keeps US users up; a read in Virginia catches up"


async def method_flow(page):
    await page.goto(BASE + "/system-design/design-method", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Forty-five minutes, one whiteboard")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("66,667/s")
    await expect(page.locator("[data-node='clock'] .tx-calc-s")).to_have_text("Minutes 0–5: requirements")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(3):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Draw the simple design first")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("1,333%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Deep dive: absorb the burst")
    batch = page.locator("section.try", has=page.locator("#ctl-batchSize"))
    await set_range(page, "#ctl-batchSize", 10)
    await expect(batch.locator(".try-readout")).to_contain_text("133%")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Find what can still break")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("0%", timeout=8000)
    await expect(page.locator("[data-node='clock'] .tx-calc-s")).to_have_text("Minutes 40–45: bottlenecks")
    return "Design-method lesson: 66,667 votes a second at peak; writing each straight to the database makes it 1,333% busy; batches of 10 still overload it (133%); with the database down the queue loses 0%"


async def url_flow(page):
    await page.goto(BASE + "/system-design/url-shortener", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Turn a long link into seven characters")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("13,889/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(3):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Full traffic swamps the database")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("278%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Put a cache in front")
    cache = page.locator("section.try", has=page.locator("#ctl-cacheHitPct"))
    await set_range(page, "#ctl-cacheHitPct", 50)
    await expect(cache.locator(".try-readout")).to_contain_text("139%")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Codes that never clash")
    await expect(page.locator("[data-node='ids'] .tx-b62-id")).to_contain_text("→")
    codes = page.locator("section.try", has=page.locator("#ctl-codeLength"))
    await set_range(page, "#ctl-codeLength", 6)
    await expect(codes.locator(".try-readout")).to_contain_text("96%")
    return "URL shortener lesson: 13,889 clicks a second swamp one database (278% busy); a 50% cache still leaves it at 139%; the counter mints base-62 codes, and six characters use 96% of them"


async def ids_flow(page):
    await page.goto(BASE + "/system-design/unique-ids", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Never hand out the same ID twice")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("100,000/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Fifty servers swamp the counter")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("2,000%", timeout=8000)
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Time, machine and sequence in 64 bits")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("4,096,000/s", timeout=8000)
    bits = page.locator("section.try", has=page.locator("#ctl-machineBits"))
    await set_range(page, "#ctl-machineBits", 5)
    await expect(bits.locator(".try-readout")).to_contain_text("32 machine numbers")
    await expect(page.locator("[data-node='layout'] [data-bits-vals]")).to_have_text("machine 37 doesn't fit in 5 bits")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Clocks go back; numbers must not repeat")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("none")
    return "Unique IDs lesson: 100,000 IDs a second make one counter 2,000% busy; 41+10+12 bits give 4,096,000 a second per machine; 5 machine bits leave only 32 numbers; a clock step back repeats none"


async def kv_flow(page):
    await page.goto(BASE + "/system-design/key-value-store", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("A store that always takes the write")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("120,000/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("One node dies, its keys go with it")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("20%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Keep three copies; agree by quorum")
    write = page.locator("section.try", has=page.locator("#ctl-writeQuorum"))
    read = page.locator("section.try", has=page.locator("#ctl-readQuorum"))
    await set_range(page, "#ctl-writeQuorum", 1)
    await expect(write.locator(".try-readout")).to_contain_text("4 ms")
    await set_range(page, "#ctl-readQuorum", 1)
    await expect(read.locator(".try-readout")).to_contain_text("67%")
    await expect(page.locator("[data-node='quorum'] .tx-calc-s")).to_have_text("W 1 + R 1 ≤ N 3: a read can miss the latest write")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("A replica is down: write next door")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("100%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Two writes at once: keep both")
    await expect(page.locator("[data-node='vc'] li", has_text="2 siblings")).to_be_visible(timeout=12000)
    return "Key-value lesson: a dead node with one copy loses 20% of keys; W 1 + R 1 writes in 4 ms but 67% of reads miss a fresh write; with B down, W 2 still accepts 100%; concurrent cart writes become 2 siblings"


async def limiter_flow(page):
    await page.goto(BASE + "/system-design/distributed-rate-limiter", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("One limit across a thousand servers")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("600/min")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Twenty gateways, twenty limits")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("150/s", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("One counter every gateway shares")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("160%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Split the counters across shards")
    shards = page.locator("section.try", has=page.locator("#ctl-redisShards"))
    await set_range(page, "#ctl-redisShards", 2)
    await expect(shards.locator(".try-readout")).to_contain_text("80%")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("A counter shard dies")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("25%", timeout=8000)
    return "Rate-limiter lesson: 20 gateways counting alone allow 150/s for a 10/s key; one shared counter store is 160% busy; 2 shards bring it to 80%; a dead shard of 4 leaves 25% of keys unchecked"


async def crawl_flow(page):
    await page.goto(BASE + "/system-design/web-crawler", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Read the whole web, politely")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("772/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("The queue hammers one site")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("98%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Give every site its own queue")
    await expect(page.locator("[data-node='frontier'] .tx-hq-row")).to_have_count(4)
    delay = page.locator("section.try", has=page.locator("#ctl-politeDelay"))
    await set_range(page, "#ctl-politeDelay", 2)
    await expect(delay.locator(".try-readout")).to_contain_text("1,543")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Don't fetch a URL twice")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("6 GB", timeout=8000)
    return "Crawler lesson: 772 pages a second; a plain queue sends 463/s to one site, 98% refused; per-site queues at a 2 s delay need 1,543 sites at once; a 6 GB Bloom filter drops seen links"


async def search_flow(page):
    await page.goto(BASE + "/system-design/search-engine", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Find it among a billion pages")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("2,315/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Two billion rows, one at a time")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("7 min", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Turn it around: words to documents")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("30 ms", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Indexing takes time; say how long")
    refresh = page.locator("section.try", has=page.locator("#ctl-refreshSec"))
    await set_range(page, "#ctl-refreshSec", 10)
    await expect(refresh.locator(".try-readout")).to_contain_text("11 s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Everyone searches the same thing")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("80%", timeout=8000)
    return "Search lesson: 2,315 searches a second; a LIKE scan of 2 billion rows takes 7 min; an inverted index answers in 30 ms; a 10 s refresh means 11 s to searchable; 80% of a trending term comes from cache"


async def suggest_flow(page):
    await page.goto(BASE + "/system-design/search-autocomplete", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Guess the query after two letters")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("55,556/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Every keystroke is a sort")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("2,568%", timeout=8000)
    letters = page.locator("section.try", has=page.locator("#ctl-prefixLen"))
    await set_range(page, "#ctl-prefixLen", 1)
    await expect(letters.locator(".try-readout")).to_contain_text("769 ms")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("A trie with the answers already in it")
    await expect(page.locator("[data-node='trie'] .tx-trie li").first).not_to_be_empty()
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("19 GB", timeout=8000)
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Answer before it leaves the browser")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("38,889/s", timeout=8000)
    return "Autocomplete lesson: 55,556 requests a second at peak; sorting per keystroke makes the database 2,568% busy (769 ms for one letter); a 19 GB trie answers instead; the browser cache leaves 38,889/s for the servers"


async def notify_flow(page):
    await page.goto(BASE + "/system-design/notification-service", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("A million alerts, none sent twice")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("4,051/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("One slow channel holds up the rest")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("42 min", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("A queue per channel")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("5 min", timeout=8000)
    sms = page.locator("section.try", has=page.locator("#ctl-smsRate"))
    await set_range(page, "#ctl-smsRate", 2500)
    await expect(sms.locator(".try-readout")).to_contain_text("100%")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Finding the audience takes time too")
    parts = page.locator("section.try", has=page.locator("#ctl-partitions"))
    await set_range(page, "#ctl-partitions", 16)
    await expect(parts.locator(".try-readout")).to_contain_text("8 min")
    return "Notification lesson: one shared queue holds push behind a 300/s SMS gateway for 42 min; a queue per channel finishes push in 5 min; 2,500 SMS/s meets the deadline; 16 partitions take 8 min to resolve the audience"


async def feed_flow(page):
    await page.goto(BASE + "/system-design/photo-feed", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Fill the home feed in a blink")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("28,935/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Two hundred lookups per load")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("1,157%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Push each post into followers' feeds")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("1", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("One post, eighty million writes")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("7 min", timeout=8000)
    celeb = page.locator("section.try", has=page.locator("#ctl-celebFollowers"))
    await set_range(page, "#ctl-celebFollowers", 1000000)
    await expect(celeb.locator(".try-readout")).to_contain_text("5 s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Push for most, pull for the few")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("17%", timeout=8000)
    return "Feed lesson: 28,935 loads a second; pulling 200 accounts per load makes the posts store 1,157% busy; pushing makes a load 1 lookup; an 80M-follower post takes 7 min to push (1M: 5 s); the hybrid keeps the store at 17%"


async def chat_flow(page):
    await page.goto(BASE + "/system-design/chat-app", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Delivered, read, and in order")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("2.5 million/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Ask the server for news")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("98%", timeout=8000)
    poll = page.locator("section.try", has=page.locator("#ctl-pollInterval"))
    await set_range(page, "#ctl-pollInterval", 1)
    await expect(poll.locator(".try-readout")).to_contain_text("500 million")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Keep a connection open")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("1,000", timeout=8000)
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Groups: one send, many deliveries")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("61%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-node='presence'] .tx-pres-row.on")).to_have_count(2)
    return "Chat lesson: 2.5 million deliveries a second; polling is 98% empty (1 s polls: 500 million a second); 1,000 chat servers hold the sockets; groups make 61% of deliveries; presence shows who is online"


async def nearby_flow(page):
    await page.goto(BASE + "/system-design/proximity-service", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Places within two kilometres")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("17,361/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Two bands around the world")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("868%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Cut the map into cells")
    await expect(page.locator("[data-node='geo'] .tx-calc-s")).to_have_text("length 6: 5 × 8 = 40 cells read")
    length = page.locator("section.try", has=page.locator("#ctl-geoLen"))
    await set_range(page, "#ctl-geoLen", 5)
    await expect(length.locator(".try-readout")).to_contain_text("65 ms")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Keep the index in memory, many times")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("12", timeout=8000)
    return "Proximity lesson: 17,361 searches a second; lat/lon indexes make the database 868% busy; geohash length 6 reads 40 cells (length 5: 65 ms a search); a 3.2 GB index in memory on 12 servers"


async def friends_flow(page):
    await page.goto(BASE + "/system-design/nearby-friends", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Which friends are close right now?")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("2 million/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Everyone asking about everyone")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("30,000%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Publish to a channel, friends subscribe")
    await expect(page.locator("[data-node='pubsub'] .tx-ps-row.near")).to_have_count(2)
    every = page.locator("section.try", has=page.locator("#ctl-updateEvery"))
    await set_range(page, "#ctl-updateEvery", 10)
    await expect(every.locator(".try-readout")).to_contain_text("120 million")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Spread the channels across nodes")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("60", timeout=8000)
    return "Nearby-friends lesson: 2 million updates a second; polling makes the database 30,000% busy; pub/sub reaches 2 near friends per update (10 s updates: 120 million messages a second); 60 pub/sub nodes"


async def ride_flow(page):
    await page.goto(BASE + "/system-design/ride-hailing", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("A car for every rider in seconds")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("900")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Pings drown the trips")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("2,503%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Keep only where drivers are now")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("42", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Claim the driver before offering")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("2,000", timeout=8000)
    await expect(page.locator("[data-node='dispatch'] .tx-disp-row")).to_have_count(3)
    match = page.locator("section.try", has=page.locator("#ctl-matchTime"))
    await set_range(page, "#ctl-matchTime", 4)
    await expect(match.locator(".try-readout")).to_contain_text("4,000")
    return "Ride-hailing lesson: pings outnumber trip writes 900 to 1; one database is 2,503% busy; the in-memory index gives 42 candidates; 2,000 matches in flight (4 s matching: 4,000)"


async def maps_flow(page):
    await page.goto(BASE + "/system-design/maps-navigation", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("The fastest way home")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("12,000,000/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Drawing the same tile again and again")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("24,000%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Draw once, serve from the edge")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("240,000/s", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Searching every road")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("1,257%", timeout=8000)
    trip = page.locator("section.try", has=page.locator("#ctl-tripKm"))
    await set_range(page, "#ctl-tripKm", 80)
    await expect(trip.locator(".try-readout")).to_contain_text("2,513,274")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Shortcuts and today's speeds")
    await expect(page.locator("[data-node='graph'] .tx-rg.fast")).to_have_count(1)
    return "Maps lesson: 12 million tile requests a second; drawing on request is 24,000% busy; the CDN leaves 240,000 a second for the store; a plain search is 1,257% busy (80 km trip: 2,513,274 intersections); shortcuts"


async def video_flow(page):
    await page.goto(BASE + "/system-design/video-streaming", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Upload once, play anywhere")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("25 Tbps")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("One place, one quality")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("1,250%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Encode once into a ladder")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("38 s", timeout=8000)
    await expect(page.locator("[data-node='workers'] .tx-tc-row")).to_have_count(4)
    enc = page.locator("section.try", has=page.locator("#ctl-workers"))
    await set_range(page, "#ctl-workers", 900)
    await expect(enc.locator(".try-readout")).to_contain_text("26 s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Copies inside viewers' providers")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("0.5 Tbps", timeout=8000)
    edge = page.locator("section.try", has=page.locator("#ctl-edgeHitPct"))
    await set_range(page, "#ctl-edgeHitPct", 70)
    await expect(edge.locator(".try-readout")).to_contain_text("7.5 Tbps")
    return "Video lesson: 25 Tbps at peak; the store alone is 1,250% busy; parallel encoding plays in 38 s (900 encoders: 26 s); the edge leaves 0.5 Tbps for the origin (70% hit: 7.5)"


async def sync_flow(page):
    await page.goto(BASE + "/system-design/file-sync", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Edit on a laptop, see it on a phone")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("41,667/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Moving whole files for small edits")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("278%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Cut files into chunks")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("139%", timeout=8000)
    await expect(page.locator("[data-node='chunks'] .tx-bs-row")).to_have_count(2)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Cut where the content says")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("78%", timeout=8000)
    size = page.locator("section.try", has=page.locator("#ctl-fileMb"))
    await set_range(page, "#ctl-fileMb", 2048)
    await expect(size.locator(".try-readout")).to_contain_text("0.39%")
    return "File sync lesson: 41,667 changes a second at peak; whole files make the upload tier 278% busy; fixed chunks 139%; content-defined chunks 78% (a 2 GB file sends 0.39%)"


async def objects_flow(page):
    await page.goto(BASE + "/system-design/object-store-internals", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Store a trillion files, lose none")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("250 PB")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("A disk a day, gone for good")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("2%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Three copies, three racks")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("750 PB", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Pieces and parity")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("350 PB", timeout=8000)
    await expect(page.locator("[data-node='store'] .tx-ec-disks i.par")).to_have_count(4)
    parity = page.locator("section.try", has=page.locator("#ctl-parity"))
    await set_range(page, "#ctl-parity", 2)
    await expect(parity.locator(".try-readout")).to_contain_text("300 PB")
    return "Object store lesson: 250 PB of data; one copy loses 2% a year; three copies take 750 PB; 10 + 4 erasure coding takes 350 PB (2 parity: 300 PB)"


async def email_flow(page):
    await page.goto(BASE + "/system-design/email-service", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("An inbox for a billion people")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("1,388,889/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Too much mail for one machine")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("2,778%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Shard by user, attachments aside")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("65,700", timeout=8000)
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Sending without landing in spam")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("30,000", timeout=8000)
    dead = page.locator("section.try", has=page.locator("#ctl-deadPct"))
    await set_range(page, "#ctl-deadPct", 2)
    await expect(dead.locator(".try-readout")).to_contain_text("10,000")
    return "Email lesson: 1,388,889 messages a second at peak; one database is 2,778% busy; 65,700 mailbox shards for a year; 30,000 hard bounces from one campaign (2% dead: 10,000)"


async def mqd_flow(page):
    await page.goto(BASE + "/system-design/message-queue-design", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("A queue that keeps every message")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("2 GB/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("One disk, one reader")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("400%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("An append-only log in partitions")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("17%", timeout=8000)
    await expect(page.locator("[data-node='parts'] .tx-pt-row")).to_have_count(4)
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Groups and offsets")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("400", timeout=8000)
    group = page.locator("section.try", has=page.locator("#ctl-consumers"))
    await set_range(page, "#ctl-consumers", 600)
    await expect(group.locator(".try-readout")).to_contain_text("200")
    return "Message queue lesson: 2 GB/s in; one broker is 400% busy; a partitioned log over 24 brokers is 17% busy; 400 consumers busy (600 in the group: 200 idle)"


async def metrics_flow(page):
    await page.goto(BASE + "/system-design/metrics-alerting", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Spot the outage before users do")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("800,000/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Too many tiny writes, too many points")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("400%", timeout=8000)
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Roll up the old data")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("12 TB", timeout=8000)
    await expect(page.locator("[data-node='history'] .tx-rup-bars i.hr")).to_have_count(12)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Labels and alerts")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("25,000,000", timeout=8000)
    ids = page.locator("section.try", has=page.locator("#ctl-userIds"))
    await set_range(page, "#ctl-userIds", 0)
    await expect(ids.locator(".try-readout")).to_contain_text("2,500")
    return "Metrics lesson: 800,000 samples a second; rows in one database are 400% busy; rollups keep two years in 12 TB; a user-ID label makes 25,000,000 series (no IDs: 2,500)"


async def clicks_flow(page):
    await page.goto(BASE + "/system-design/click-aggregation", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Count every click exactly once")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("277,778/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Too many writes, and some counted twice")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("556%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Log first, count in memory")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("10,000/s", timeout=8000)
    await expect(page.locator("[data-node='agg'] .tx-wm-win")).to_have_count(3)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("When is a minute finished?")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("1.6%", timeout=8000)
    slack = page.locator("section.try", has=page.locator("#ctl-slackSec"))
    await set_range(page, "#ctl-slackSec", 120)
    await expect(slack.locator(".try-readout")).to_contain_text("0.74%")
    return "Click aggregation lesson: 277,778 clicks a second at peak; a counter per click is 556% busy; per-minute rows are 10,000 a second; 1.6% of clicks miss a 30 s watermark (120 s: 0.74%)"


async def board_flow(page):
    await page.goto(BASE + "/system-design/leaderboard", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Rank ten million players live")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("17,361/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Counting millions for every look")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("27,127%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("A sorted set in memory")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("29%", timeout=8000)
    await expect(page.locator("[data-node='board'] .tx-zs-row.me")).to_have_count(1)
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("More boards, bigger boards")
    size = page.locator("section.try", has=page.locator("#ctl-players"))
    await set_range(page, "#ctl-players", 100000000)
    await expect(size.locator(".try-readout")).to_contain_text("58%")
    return "Leaderboard lesson: 17,361 rank checks a second; counting in SQL is 27,127% busy; a sorted set is 29% busy; a 100-million board needs 5 shards at 58%"


async def rag_flow(page):
    await page.goto(BASE + "/system-design/rag-serving", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Answer from your own documents")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("37 GB")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Answers take seconds, and they pile up")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("4,167%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Batch the GPU's work")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("3", timeout=8000)
    await expect(page.locator("[data-node='index'] .tx-fun-row")).to_have_count(4)
    batch = page.locator("section.try", has=page.locator("#ctl-perGpu"))
    await set_range(page, "#ctl-perGpu", 5)
    await expect(batch.locator(".try-readout")).to_contain_text("9")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Keep the index honest")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("42 min stale", timeout=8000)
    return "RAG lesson: 37 GB of vectors; one GPU at a time is 4,167% busy; batching needs 3 GPUs (5 per GPU: 9); a 500,000-document edit is 42 min stale"


async def hotel_flow(page):
    await page.goto(BASE + "/system-design/hotel-booking", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Never sell the same room twice")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("926/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Two guests, one room")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("800/day", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Let the database refuse")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("0", timeout=8000)
    await expect(page.locator("[data-node='race'] .tx-lk-row")).to_have_count(2)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Holds and retries")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("22,222", timeout=8000)
    hold = page.locator("section.try", has=page.locator("#ctl-holdMin"))
    await set_range(page, "#ctl-holdMin", 30)
    await expect(hold.locator(".try-readout")).to_contain_text("66,667")
    return "Hotel lesson: 926 searches a second at peak; check-then-insert sells 800 rooms a day twice; the database refuses overlaps; 22,222 rooms held at once (30-minute holds: 66,667)"


async def orders_flow(page):
    await page.goto(BASE + "/system-design/orders-inventory", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Sell only what's on the shelf")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("833/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("The flash sale oversells")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("1,667 units", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Check and subtract in one statement")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("167%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Split the hot row")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("17%", timeout=8000)
    split = page.locator("section.try", has=page.locator("#ctl-subCounters"))
    await set_range(page, "#ctl-subCounters", 2)
    await expect(split.locator(".try-readout")).to_contain_text("83%")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("The order saga")
    await expect(page.locator("[data-node='saga'] .tx-log li")).to_have_count(5)
    return "Orders lesson: 833 checkouts a second in a flash sale; check-pay-subtract oversells 1,667 units; the guarded update's row is 167% busy; 10 sub-counters bring it to 17% (2: 83%); the saga"


async def payment_flow(page):
    await page.goto(BASE + "/system-design/payment-system", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Take the money exactly once")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("694/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("The crash between charge and record")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("2,000/day", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Write the intent first")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("0", timeout=8000)
    timeouts = page.locator("section.try", has=page.locator("#ctl-timeoutsPer10k"))
    await set_range(page, "#ctl-timeoutsPer10k", 5)
    await expect(timeouts.locator(".try-readout")).to_contain_text("10,000")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Authorize, capture, and a ledger that balances")
    await expect(page.locator("[data-node='ledger'] .tx-dbl-cap")).to_contain_text("debits")
    return "Payment lesson: 694 payments a second at peak; charge-then-record makes 2,000 double charges a day (5 timeouts in 10,000: 10,000); intent first makes 0; a balanced double-entry ledger"


async def wallet_flow(page):
    await page.goto(BASE + "/system-design/digital-wallet", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Move money between wallets safely")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("50,000/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("One machine can't move it all")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("1,000%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Shard by wallet, transfer as a saga")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("50%", timeout=8000)
    shards = page.locator("section.try", has=page.locator("#ctl-shards"))
    await set_range(page, "#ctl-shards", 40)
    await expect(shards.locator(".try-readout")).to_contain_text("25%")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Keep the events, derive the balance")
    await expect(page.locator("[data-node='log'] .tx-ev-cap")).to_contain_text("balance")
    return "Wallet lesson: 50,000 transfers a second; one database is 1,000% busy; 20 shards are 50% busy (40: 25%); balances replayed from the event log"


async def exchange_flow(page):
    await page.goto(BASE + "/system-design/stock-exchange", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Match a buy and a sell in microseconds")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("136,752/s")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Too slow, and not fair")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("2,735%", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("An order book in memory, one thread a stock")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("3.4%", timeout=8000)
    await expect(page.locator("[data-node='engine'] .tx-ob-row")).to_have_count(6)
    hot = page.locator("section.try", has=page.locator("#ctl-hotSharePct"))
    await set_range(page, "#ctl-hotSharePct", 50)
    await expect(hot.locator(".try-readout")).to_contain_text("34%")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Tell everyone at once")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("342 million/s", timeout=8000)
    return "Exchange lesson: 136,752 orders a second at the open; matching by query is 2,735% busy; in memory the busiest stock's thread is 3.4% busy (50% of orders: 34%); multicast instead of 342 million messages a second"


async def subject_page(page):
    await page.goto(BASE + "/system-design", wait_until="load")
    await expect(page.get_by_text("59 lessons in 13 modules · 59 open now")).to_be_visible()
    await page.goto(BASE + "/system-design/cdn", wait_until="load")
    await expect(page.get_by_text("59 of 59 open")).to_be_visible()
    return "System Design lists 59 lessons in 13 modules, 59 open"


# Written Networks lessons, in order; Load balancers (shared with System Design) is open as well.
NET_LESSONS = ["osi-model", "tcp-ip-model", "ip-addressing", "subnetting", "arp", "dhcp", "tcp-vs-udp", "handshake", "ports-sockets", "dns", "http"]


async def net_flow(page):
    await page.goto(BASE + "/networks", wait_until="load")
    await expect(page.get_by_text(f"20 lessons in 6 modules · {len(NET_LESSONS) + 1} open now")).to_be_visible()
    await expect(page.locator("main a[href='/system-design/load-balancing']").first).to_be_visible()
    await page.goto(BASE + "/networks/osi-model", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Seven layers, one message")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("3,000 bytes")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Down the stack, a header at each layer")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("1,518 bytes", timeout=8000)
    await expect(page.locator("[data-node='frame'] .tx-env-row.new")).to_have_count(1, timeout=8000)
    for _ in range(4):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Every segment pays for its headers")
    size = page.locator("section.try", has=page.locator("#ctl-payloadBytes"))
    await set_range(page, "#ctl-payloadBytes", 100)
    await expect(size.locator(".try-readout")).to_contain_text("37%")
    res = await page.goto(BASE + "/networks/osi-model/cheatsheet", wait_until="load")
    assert res and res.status == 200, "osi cheatsheet"
    return f"Networks lists 20 lessons in 6 modules, {len(NET_LESSONS) + 1} open, with Load balancers linking to System Design; the OSI lesson wraps a 3,000-byte message into 1,518-byte frames, and a 100-byte message spends 37% on headers"


async def net_tcpip_flow(page):
    await page.goto(BASE + "/networks/tcp-ip-model", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("The four layers that ship")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("4")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(3):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("A router only climbs two layers")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("13", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("End to end, or hop by hop")
    hops = page.locator("section.try", has=page.locator("#ctl-hops"))
    await set_range(page, "#ctl-hops", 70)
    await expect(hops.locator(".try-readout")).to_contain_text("TTL ends at 0")
    await expect(page.locator("[data-node='tally']")).to_contain_text("packet dropped")
    return "TCP/IP lesson: 4 layers; 12 routers rewrite Ethernet 13 times; at 70 routers the TTL runs out and the packet is dropped"


async def net_ip_flow(page):
    await page.goto(BASE + "/networks/ip-addressing", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Where on the internet?")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("192.168.1.42")
    await expect(page.locator("[data-node='bits'] .tx-ip-cap")).to_have_text("mask 255.255.255.0 · network 192.168.1.0/24")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(3):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("The prefix sets the network's size")
    size = page.locator("section.try", has=page.locator("#ctl-prefixLen"))
    await set_range(page, "#ctl-prefixLen", 26)
    await expect(size.locator(".try-readout")).to_contain_text("62")
    await expect(page.locator("[data-node='bits'] .tx-ip-cap")).to_have_text("mask 255.255.255.192 · network 192.168.1.0/26")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Running out, and IPv6")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("3.4 × 10^38", timeout=8000)
    return "IP addressing lesson: 192.168.1.42/24 in bits; a /26 leaves 62 devices with mask 255.255.255.192; IPv6 has 3.4 × 10^38 addresses"


async def net_subnet_flow(page):
    await page.goto(BASE + "/networks/subnetting", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Same street or across town?")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-node='split'] .tx-sn-cap")).to_have_text("same subnet: A sends straight to B")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("4", timeout=8000)
    await expect(page.locator("[data-node='split'] .tx-sn-cap")).to_have_text("different subnets: A sends it to the router")
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Same street or across town?")
    host = page.locator("section.try", has=page.locator("#ctl-hostB"))
    await set_range(page, "#ctl-hostB", 50)
    await expect(host.locator(".try-readout")).to_contain_text("router hops: 0")
    await expect(page.locator("[data-node='split'] .tx-sn-cap")).to_have_text("same subnet: A sends straight to B")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("/21", timeout=8000)
    return "Subnetting lesson: a /26 cuts the block into 4 and puts B at .100 behind the router; B at .50 shares A's subnet; 2,000 devices fit a /21"


async def net_arp_flow(page):
    await page.goto(BASE + "/networks/arp", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Who has 192.168.1.1?")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-node='arp'] .tx-arp-row")).to_have_text("192.168.1.1 → ?")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Ask everyone, hear from one")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("19", timeout=8000)
    await expect(page.locator("[data-node='arp'] .tx-arp-row")).to_have_text("192.168.1.1 → 02:aa:bb:cc:dd:01", timeout=8000)
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Why every device caches")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("11,400/min", timeout=8000)
    devices = page.locator("section.try", has=page.locator("#ctl-devices"))
    await set_range(page, "#ctl-devices", 101)
    await expect(devices.locator(".try-readout")).to_contain_text("60,000")
    return "ARP lesson: the question reaches 19 devices, the answer lands in the cache; with no cache 600 packets a minute mean 11,400 broadcast frames, 60,000 with 101 devices"


async def net_dhcp_flow(page):
    await page.goto(BASE + "/networks/dhcp", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("An address for a newcomer")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("None")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Discover, offer, request, acknowledge")
    await expect(page.locator("[data-node='dora'] .tx-dhcp-set b").first).to_have_text("192.168.1.101", timeout=10000)
    for _ in range(3):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Long leases run the pool dry")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("50%", timeout=8000)
    lease = page.locator("section.try", has=page.locator("#ctl-leaseHours"))
    await set_range(page, "#ctl-leaseHours", 24)
    await expect(lease.locator(".try-readout")).to_contain_text("67%")
    return "DHCP lesson: the phone starts with no IP, four messages later has 192.168.1.101; 4-hour leases fill half the café's pool, day-long leases refuse 67% of newcomers"


async def net_tcpudp_flow(page):
    await page.goto(BASE + "/networks/tcp-vs-udp", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Every byte, or right now?")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("Nothing")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("98%", timeout=8000)
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("One lost packet holds up the rest")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("12%", timeout=8000)
    await expect(page.locator("[data-node='order'] .tx-ord-cap")).to_contain_text("resent 120 ms later", timeout=8000)
    rtt = page.locator("section.try", has=page.locator("#ctl-rttMs"))
    await set_range(page, "#ctl-rttMs", 200)
    await expect(rtt.locator(".try-readout")).to_contain_text("300 ms")
    return "TCP vs UDP lesson: at 2% loss UDP delivers 98%; each loss stalls TCP 120 ms, freezing a call 12% of the time; a 200 ms round trip makes it 300 ms"


async def net_handshake_flow(page):
    await page.goto(BASE + "/networks/handshake", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Hello before the data")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-node='ladder'] .tx-lad-cap")).to_have_text("no connection yet")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-node='ladder'] .tx-lad-cap")).to_have_text("connected after 80 ms: one round trip", timeout=8000)
    await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("A round trip before the request")
    rtt = page.locator("section.try", has=page.locator("#ctl-rttMs"))
    await set_range(page, "#ctl-rttMs", 150)
    await expect(rtt.locator(".try-readout")).to_contain_text("300 ms")
    await expect(page.locator("[data-node='ladder'] .tx-lad-cap")).to_have_text("first byte of the page at 300 ms: two round trips")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("Open once, ask many times")
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("45%", timeout=8000)
    return "Handshake lesson: connected after one 80 ms round trip; at 150 ms the first byte lands at 300 ms; reusing one connection makes 10 requests 45% faster"


async def net_ports_flow(page):
    await page.goto(BASE + "/networks/ports-sockets", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Which program gets this?")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-node='server'] .tx-sock-cap")).to_have_text("3 programs listening, one port each")
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("The client picks a port too")
    await expect(page.locator("[data-node='server'] .tx-sock-row.pick")).to_have_count(2, timeout=8000)
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("A client can run out of ports")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("43%", timeout=8000)
    conns = page.locator("section.try", has=page.locator("#ctl-connsPerSec"))
    await set_range(page, "#ctl-connsPerSec", 1000)
    await expect(conns.locator(".try-readout")).to_contain_text("53%")
    return "Ports lesson: 3 programs listening; two tabs told apart by source port; 200 new connections a second hold 43% of client ports, 1,000 a second make 53% fail"


async def net_dns_flow(page):
    await page.goto(BASE + "/networks/dns", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("From a name to an address")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-node='walk'] .tx-dns-cache span")).to_have_text("empty")
    await page.locator("body").click(position={"x": 5, "y": 5})
    await page.keyboard.press("ArrowRight")
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("170 ms", timeout=8000)
    await expect(page.locator("[data-node='walk'] .tx-dns-cache span")).to_have_text("www.example.com → 203.0.113.80 · 300 s", timeout=10000)
    for _ in range(2):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("TTL: fast or fresh")
    await expect(page.locator("[data-tile='a'] .tx-v")).to_have_text("99%", timeout=8000)
    ttl = page.locator("section.try", has=page.locator("#ctl-ttlSec"))
    await set_range(page, "#ctl-ttlSec", 30)
    await expect(ttl.locator(".try-readout")).to_contain_text("88%")
    return "DNS lesson: a cold walk takes 170 ms and fills the resolver's cache; a 300 s TTL answers 99% from the cache, 30 s only 88%"


async def net_http_flow(page):
    await page.goto(BASE + "/networks/http", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("One request or many at once?")
    await page.wait_for_selector(STAGE_READY, timeout=10000)
    await expect(page.locator("[data-tile='c'] .tx-v")).to_have_text("800 ms")
    await expect(page.locator("[data-node='load'] .tx-wf-row:not([hidden])")).to_have_count(1)
    await page.locator("body").click(position={"x": 5, "y": 5})
    for _ in range(3):
        await page.keyboard.press("ArrowRight")
    await expect(page.locator(".narr h2")).to_have_text("HTTP/3: the same streams over QUIC")
    await expect(page.locator("[data-node='load'] .tx-wf-row:not([hidden])")).to_have_count(3, timeout=8000)
    await expect(page.locator("[data-tile='b'] .tx-v")).to_have_text("240 ms")
    await page.keyboard.press("ArrowRight")
    files = page.locator("section.try", has=page.locator("#ctl-resources"))
    await set_range(page, "#ctl-resources", 90)
    await expect(files.locator(".try-readout")).to_contain_text("1600 ms")
    return "HTTP lesson: 30 files take 800 ms on HTTP/1.1, 240 ms on HTTP/3; 90 files take 1600 ms on HTTP/1.1"


SQL_READY = ".sql-clauses, .sql-stage.empty .sql-stage-msg"
# Every written SQL lesson: slug, hook title, and what the stage says for the first task's starter.
SQL_LESSONS = [
    ("select", "Pick the columns you need", "FROM starts with every row of products: 15 rows."),
    ("where", "Only the rows that match", "FROM starts with every row of products: 15 rows."),
    ("order-by", "Who comes first?", "FROM starts with every row of products: 15 rows."),
    ("distinct", "Every city, once", "FROM starts with every row of products: 15 rows."),
    ("limit-offset", "The top five, then the next", "FROM starts with every row of products: 15 rows."),
    ("aggregates", "How many, how much?", "FROM starts with every row of customers: 20 rows."),
    ("group-by", "Who spends the most?", "FROM starts with every row of orders: 60 rows."),
    ("having", "Only the big spenders", "FROM starts with every row of orders: 60 rows."),
    ("case-when", "Label every order", "FROM starts with every row of orders: 60 rows."),
    ("inner-join", "Whose order is this?", "FROM starts with every row of orders: 60 rows."),
    ("left-join", "Who never ordered?", "FROM joined customers and orders into 60 rows."),
    ("cte", "Name a step, use it later", "WITH made a step called spend: 15 rows."),
    ("row-number", "Each customer's latest order", "FROM starts with every row of orders: 60 rows."),
    ("insert", "Add a new product", "FROM starts with every row of products: 15 rows."),
    ("update", "Change some rows, not all", "There's no WHERE, so UPDATE changes every row: all 15."),
    ("delete", "Remove only what you mean", "WHERE kept 1 of 20 rows."),
    ("create-table", "Make a new table", "CREATE TABLE made coupons with 1 column and no rows yet."),
    ("alter-table", "Add a column later", "products has 5 columns and 15 rows."),
    ("create-index", "Find it without reading all", "FROM starts with every row of customers: 20 rows."),
    ("drop-table", "Gone, and what goes with it", "FROM starts with every row of coupons: 0 rows."),
    ("truncate", "Empty it in one go", "FROM starts with every row of order_items: 150 rows."),
]


async def sql_ready(page):
    """Postgres has started in the page's worker (the stage alone can show before it has)."""
    await page.wait_for_selector(SQL_READY, timeout=30000)
    await expect(page.locator(".sql-status")).not_to_contain_text("Starting", timeout=30000)


async def type_sql(page, sql):
    await page.locator(".cm-content").click()
    await page.keyboard.press("Control+A")
    await page.keyboard.type(sql)


async def sql_subject(page):
    await page.goto(BASE + "/sql", wait_until="load")
    n = len(SQL_LESSONS)
    await expect(page.get_by_text(f"21 lessons in 5 modules · {n} open now")).to_be_visible()
    await page.goto(BASE + "/", wait_until="load")
    card = page.locator("article.s-sql")
    await expect(card.get_by_role("link", name=f"{n} of 21 open")).to_be_visible()
    return f"SQL lists 21 lessons in 5 modules, {n} open; its Home card links in"


async def sql_lessons(page):
    """Each later SQL lesson: the starter replays, a first run gets feedback, the solution solves task 1."""
    for slug, title, note in SQL_LESSONS[1:]:
        await page.goto(BASE + f"/sql/{slug}", wait_until="load")
        await expect(page.get_by_role("heading", level=1)).to_have_text(title)
        await page.wait_for_selector(".sql-clauses, .sql-stage.empty .sql-stage-msg", timeout=30000)
        await expect(page.locator(".sql-stage")).to_contain_text(note, timeout=10000)
        await page.get_by_role("button", name="Run", exact=True).click()
        await expect(page.locator(".fb-warn, .fb-error, .fb-ok")).to_be_visible(timeout=10000)
        await page.get_by_role("button", name="Show solution").click()
        await page.get_by_role("button", name="Put it in the editor").click()
        await page.get_by_role("button", name="Run", exact=True).click()
        await expect(page.locator(".fb-ok")).to_contain_text("Task solved", timeout=10000)
        res = await page.goto(BASE + f"/sql/{slug}/cheatsheet", wait_until="load")
        assert res and res.status == 200, f"{slug} cheatsheet"
    return f"SQL lessons {', '.join(s for s, _, _ in SQL_LESSONS[1:])}: starter replays, feedback, solution solves task 1, cheatsheet opens"


async def sql_flow(page):
    await page.goto(BASE + "/sql/select", wait_until="load")
    await expect(page.get_by_role("heading", level=1)).to_have_text("Pick the columns you need")
    await page.wait_for_selector(SQL_READY, timeout=30000)
    await expect(page.locator(".sql-note")).to_have_text("FROM starts with every row of products: 15 rows.")
    await expect(page.locator(".sql-clauses button")).to_have_text(["FROM", "SELECT"])
    await expect(page.locator(".sql-status")).to_contain_text("runs in your browser")
    run = page.get_by_role("button", name="Run", exact=True)
    await run.click()
    await expect(page.locator(".fb-warn")).to_contain_text("Your result has 5 columns; this task wants 2.")
    await page.get_by_role("button", name="Show solution").click()
    await page.get_by_role("button", name="Put it in the editor").click()
    await run.click()
    await expect(page.locator(".fb-ok")).to_contain_text("Task solved")
    await expect(page.locator(".sql-tasks h3 small")).to_have_text("1 of 4 solved")
    await expect(page.locator(".sql-clauses button")).to_have_text(["FROM", "SELECT"])
    await page.locator(".fb-ok").get_by_role("button", name="Next task").click()
    await expect(page.locator(".sql-now p")).to_contain_text("name and city")
    await expect(page.locator(".sql-note")).to_have_text("FROM starts with every row of customers: 20 rows.", timeout=10000)
    await type_sql(page, "SELEC name FROM customers")
    await page.keyboard.press("Control+Enter")
    await expect(page.locator(".fb-error")).to_contain_text("There's a typo near SELEC")
    await expect(page.locator(".sql-stage")).to_contain_text("didn't run")
    await type_sql(page, "SELECT name, city FROM customers")
    await page.keyboard.press("Control+Enter")
    await expect(page.locator(".fb-ok")).to_contain_text("Task solved")
    await expect(page.locator(".sql-table-wrap").last).to_be_visible()
    await page.reload(wait_until="load")
    await page.wait_for_selector(SQL_READY, timeout=30000)
    await expect(page.locator(".sql-tasks h3 small")).to_have_text("2 of 4 solved")
    await expect(page.locator(".sql-now .eyebrow")).to_have_text("Task 3 of 4")
    return "SELECT lesson: starter replays FROM then SELECT; a wrong query gets column feedback; the solution and a typed answer solve tasks 1 and 2; a typo gets plain words; progress survives a reload"


async def sql_timeout(page):
    await page.goto(BASE + "/sql/select", wait_until="load")
    await sql_ready(page)
    await type_sql(page, "SELECT count(*) FROM generate_series(1, 10000000000)")
    await page.keyboard.press("Control+Enter")
    await expect(page.locator(".fb-error")).to_contain_text("took longer than 3 seconds", timeout=10000)
    await type_sql(page, "SELECT name, price FROM products")
    await page.keyboard.press("Control+Enter")
    await expect(page.locator(".fb-ok")).to_contain_text("Task solved", timeout=30000)
    return "a runaway query is stopped after 3 seconds, and the next run works"


async def sql_cheatsheet(page):
    res = await page.goto(BASE + "/sql/select/cheatsheet", wait_until="load")
    assert res and res.status == 200
    await expect(page.get_by_role("heading", level=1)).to_have_text("Pick the columns you need")
    await expect(page.locator(".sheet-syntax pre")).to_contain_text("FROM table_name;")
    await expect(page.get_by_role("heading", name="Watch out")).to_be_visible()
    return "SELECT cheatsheet shows the syntax card and the mistake to avoid"


async def main() -> None:
    failed = 0
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path="/usr/bin/google-chrome")
        for check in [lesson_flow, chart_matches_model, unknown_lesson_404, cheatsheet_numbers, light_pages_skip_engine, cdn_flow, cdn_resume_old_price, cdn_cheatsheet, lesson_switch, latency_flow, latency_cheatsheet, home_start_here, lesson_switch_latency, queueing_flow, queueing_cheatsheet, availability_flow, estimation_flow, scaling_flow, lb_flow, proxy_flow, health_flow, session_flow, data_flow, index_flow, repl_flow, shard_flow, ring_flow, bloom_flow, upload_flow, cap_flow, timeline_flow, txn_flow, mq_flow, idem_flow, limit_flow, fanout_flow, gateway_flow, micro_flow, retry_flow, leader_flow, region_flow, method_flow, url_flow, ids_flow, kv_flow, limiter_flow, crawl_flow, search_flow, suggest_flow, notify_flow, feed_flow, chat_flow, nearby_flow, friends_flow, ride_flow, maps_flow, video_flow, sync_flow, objects_flow, email_flow, mqd_flow, metrics_flow, clicks_flow, board_flow, rag_flow, hotel_flow, orders_flow, payment_flow, wallet_flow, exchange_flow, subject_page, sql_subject, sql_flow, sql_timeout, sql_cheatsheet, sql_lessons, net_flow, net_tcpip_flow, net_ip_flow, net_subnet_flow, net_arp_flow, net_dhcp_flow, net_tcpudp_flow, net_handshake_flow, net_ports_flow, net_dns_flow, net_http_flow]:
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
