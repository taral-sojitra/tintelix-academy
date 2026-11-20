// @vitest-environment jsdom
import type { SceneSpec } from "@tintelix/schema";
import { buildStage } from "./dom";

const spec: SceneSpec = {
  kind: "cdn",
  world: { w: 400, h: 200 },
  bounds: { x: 0, y: 0, w: 400, h: 200 },
  nodes: {
    users: { x: 10, y: 60, w: 100, h: 60, kind: "users", label: "Users", sub: "Mumbai" },
    origin: { x: 280, y: 60, w: 100, h: 60, kind: "origin", label: "Origin", sub: "Virginia, USA" },
  },
  wires: { u_origin: { from: [110, 90], to: [280, 90] } },
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
});
