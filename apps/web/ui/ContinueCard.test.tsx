// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import { ContinueCard, type ContinueTarget } from "./ContinueCard";
import { getStore } from "./store";

const caching: ContinueTarget = {
  id: "caching",
  href: "/system-design/caching",
  title: "Survive the flash sale",
  topic: "Caching",
  subject: "System Design",
  order: 5,
  total: 20,
  steps: 6,
  minutes: 9,
};

describe("ContinueCard", () => {
  it("offers to resume a lesson the learner is part-way through", async () => {
    await getStore().saveStep("caching", 2, 6);
    render(<ContinueCard lessons={[caching]} />);
    expect(await screen.findByText("Resume")).toBeTruthy();
    expect(screen.getByText(/^Continue/)).toBeTruthy();
  });

  it("says the lesson is finished, not 'Start here', once every step is done", async () => {
    await getStore().saveStep("caching", 5, 6);
    await getStore().saveStep("caching", 0, 6);
    render(<ContinueCard lessons={[caching]} />);
    expect(await screen.findByText("Review the lesson")).toBeTruthy();
    expect(screen.getByText(/^Finished/)).toBeTruthy();
    expect(screen.queryByText(/Start here/)).toBeNull();
  });
});
