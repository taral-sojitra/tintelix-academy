// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import type { Frame } from "@tintelix/sql";
import { ReplayStage } from "./Replay";

const frames: Frame[] = [
  { clause: "FROM", note: "FROM starts with every row of customers: 3 rows.", columns: ["id", "city"], rows: [[1, "Pune"], [2, null], [3, "Surat"]], total: 3 },
  { clause: "WHERE", note: "WHERE kept 1 of 3 rows.", columns: ["id", "city"], rows: [[1, "Pune"], [2, null], [3, "Surat"]], total: 3, marks: ["pass", "unknown", "fail"] },
  { clause: "GROUP BY", note: "GROUP BY put the 3 rows into 2 groups, one per city.", columns: ["city"], rows: [["Pune"], ["Pune"], ["Surat"]], total: 3, groups: [0, 0, 1] },
  { clause: "SELECT", note: "SELECT picked id.", columns: ["id"], rows: [[1]], total: 1, picked: ["id"] },
];

const rowClasses = (c: HTMLElement) => [...c.querySelectorAll(".sql-stage tbody tr")].map((r) => r.className);

describe("ReplayStage", () => {
  it("shows the clauses in the order Postgres runs them, starting at FROM", () => {
    render(<ReplayStage replay={{ supported: true, frames }} autoplay={false} />);
    const chips = screen.getAllByRole("button", { name: /^(FROM|WHERE|GROUP BY|SELECT)$/ });
    expect(chips.map((c) => c.textContent)).toEqual(["FROM", "WHERE", "GROUP BY", "SELECT"]);
    expect(chips[0]!.getAttribute("aria-current")).toBe("step");
    expect(screen.getByText("FROM starts with every row of customers: 3 rows.")).toBeTruthy();
  });

  it("steps forward and back, marking the rows WHERE tested", () => {
    const { container } = render(<ReplayStage replay={{ supported: true, frames }} autoplay={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Next clause" }));
    expect(screen.getByText("WHERE kept 1 of 3 rows.")).toBeTruthy();
    expect(rowClasses(container)).toEqual(["m-pass", "m-unknown", "m-fail"]);
    fireEvent.click(screen.getByRole("button", { name: "Next clause" }));
    expect(rowClasses(container)).toEqual(["g-0 g-start", "g-0", "g-1 g-start"]);
    fireEvent.click(screen.getByRole("button", { name: "Previous clause" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous clause" }));
    expect(screen.getByText("FROM starts with every row of customers: 3 rows.")).toBeTruthy();
  });

  it("jumps to a clause and shows NULL as NULL", () => {
    const { container } = render(<ReplayStage replay={{ supported: true, frames }} autoplay={false} />);
    fireEvent.click(screen.getByRole("button", { name: "SELECT" }));
    expect(screen.getByText("SELECT picked id.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "FROM" }));
    expect(container.querySelector(".sql-stage .null")?.textContent).toBe("NULL");
  });

  it("says why when there's no replay", () => {
    render(<ReplayStage replay={{ supported: false, reason: "The replay can't follow WITH yet, so here's just its result." }} autoplay={false} />);
    expect(screen.getByText("The replay can't follow WITH yet, so here's just its result.")).toBeTruthy();
  });
});
