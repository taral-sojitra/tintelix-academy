// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { getLesson } from "@tintelix/content";
import { TryIt } from "./TryIt";

const cdn = getLesson("system-design", "cdn")!;
const show = (name: "originKm" | "ttlSec", value: number) => {
  const { container } = render(
    <TryIt name={name} control={cdn.controls[name]!} value={value} enabled lockedText="" outputs={{}} onChange={() => {}} onReset={() => {}} changed={false} />,
  );
  return container.querySelector(".try-val")!.textContent;
};

const lessonControl = (subject: string, slug: string, name: string, value: number) => {
  const lesson = getLesson(subject, slug)!;
  const { container } = render(
    <TryIt name={name} control={lesson.controls[name]!} value={value} enabled lockedText="" outputs={{}} onChange={() => {}} onReset={() => {}} changed={false} />,
  );
  return { text: container.querySelector(".try-val")!.textContent, input: container.querySelector("input")! };
};

describe("TryIt units", () => {
  it("a *Pct control already holds a percentage: 30 reads 30%, 0.9 reads 0.9%", () => {
    expect(lessonControl("system-design", "proxies", "slowPct", 30).text).toBe("30%");
    expect(lessonControl("system-design", "latency-percentiles", "slowPct", 0.9).text).toBe("0.9%");
    expect(lessonControl("system-design", "availability", "sharedPct", 0.05).text).toBe("0.05%");
  });
  it("a *Pct slider runs over the control's own range", () => {
    const { input } = lessonControl("system-design", "health-checks", "maxEjectPct", 10);
    expect([input.min, input.max, input.step, input.value]).toEqual(["10", "100", "10", "10"]);
  });
  it("a fraction with a % unit still reads as a percentage: hit rate 0.8 reads 80%", () => {
    expect(lessonControl("system-design", "caching", "hitRate", 0.8).text).toBe("80%");
  });
  it("an *Ms control doesn't repeat its unit: 50 ms, not 50 ms ms", () => {
    expect(lessonControl("system-design", "latency-percentiles", "hedgeMs", 50).text).toBe("50 ms");
  });
});

describe("TryIt", () => {
  it("shows a distance as 13,000 km", () => {
    expect(show("originKm", 13000)).toBe("13,000 km");
  });
  it("shows a TTL as 60 s, and an hour as 60 min", () => {
    expect(show("ttlSec", 60)).toBe("60 s");
    expect(show("ttlSec", 3600)).toBe("60 min");
  });
  it("keeps abbreviations in the label: Try it: page TTL", () => {
    const { container } = render(
      <TryIt name="ttlSec" control={cdn.controls.ttlSec!} value={60} enabled lockedText="" outputs={{}} onChange={() => {}} onReset={() => {}} changed={false} />,
    );
    expect(container.querySelector("label")!.textContent).toBe("Try it: page TTL");
  });
});
