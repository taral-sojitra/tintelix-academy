import { describe, expect, it } from "vitest";
import { argsFor, expectedFor, parseListing } from "@tintelix/dsa";
import { hasPython, runPyListing } from "@tintelix/dsa/check";
import { dsaCode, dsaLessons } from "../index";

/** Every Python listing, run with python3 on every preset (LLD §12). `pnpm check` requires Python. */
const python = hasPython();
if (!python && process.env.REQUIRE_PYTHON) throw new Error("python3 is needed to check the DSA Python listings (REQUIRE_PYTHON is set)");
if (!python) console.warn("python3 not found: skipping the DSA Python listings");

describe.skipIf(!python)("DSA Python listings", () => {
  for (const lesson of dsaLessons)
    for (const [name, run] of Object.entries(lesson.runs))
      it(`${lesson.id}: ${name} (${run.listing}.py) returns each preset's answer`, () => {
        const code = parseListing(dsaCode[lesson.slug]!.listings[run.listing]!.py, "py").code;
        for (const p of lesson.presets) {
          const got = runPyListing(code, argsFor(lesson.input, p.input, run.args));
          if (lesson.accept) expect(lesson.accept(p.input, got), p.id).toBe(true);
          else expect(got, p.id).toEqual(expectedFor(p, name) ?? null);
        }
      });
});
