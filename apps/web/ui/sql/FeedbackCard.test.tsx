// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { FeedbackCard } from "./FeedbackCard";

describe("FeedbackCard", () => {
  it("invites a first run", () => {
    render(<FeedbackCard feedback={null} />);
    expect(screen.getByText(/Run the query to check it/)).toBeTruthy();
  });
  it("celebrates a solved task", () => {
    render(<FeedbackCard feedback={{ ok: true }} />);
    expect(screen.getByText("Task solved")).toBeTruthy();
  });
  it("shows a Postgres error", () => {
    const { container } = render(<FeedbackCard feedback={{ ok: false, kind: "error", message: "There's no column called nme." }} />);
    expect(container.querySelector(".fb-error")).not.toBeNull();
    expect(screen.getByText("There's no column called nme.")).toBeTruthy();
  });
  it("shows rows that are missing and rows that shouldn't be there", () => {
    render(<FeedbackCard feedback={{ ok: false, kind: "rows", message: "1 row is missing.", missing: [["Rope", "499.00"]], extra: [["Mat", null]] }} />);
    expect(screen.getByText("Missing")).toBeTruthy();
    expect(screen.getByText("Rope")).toBeTruthy();
    expect(screen.getByText("Shouldn't be there")).toBeTruthy();
    expect(screen.getByText("NULL")).toBeTruthy();
  });
  it("explains a wrong order", () => {
    render(<FeedbackCard feedback={{ ok: false, kind: "order", message: "Right rows, wrong order. The numbers show where each row should be.", shouldBe: [2, 1] }} />);
    expect(screen.getByText(/wrong order/)).toBeTruthy();
  });
});
