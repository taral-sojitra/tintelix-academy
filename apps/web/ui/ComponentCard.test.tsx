// @vitest-environment jsdom
import { components } from "@tintelix/content";
import { cleanup, render, screen } from "@testing-library/react";
import { ComponentCard } from "./ComponentCard";

afterEach(cleanup);

describe("ComponentCard", () => {
  const cache = components.find((c) => c.id === "cache")!;

  it("shows the name, the one-line summary and the category", () => {
    render(<ComponentCard component={cache} />);
    expect(screen.getByRole("heading", { name: "Cache" })).toBeTruthy();
    expect(screen.getByText(cache.oneLine)).toBeTruthy();
    expect(screen.getByText("Storage")).toBeTruthy();
  });

  it("lists when to use it and what to watch out for", () => {
    render(<ComponentCard component={cache} />);
    for (const line of [...cache.useWhen, ...cache.watchOut]) expect(screen.getByText(line)).toBeTruthy();
  });

  it("shows its rough numbers and tools", () => {
    render(<ComponentCard component={cache} />);
    expect(screen.getByText("about 0.5 ms")).toBeTruthy();
    expect(screen.getByText("Redis")).toBeTruthy();
  });
});
