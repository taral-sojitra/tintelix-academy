# API gateway lesson ("One front door")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 26 of System Design: without a gateway every service repeats sign-in checks and limits and the app knows every address; a gateway is one front door for sign-in, limits and routing; it can gather a screen's calls into one; it sits in every request, so it runs as a fleet and stays thin.

**Approach (my call).** A `gateway` scene: phone → (gateway, from step 2) → six services drawn as rows saying "checks sign-in itself" or "trusts the gateway". In the aggregation step one phone call goes to the gateway, which calls Users and then Orders over the internal network (violet) before replying.

**Model.** 6 services: 6 sign-in checks and 6 addresses without a gateway, 1 with one. Home screen: 2 dependent rounds × (100 ms phone round trip + 20 ms work) = 240 ms; through the gateway +2 ms per round = 244 ms; aggregated = 100 + 2 + 2 × (1 + 20) = 144 ms. Fleet: ⌈50,000 ÷ 10,000⌉ + 1 = 6 copies.

| # | id | Title | Key numbers |
|---|---|---|---|
| 1 | many-doors | Every service guards its own door | 6 checks, 6 addresses, 240 ms |
| 2 | front-door | One front door | 1 check, +2 ms, 244 ms |
| 3 | aggregate | One call for the whole screen | 1 call, 144 ms; Try it: phone round trip |
| 4 | fleet | The front door can't fall off | 6 copies |
| 5 | recap | What the gateway taught us | points to monolith vs microservices |
