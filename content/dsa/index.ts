import type { Algo } from "@tintelix/dsa";
import type { DsaLesson } from "@tintelix/schema";
import * as howToSolveAlgos from "./how-to-solve/algo";
import { howToSolve } from "./how-to-solve/lesson";
import { listings as howToSolveListings } from "./how-to-solve/listings";

/** Every written DSA lesson, in teaching order. */
export const dsaLessons: DsaLesson[] = [howToSolve];

/** Each lesson's algorithms (by export name) and listings (by key), keyed by lesson slug. */
export const dsaCode: Record<string, { algos: Record<string, Algo>; listings: Record<string, { ts: string; py: string }> }> = {
  "how-to-solve": { algos: howToSolveAlgos as Record<string, Algo>, listings: howToSolveListings },
};

export { dsa } from "./subject";
export { LEETCODE, leetcodeUrl, type LeetCodeProblem } from "./leetcode";
