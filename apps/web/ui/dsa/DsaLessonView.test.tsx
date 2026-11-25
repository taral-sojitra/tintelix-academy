// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DsaLessonView } from "./DsaLessonView";

const scene = (c: HTMLElement) => c.querySelector<HTMLElement>(".dsa-scene")!;
const track = (c: HTMLElement, i: number) => c.querySelectorAll<HTMLButtonElement>(".track .st")[i]!;

describe("DsaLessonView", () => {
  it("plays a new step from its start when chosen mid-run, even if the old frame is past the new step's prediction", async () => {
    const { container } = render(<DsaLessonView slug="hashing" />);
    await waitFor(() => expect(scene(container).dataset.ready).toBe("true"));
    fireEvent.click(track(container, 2));
    // Playback runs on real timers (700 ms a move), and the full suite runs in parallel, so the waits are generous.
    await waitFor(() => expect(container.querySelector(".dsa-predict.ask")).not.toBeNull(), { timeout: 15000 });
    fireEvent.click(screen.getByRole("button", { name: "Bucket 1, with 8" }));
    // Still playing, and already past frame 6, where the next step's prediction sits.
    await waitFor(() => expect(Number(scene(container).dataset.frame)).toBeGreaterThanOrEqual(6), { timeout: 15000 });
    act(() => fireEvent.click(track(container, 3)));
    await waitFor(() => expect(container.querySelector(".dsa-predict.ask")).not.toBeNull(), { timeout: 15000 });
    expect(scene(container).dataset.frame).toBe("6");
  }, 60000);
});

describe("DsaLessonView input form", () => {
  const fields = (c: HTMLElement) => [...c.querySelectorAll<HTMLInputElement>(".dsa-form input")].map((i) => i.name);
  it("shows only the fields the step's run takes, and runs a custom value with the rest from the preset", async () => {
    const { container } = render(<DsaLessonView slug="stacks-queues" />);
    await waitFor(() => expect(scene(container).dataset.ready).toBe("true"));
    fireEvent.click(track(container, 2));
    expect(fields(container)).toEqual(["s"]);
    fireEvent.click(track(container, 7));
    expect(fields(container)).toEqual(["temps"]);
    fireEvent.change(container.querySelector<HTMLInputElement>(".dsa-form input[name='temps']")!, { target: { value: "30, 60, 90" } });
    fireEvent.submit(container.querySelector(".dsa-form")!);
    await waitFor(() => expect([...container.querySelectorAll(".ts-array[data-id='wait'] .ts-cell b")].map((b) => b.textContent)).toEqual(["1", "1", "0"]), { timeout: 20000 });
  }, 60000);
});
