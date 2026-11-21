# Estimation lesson ("From users to servers")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 4 of System Design, from *Vintelix System Design 101* Chapter 95: 10 million monthly users → 2 million daily → 80 million requests a day → 926/s average → 2,778/s at a 3× peak → 24 cores at a 60% target (not the 14 a flat-out division gives) → about 1.8× after a year of 5% monthly growth. Storage (2 records of 1 KB per daily user per day, 3 copies) is the lesson's own stated assumption.

**Approach (my call).** An `estimate` scene: a live calculator drawn as boxes and arrows, revealed one step at a time. Each box shows its value and each arrow its factor, all from the model; tokens flow along the shown arrows. Four sliders: peak ratio, utilization target, record size, monthly growth.

| # | id | Title |
|---|---|---|
| 1 | how-many-servers | How many servers do we need? |
| 2 | busiest-hour | Size for the busiest hour |
| 3 | room-to-queue | Leave room for the queue |
| 4 | storage | Then add up the storage |
| 5 | next-year | And next year? |
| 6 | recap | What the estimate taught us |

**Sources.** Book Chapter 95 §95.2 (users to peak QPS), §95.3–95.4 (cores at a utilization target, why headroom), the 5% growth example.
