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
