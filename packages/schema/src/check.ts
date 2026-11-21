import { Component } from "./component";
import { boardOutputs, boardTexts } from "./board";
import { Lesson, SCENE_MODES } from "./lesson";
import { Subject } from "./subject";

export const MAX_TITLE = 40;

/** Names quoted as {name} in content text, in order of appearance. */
export function quotedOutputs(text: string): string[] {
  return [...text.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)].map((m) => m[1]!);
}

/** Every rule the content build enforces. An empty result means the content is valid. */
export function checkContent(input: { subjects: Subject[]; lessons: Lesson[]; components: Component[] }): string[] {
  const problems: string[] = [];
  const componentIds = new Set<string>();
  for (const c of input.components) {
    const parsed = Component.safeParse(c);
    if (!parsed.success) for (const i of parsed.error.issues) problems.push(`component ${c.id}: ${i.path.join(".")} ${i.message}`);
    if (componentIds.has(c.id)) problems.push(`duplicate component id ${c.id}`);
    componentIds.add(c.id);
  }
  for (const s of input.subjects) {
    const parsed = Subject.safeParse(s);
    if (!parsed.success) for (const i of parsed.error.issues) problems.push(`subject ${s.id}: ${i.path.join(".")} ${i.message}`);
  }
  const lessonIds = new Set<string>();
  for (const lesson of input.lessons) {
    const id = lesson.id;
    const parsed = Lesson.safeParse(lesson);
    if (!parsed.success) {
      for (const i of parsed.error.issues) problems.push(`${id}: ${i.path.join(".")} ${i.message}`);
      continue;
    }
    if (lessonIds.has(id)) problems.push(`duplicate lesson id ${id}`);
    lessonIds.add(id);
    if (lesson.title.length > MAX_TITLE) problems.push(`${id}: title "${lesson.title}" is over ${MAX_TITLE} characters`);
    const home = input.subjects.find((s) => s.id === lesson.home);
    const stub = home?.modules.flatMap((m) => m.lessons).find((l) => l.id === id);
    if (!stub) problems.push(`${id}: not listed in subject ${lesson.home}`);
    else {
      for (const field of ["slug", "topic", "title"] as const) {
        const want = stub[field];
        if (want !== undefined && lesson[field] !== want) problems.push(`${id}: ${field} "${lesson[field]}" differs from its subject entry "${want}"`);
      }
    }
    const { bounds, nodes, kind } = lesson.scene;
    for (const [nid, n] of Object.entries(nodes)) {
      if (n.x < bounds.x || n.y < bounds.y || n.x + n.w > bounds.x + bounds.w || n.y + n.h > bounds.y + bounds.h) problems.push(`${id}: node ${nid} lies outside the scene bounds`);
    }
    const inputs = new Set(Object.keys(lesson.model.defaults));
    const known = new Set(input.subjects.flatMap((s) => s.modules.flatMap((m) => m.lessons.map((l) => l.id))));
    for (const b of lesson.buildsOn) if (!known.has(b)) problems.push(`${id}: builds on unknown lesson ${b}`);
    for (const c of lesson.components) if (!componentIds.has(c)) problems.push(`${id}: unknown component ${c}`);
    const stepIds = new Set<string>();
    for (const step of lesson.steps) {
      if (stepIds.has(step.id)) problems.push(`${id}: duplicate step id ${step.id}`);
      stepIds.add(step.id);
      for (const c of step.controls ?? []) if (!(c in lesson.controls)) problems.push(`${id}/step ${step.id} unlocks unknown control ${c}`);
      const mode = step.sim?.mode;
      if (mode !== undefined && !SCENE_MODES[kind].includes(mode)) problems.push(`${id}/step ${step.id} uses sim mode ${mode}, which a ${kind} scene doesn't have`);
      const named = [...(step.scene?.add ?? []), ...(step.scene?.remove ?? []), ...(step.scene?.focus ?? [])];
      for (const n of named) if (!(n in nodes)) problems.push(`${id}/step ${step.id} names unknown node ${n}`);
      for (const k of Object.keys(step.model ?? {})) if (!inputs.has(k)) problems.push(`${id}/step ${step.id} sets ${k}, which is not a model input`);
      const outputs = lesson.model.run({ ...lesson.model.defaults, ...step.model });
      const texts = [...step.text, step.note?.text ?? "", ...(step.changed ?? []).map((c) => `${c.label} ${c.value ?? ""}`)];
      for (const name of texts.flatMap(quotedOutputs)) {
        if (!(name in outputs)) problems.push(`${id}/step ${step.id} quotes {${name}}, which the model does not produce`);
      }
    }
    const board = lesson.scene.board;
    if (lesson.scene.kind === "board" && !board) problems.push(`${id}: scene kind board needs scene.board`);
    if (board) {
      for (const [fid, f] of Object.entries(board.flows)) {
        if (f.from !== undefined && !(f.from in nodes)) problems.push(`${id}: board flow ${fid} starts at unknown node ${f.from}`);
        for (const hop of f.path) {
          if (!(hop.wire in lesson.scene.wires)) problems.push(`${id}: board flow ${fid} uses unknown wire ${hop.wire}`);
          if (!(hop.at in nodes)) problems.push(`${id}: board flow ${fid} reaches unknown node ${hop.at}`);
        }
        if (f.fail && !f.fail.share.endsWith("Pct")) problems.push(`${id}: board flow ${fid} fail share ${f.fail.share} must be a …Pct output`);
        if (f.fail && !(f.fail.at in nodes)) problems.push(`${id}: board flow ${fid} fails at unknown node ${f.fail.at}`);
      }
      for (const [i, m] of board.modes.entries()) {
        for (const f of m.flows) if (!(f.flow in board.flows)) problems.push(`${id}: board mode ${i} runs unknown flow ${f.flow}`);
        const outputs = lesson.model.run({ ...lesson.model.defaults, mode: i });
        for (const name of boardTexts(board, i).flatMap(quotedOutputs)) {
          if (!(name in outputs)) problems.push(`${id}: board mode ${i} quotes {${name}}, which the model does not produce`);
        }
        for (const name of boardOutputs(board)) if (!(name in outputs)) problems.push(`${id}: board mode ${i} reads ${name}, which the model does not produce`);
      }
      for (const node of [...Object.keys(board.widgets ?? {}), ...Object.keys(board.subs ?? {}), ...(board.states ?? []).map((s) => s.node)]) {
        if (!(node in nodes)) problems.push(`${id}: board names unknown node ${node}`);
      }
      for (const step of lesson.steps) {
        const mode = step.model?.mode ?? lesson.model.defaults.mode ?? 0;
        if (mode >= board.modes.length) problems.push(`${id}/step ${step.id} sets mode ${mode}; the board has ${board.modes.length} modes`);
      }
    }
    const defaults = lesson.model.run(lesson.model.defaults);
    for (const [name, control] of Object.entries(lesson.controls)) {
      for (const q of quotedOutputs(control.readout ?? "")) if (!(q in defaults)) problems.push(`${id}/control ${name} quotes {${q}}, which the model does not produce`);
    }
    const sheetOutputs = lesson.model.run({ ...lesson.model.defaults, ...lesson.cheatsheetInputs });
    for (const name of lesson.cheatsheet.flatMap((s) => s.text).flatMap(quotedOutputs)) {
      if (!(name in sheetOutputs)) problems.push(`${id}/cheatsheet quotes {${name}}, which the model does not produce`);
    }
  }
  return problems;
}
