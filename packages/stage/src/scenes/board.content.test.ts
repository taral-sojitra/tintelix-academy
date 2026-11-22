import { lessons } from "../../../../content/index";
import { CUSTOM } from "../board/widgets";
import { ICONS } from "../icons";

const boards = lessons.flatMap((l) => (l.scene.board ? [{ id: l.id, board: l.scene.board }] : []));

describe("board lessons", () => {
  it("there is at least one", () => {
    expect(boards.length).toBeGreaterThan(0);
  });
  it("use only icons the stage has", () => {
    const bad = boards.flatMap(({ id, board }) => board.modes.flatMap((m) => m.tiles.filter((t) => !(t.icon in ICONS)).map((t) => `${id}: ${t.icon}`)));
    expect(bad).toEqual([]);
  });
  it("use only custom widgets the stage has", () => {
    const bad = boards.flatMap(({ id, board }) =>
      Object.values(board.widgets ?? {}).flatMap((ws) => ws.flatMap((w) => (w.kind === "custom" && !(w.name in CUSTOM) ? [`${id}: ${w.name}`] : []))),
    );
    expect(bad).toEqual([]);
  });
  it("colour their legend with palette colours", () => {
    const keys = new Set(["cyan", "green", "amber", "violet", "red", "blue", "white"]);
    const bad = boards.flatMap(({ id, board }) => board.legend.filter(([c]) => !keys.has(c)).map(([c]) => `${id}: ${c}`));
    expect(bad).toEqual([]);
  });
});
