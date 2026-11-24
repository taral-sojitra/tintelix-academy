import type { Lesson } from "@tintelix/schema";

export const metricsCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["{hosts} servers × {perHost} = {seriesM} million series; every {scrapeSec}: {sampleRate} samples a second. As rows: {rawTbDay} TB a day; compressed: {compGbDay} GB."],
  },
  {
    heading: "Store and roll up",
    text: ["Shard series by hash over {nodes} nodes ({dbBusyPct} busy). Store differences, about {compBytes} bytes a sample. Raw {rawDays} days, 1-minute rollups {minuteDays} days, 1-hour for two years: {rollupTb} TB, not {rawTb2y}. A 30-day graph reads {rollupPoints} points."],
  },
  {
    heading: "Labels and alerts",
    text: ["Series = every combination of label values. A user-ID label: {badSeries} series ({seriesMemMb} MB). Alert on error rate and p95 against targets, held for minutes; page once per incident."],
  },
];
