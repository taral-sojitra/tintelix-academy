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

const cdn: ContinueTarget = { ...caching, id: "cdn", href: "/system-design/cdn", title: "Serve Mumbai from Mumbai", topic: "CDN", order: 6, minutes: 8 };

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

  it("moves on to the next lesson once Caching is finished", async () => {
    await getStore().saveStep("caching", 5, 6);
    render(<ContinueCard lessons={[caching, cdn]} />);
    expect(await screen.findByText("Serve Mumbai from Mumbai")).toBeTruthy();
    expect(screen.getByText(/^Start here/)).toBeTruthy();
  });
});
