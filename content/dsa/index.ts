import type { Algo } from "@tintelix/dsa";
import type { DsaLesson } from "@tintelix/schema";
import * as arraysAlgos from "./arrays-big-o/algo";
import { arraysBigO } from "./arrays-big-o/lesson";
import { listings as arraysListings } from "./arrays-big-o/listings";
import * as howToSolveAlgos from "./how-to-solve/algo";
import { howToSolve } from "./how-to-solve/lesson";
import { listings as howToSolveListings } from "./how-to-solve/listings";

/** Every written DSA lesson, in teaching order. */
export const dsaLessons: DsaLesson[] = [howToSolve, arraysBigO];

/** Each lesson's algorithms (by export name) and listings (by key), keyed by lesson slug. */
export const dsaCode: Record<string, { algos: Record<string, Algo>; listings: Record<string, { ts: string; py: string }> }> = {
  "how-to-solve": { algos: howToSolveAlgos as Record<string, Algo>, listings: howToSolveListings },
  "arrays-big-o": { algos: arraysAlgos as Record<string, Algo>, listings: arraysListings },
};

export { dsa } from "./subject";
export { LEETCODE, leetcodeUrl, type LeetCodeProblem } from "./leetcode";
