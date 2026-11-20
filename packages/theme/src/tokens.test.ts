import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DEFAULT_THEME, THEMES } from "./index";

describe("theme tokens", () => {
  it("both themes define the same variables", () => {
    expect(Object.keys(THEMES.blueprint).sort()).toEqual(Object.keys(THEMES.warm).sort());
  });

  it("defaults to the warm theme", () => {
    expect(DEFAULT_THEME).toBe("warm");
  });

  it("theme.css sets every token for both themes", () => {
    const css = readFileSync(fileURLToPath(new URL("./theme.css", import.meta.url)), "utf8");
    const [warmBlock = "", blueprintBlock = ""] = css.split('[data-theme="blueprint"]');
    for (const [name, value] of Object.entries(THEMES.warm)) expect(warmBlock).toContain(`${name}: ${value};`);
    for (const [name, value] of Object.entries(THEMES.blueprint)) expect(blueprintBlock).toContain(`${name}: ${value};`);
  });
});
