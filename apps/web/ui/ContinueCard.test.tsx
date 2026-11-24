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

  it("counts tasks, not steps, for a finished SQL lesson", async () => {
    const select: ContinueTarget = { ...caching, id: "sql-select", href: "/sql/select", title: "Pick the columns you need", topic: "SELECT", subject: "SQL", steps: 4, unit: "task" };
    await getStore().saveStep("sql-select", 3, 4);
    render(<ContinueCard lessons={[select]} />);
    expect(await screen.findByText(/all 4 tasks done/)).toBeTruthy();
  });

  it("moves on to the next lesson once Caching is finished", async () => {
    await getStore().saveStep("caching", 5, 6);
    render(<ContinueCard lessons={[caching, cdn]} />);
    expect(await screen.findByText("Serve Mumbai from Mumbai")).toBeTruthy();
    expect(screen.getByText(/^Start here/)).toBeTruthy();
  });
});
