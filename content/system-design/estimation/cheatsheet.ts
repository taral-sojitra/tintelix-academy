import type { Lesson } from "@tintelix/schema";

export const estimationCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Users to requests",
    text: [
      "Monthly users × daily share = daily users; × requests each ÷ 86,400 = requests a second; × peak ratio = the busiest hour.",
      "{mau} monthly users → {dau} daily → {avgRps}/s on average → {peakRps}/s at peak.",
    ],
  },
  {
    heading: "Cores",
    text: ["Cores = peak ÷ (per-core rate × utilization target). Here {peakRps}/s at {perCoreAtTarget}/s a core is {cores} cores. Flat out it would be {coresNaive}, and requests would queue."],
  },
  {
    heading: "Storage",
    text: ["Daily users × records a day × record size × 365 × copies: {storageTotalTb} TB a year here."],
  },
  {
    heading: "Growth",
    text: ["{growthPct} a month for {months} months is {growthFactor}×, not {simpleGrowth}×: growth compounds."],
  },
  {
    heading: "Handy numbers",
    text: ["A day has 86,400 seconds, about 100,000. A million requests a day is about 12 a second; a billion is about 12,000."],
  },
];
