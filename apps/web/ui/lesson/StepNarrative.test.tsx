// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { cleanup, render, screen } from "@testing-library/react";
import { RichText, StepNarrative } from "./StepNarrative";

afterEach(cleanup);

const step: Step = {
  id: "s",
  tag: "problem",
  title: "The database is drowning",
  short: "Drowning",
  text: ["Reads fall to {dbReads} a second", "**Green** dots are hits."],
  note: { kind: "watch", text: "Busy at {dbBusyPct}." },
  changed: [{ kind: "mod", label: "DB load", value: "{dbBusyPct}" }],
  live: "LIVE",
};

describe("StepNarrative", () => {
  it("fills quoted outputs with formatted numbers", () => {
    render(<StepNarrative step={step} index={0} total={6} outputs={{ dbReads: 1080, dbBusyPct: 16.6 }} />);
    expect(screen.getByText("Reads fall to 1,080 a second")).toBeTruthy();
    expect(screen.getByText("Busy at 17%.")).toBeTruthy();
    expect(screen.getByText("17%")).toBeTruthy();
  });

  it("shows the step number, tag and title", () => {
    render(<StepNarrative step={step} index={2} total={6} outputs={{}} />);
    expect(screen.getByText("Step 3 / 6")).toBeTruthy();
    expect(screen.getByText("Problem")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "The database is drowning" })).toBeTruthy();
  });
});

describe("RichText", () => {
  it("renders **bold** as strong", () => {
    const { container } = render(<RichText text="**Green** dots are hits." outputs={{}} />);
    expect(container.querySelector("strong")?.textContent).toBe("Green");
    expect(container.textContent).toBe("Green dots are hits.");
  });

  it("never renders HTML from content", () => {
    const { container } = render(<RichText text="<img src=x onerror=alert(1)>" outputs={{}} />);
    expect(container.querySelector("img")).toBeNull();
  });
});
