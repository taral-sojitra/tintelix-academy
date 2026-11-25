import type { Algo } from "@tintelix/dsa";
import type { DsaLesson } from "@tintelix/schema";
import * as arraysAlgos from "./arrays-big-o/algo";
import { arraysBigO } from "./arrays-big-o/lesson";
import { listings as arraysListings } from "./arrays-big-o/listings";
import * as hashingAlgos from "./hashing/algo";
import { hashing } from "./hashing/lesson";
import { listings as hashingListings } from "./hashing/listings";
import * as howToSolveAlgos from "./how-to-solve/algo";
import { howToSolve } from "./how-to-solve/lesson";
import { listings as howToSolveListings } from "./how-to-solve/listings";
import * as twoPointersAlgos from "./two-pointers/algo";
import { twoPointers } from "./two-pointers/lesson";
import { listings as twoPointersListings } from "./two-pointers/listings";
import * as slidingWindowAlgos from "./sliding-window/algo";
import { slidingWindow } from "./sliding-window/lesson";
import { listings as slidingWindowListings } from "./sliding-window/listings";
import * as stringsAlgos from "./strings/algo";
import { strings } from "./strings/lesson";
import { listings as stringsListings } from "./strings/listings";

/** Every written DSA lesson, in teaching order. */
export const dsaLessons: DsaLesson[] = [howToSolve, arraysBigO, strings, hashing, twoPointers, slidingWindow];

/** Each lesson's algorithms (by export name) and listings (by key), keyed by lesson slug. */
export const dsaCode: Record<string, { algos: Record<string, Algo>; listings: Record<string, { ts: string; py: string }> }> = {
  "how-to-solve": { algos: howToSolveAlgos as Record<string, Algo>, listings: howToSolveListings },
  "arrays-big-o": { algos: arraysAlgos as Record<string, Algo>, listings: arraysListings },
  strings: { algos: stringsAlgos as Record<string, Algo>, listings: stringsListings },
  hashing: { algos: hashingAlgos as Record<string, Algo>, listings: hashingListings },
  "two-pointers": { algos: twoPointersAlgos as Record<string, Algo>, listings: twoPointersListings },
  "sliding-window": { algos: slidingWindowAlgos as Record<string, Algo>, listings: slidingWindowListings },
};

export { dsa } from "./subject";
export { LEETCODE, leetcodeUrl, type LeetCodeProblem } from "./leetcode";
