import { Component } from "./component";
import { Lesson } from "./lesson";
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
    if (!home?.modules.some((m) => m.lessons.some((l) => l.id === id))) problems.push(`${id}: not listed in subject ${lesson.home}`);
    const known = new Set(input.subjects.flatMap((s) => s.modules.flatMap((m) => m.lessons.map((l) => l.id))));
    for (const b of lesson.buildsOn) if (!known.has(b)) problems.push(`${id}: builds on unknown lesson ${b}`);
    for (const c of lesson.components) if (!componentIds.has(c)) problems.push(`${id}: unknown component ${c}`);
    const stepIds = new Set<string>();
    for (const step of lesson.steps) {
      if (stepIds.has(step.id)) problems.push(`${id}: duplicate step id ${step.id}`);
      stepIds.add(step.id);
      for (const c of step.controls ?? []) if (!(c in lesson.controls)) problems.push(`${id}/step ${step.id} unlocks unknown control ${c}`);
      const outputs = lesson.model.run({ ...lesson.model.defaults, ...step.model });
      const texts = [...step.text, step.note?.text ?? "", ...(step.changed ?? []).map((c) => `${c.label} ${c.value ?? ""}`)];
      for (const name of texts.flatMap(quotedOutputs)) {
        if (!(name in outputs)) problems.push(`${id}/step ${step.id} quotes {${name}}, which the model does not produce`);
      }
    }
    const sheetOutputs = lesson.model.run({ ...lesson.model.defaults, ...lesson.cheatsheetInputs });
    for (const name of lesson.cheatsheet.flatMap((s) => s.text).flatMap(quotedOutputs)) {
      if (!(name in sheetOutputs)) problems.push(`${id}/cheatsheet quotes {${name}}, which the model does not produce`);
    }
  }
  return problems;
}
