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
    await expect(page.get_by_text("Start here · System Design · Lesson 1 of 30")).to_be_visible()
    await expect(page.get_by_text("The average is lying").first).to_be_visible()
    return "a new learner's Home card starts at Lesson 1 of 30, The average is lying"


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


async def subject_page(page):
    await page.goto(BASE + "/system-design", wait_until="load")
    await expect(page.get_by_text("24 open now")).to_be_visible()
    await page.goto(BASE + "/system-design/cdn", wait_until="load")
    await expect(page.get_by_text("24 of 30 open")).to_be_visible()
    return "System Design shows 24 lessons open"


async def main() -> None:
    failed = 0
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path="/usr/bin/google-chrome")
        for check in [lesson_flow, chart_matches_model, unknown_lesson_404, cheatsheet_numbers, light_pages_skip_engine, cdn_flow, cdn_resume_old_price, cdn_cheatsheet, lesson_switch, latency_flow, latency_cheatsheet, home_start_here, lesson_switch_latency, queueing_flow, queueing_cheatsheet, availability_flow, estimation_flow, scaling_flow, lb_flow, proxy_flow, health_flow, session_flow, data_flow, index_flow, repl_flow, shard_flow, ring_flow, bloom_flow, upload_flow, cap_flow, timeline_flow, txn_flow, mq_flow, idem_flow, limit_flow, subject_page]:
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
