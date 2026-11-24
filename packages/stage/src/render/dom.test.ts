// @vitest-environment jsdom
import type { SceneSpec } from "@tintelix/schema";
import { buildStage, renderTiles } from "./dom";

const spec: SceneSpec = {
  kind: "cdn",
  world: { w: 400, h: 200 },
  bounds: { x: 0, y: 0, w: 400, h: 200 },
  nodes: {
    users: { x: 10, y: 60, w: 100, h: 60, kind: "users", label: "Users", sub: "Mumbai" },
    origin: { x: 280, y: 60, w: 100, h: 60, kind: "origin", label: "Origin", sub: "Virginia, USA" },
  },
  regions: [
    { id: "mumbai", label: "Mumbai", x: 0, y: 20, w: 130, h: 160 },
    { id: "virginia", label: "Virginia, USA", x: 260, y: 20, w: 140, h: 160 },
  ],
  wires: { u_origin: { from: [110, 90], to: [280, 90], pace: 0.3, label: "13,000 km" } },
};

describe("buildStage", () => {
  it("builds each node with the body its scene supplies, plus the legend and chart label", () => {
    const host = document.createElement("div");
    const dom = buildStage(host, spec, {
      legend: [["cyan", "request"]],
      chartLabel: "PAGE LOAD · LAST 30 S",
      nodeBody: (id) => `<i data-x="${id}"></i>`,
    });
    expect(host.querySelector("[data-node=users] [data-x=users]")).not.toBeNull();
    expect(host.querySelector("[data-node=origin] [data-x=origin]")).not.toBeNull();
    expect(host.querySelector(".tx-legend")!.textContent).toContain("request");
    expect(host.querySelector(".tx-ch")!.textContent).toContain("PAGE LOAD · LAST 30 S");
    expect(Object.keys(dom.nodes)).toEqual(["users", "origin"]);
  });

  it("draws region boxes and wire labels behind the nodes", () => {
    const host = document.createElement("div");
    buildStage(host, spec, { legend: [], chartLabel: "", nodeBody: () => "" });
    const region = host.querySelector("[data-region=mumbai]")!;
    const label = host.querySelector(".tx-wlabel[data-wire=u_origin]")!;
    expect(region.textContent).toBe("Mumbai");
    expect(label.textContent).toBe("13,000 km");
    const firstNode = host.querySelector(".tx-node")!;
    for (const el of [region, label]) expect(el.compareDocumentPosition(firstNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("slim nodes", () => {
  it("marks a slim node so it draws as one line with no icon", () => {
    const host = document.createElement("div");
    const slim: SceneSpec = { ...spec, nodes: { ...spec.nodes, l4: { x: 10, y: 130, w: 160, h: 36, kind: "services", label: "4 Transport", sub: "TCP, UDP", slim: true } } };
    buildStage(host, slim, { legend: [], chartLabel: "", nodeBody: () => "" });
    expect(host.querySelector("[data-node=l4]")!.classList.contains("tx-slim")).toBe(true);
    expect(host.querySelector("[data-node=users]")!.classList.contains("tx-slim")).toBe(false);
  });
});

describe("renderTiles", () => {
  it("marks long values so they take a smaller size and break between words", () => {
    const hud = document.createElement("div");
    const tile = (value: string) => ({ id: "p", label: "Policy", icon: "shuffle" as const, hue: "blue" as const, value, note: "", mood: "" as const });
    renderTiles(hud, [tile("Least connections")]);
    expect(hud.querySelector(".tx-v")!.classList.contains("long")).toBe(true);
    renderTiles(hud, [tile("27 ms")]);
    expect(hud.querySelector(".tx-v")!.classList.contains("long")).toBe(false);
  });
});

describe("renderTiles labels", () => {
  it("updates a tile's label, icon and colour when a step reuses its id for something else", () => {
    const hud = document.createElement("div");
    renderTiles(hud, [{ id: "b", label: "A write needs", icon: "check", hue: "cyan", value: "3 of 5", note: "", mood: "" }]);
    renderTiles(hud, [{ id: "b", label: "Storage's highest token", icon: "stack", hue: "violet", value: "34", note: "", mood: "" }]);
    expect(hud.querySelector(".tx-k")!.textContent).toBe("Storage's highest token");
    expect(hud.querySelector(".tx-mi")!.classList.contains("h-violet")).toBe(true);
  });
});
