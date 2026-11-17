# Crate Factory: BOBALAB 2-player game

An Empirica game based on Sinchaisri & Wang, *"Information Exchange through AI: Disclosure, Strategic Replies, and Coordination"* (working paper).

Two players each run a plant for the same company: the **North plant** and the **South plant**. Both play the same way: same screens, same messages and same scoring. Plants are assigned at random.

## How a game runs

The game is 8 independent days with the same partner. Each day is one run of the paper's static model (Secs 2–4), which is what the disclosure conditions and tips are derived for. The code still supports multi-day shifts (`GAME.daysPerShift`, the Sec 6 two-period task), but the "optimal" policy and the tips would then need the two-period versions.

Each day:

1. **Setup:** each player gets a secret type `T`, told as a factory situation: bigger changes pay more (`T=+1`, e.g. "Overtime crew on call") or smaller changes pay more (`T=−1`, e.g. "Retooling is expensive"). They also get a local condition `X = ±1` (e.g. "Supplier delay: go below normal"). The AI sees true demand `θ ~ U[0.55, 1.5]` and shows a public forecast: exact, a range, or hidden, depending on the condition.
2. **Message:** each player picks one of the 4 messages, and the AI passes it on unchanged (Sec 2.2).
3. **Decide:** each player drags their crates along the line.
4. **Results:** true demand, both picks, both messages and the partner's type are revealed.

## Scoring (paper Eq. 2–4)

- Player loss: `ℓ = (1−γ)(a − D)² + γ(a − a_partner)²`, where `D = (θh + βT)X`.
- Company loss: `L = (1−γ)/2 · Σ(a_i − θhX_i)² + γ(a_1 − a_2)²`.
- Players earn `max(0, 100 − 60ℓ)` game dollars per day (up to $100, $800 per game). At this scale, picking well instead of just taking your sweet spot is worth about $7–30 a day. Only picks far from both your sweet spot and your partner hit the $0 floor. The company score `max(0, 100 − 60L)` is recorded as `teamStars` but not shown to players.

## What players see

- **Messages as numbers.** The paper's four messages (`up2`, `up1`, `down1`, `down2`) are shown as four flags on the crate line, each at the sweet spot it claims given the day's forecast mean: `(μh ± β)·X`. The chosen label is saved as `msg{day}`.
- **One crate line.** Every screen uses the same −250…+250 crate line. On the Message screen the four messages are flags on it; on the Decide screen a pay curve sits above it.
- **Pay curve.** On the Decide screen, a curve shows the day's pay for every possible pick, given the player's sweet spot (from the forecast) and a guess about where the partner will land. A breakdown shows the two costs for the current pick. The best pick is not labelled; players find the peak themselves.
- **Partner guess.** The partner's diamond on the Decide line starts at their message and can be dragged. The final value is saved as `guess{day}`. `guessUntouched{day}` is set if the player never moved it.

## Conditions (`.empirica/treatments.yaml`)

| Factor | Values | Paper |
|---|---|---|
| `disclosure` | `direct`: no forecast · `full`: exact demand · `optimal`: exact except a pooled band `[μc − w, μc + w]` shown as a range | Sec 4.5, Prop 2, Eq. 27–28 |
| `tips` | AI marks the recommended message: tell the size too (`full`) when `μ ≤ μc`, otherwise just the direction | Sec 4.4 |

Four treatments: No forecast, Full forecast, Optimal forecast, Optimal forecast + tips.

Parameters: `h = 1`, `β = 0.5`, `q = 0.5`, `γ = 0.35` (fixed; below √2−1, so pooling can help). `μc = 0.675` and the pooled band is about `[0.626, 0.724]`, roughly 10% of days. All numbers live in `shared/model.js`.

## Not yet implemented

- **Message replacement (Sec 5, Prop 5).** It needs type priors close to 1 and a narrow demand range.
- **Fully private attributes.** True demand stays in server memory until results, but the partner's bonus type and messages sit in player attributes before results. Before collecting real data, test with Empirica's `{ private: true }` option and run a leak check in devtools.
- **Two-period-specific tips.** Lemma 2 lets day-1 honest reporting hold over a wider range than the one-period rule. The tips currently use the one-period rule on both days.
- **A data export script** for the 2-player version.

## Run

```sh
curl -fsS https://install.empirica.dev | sh   # once
empirica                                       # from the repo root
```

1. Admin: <http://localhost:3000/admin> (login in `.empirica/empirica.toml`). Create a game for a treatment.
2. Players: open <http://localhost:3000/?participantKey=a> and `?participantKey=b` in two tabs.

## Study 1: shipping game against a programmed South plant (for Qualtrics)

One participant runs the North plant. The South plant is a program, and participants are told so. It's a static page with no server. The 2-player Empirica game above is unchanged for now; the pieces below are laid out so it can reuse them.

**Where things live:**

| Path | What | Used by |
|---|---|---|
| `shared/rules.js` | All game rules as pure functions: load an arm, draw the market and situations, forward messages, the programmed partner, points | both versions (and the Empirica server) |
| `shared/arms/` | The supplied CSVs, plus `SPEC.md`, the spec they came with | both |
| `client/game/` | The screens (`screens.jsx`: Send, Read & ship, Results), instructions, quiz, help modals, and the CSV loader | both |
| `client/game/context.js` | `GameContext`: which plant the player runs, whether the partner is a program or a person, and the session shape (round counts, pay rate). Every label ("South's shipment", "Run the North plant") comes from here. | both |
| `client/study1/` | The 1-player app: session flow, programmed partner, Qualtrics hand-off (`main.jsx`), and the researcher page | 1-player only |

Round data is stored from the player's point of view (`situation`, `sent`, `toPartner`, `partnerSent`, `fromPartner`, `partnerShip`), so the same screens work for either plant.

**Arms.** Each participant plays one row of `arms.csv`, chosen with `?arm=<arm_id>` (e.g. `B019_selective_R1`), or at random if the parameter is missing or unknown. There are 96 arms: 24 parameter blocks × forwarding (`unchanged` / `selective`) × AI suggestion (`R0` / `R1`).

**A round** (market and both situations drawn fresh each round):

1. **Send.** North sees the situations table, its own situation and targets, and (R1 only) an AI suggestion from `message_rules.csv`. It sends any of the four descriptions.
2. **Read & ship.** South's message is `message_rules[arm, South's situation]`. Both messages go through `forwarding_rules.csv`, which depends on the market. South ships `opponent_shipments[arm, South's situation, message delivered to South]`. North sees what was delivered from South and picks a shipment and a guess of South's shipment. The chart shows expected points at the configured p.
3. **Results.** The market, both shipments, a points breakdown, and the messages sent and delivered in both directions.

**Points:** `B − c[(1−γ)(A − D)² + γ(A − A_South)²]`, with D from North's true situation and the realized market. Both B and c come from the arm. Shown to 2 decimals.

**Session:** 2 instruction pages, 2 practice rounds, a 5-question quiz built from the arm (two tries; failing twice ends the study), then 8 paid rounds with an attention check after round 4. One paid round is picked at random for the bonus. `SESSION` and `ATTENTION_AFTER` at the top of `client/study1/main.jsx` set these. The pay rate is a placeholder: at c = 0.0008, almost every round scores 95–100.

**Researcher page:** `study1.html?researcher=1` lists every arm read-only (parameters, targets, reporting rule, forwarding table, South's shipments) and links to a player preview. Parameters can't be edited, because South's shipments are precomputed for each arm.

**Data:** each round records the market, both situations, the suggestion, what North sent and whether it followed the suggestion or was truthful, both delivered messages, South's message and shipment (stored as `partner…` fields), North's shipment and guess, points, timings and help-modal opens.

**Qualtrics:** the embedded `arm` field must now hold an `arm_id` (the old A/B/C values fall back to a random arm). Results come back as before: `postMessage` to the parent, or the `cf_total` / `cf_data` parameters on `?return=`.

```sh
node --test shared/    # rules checked against the SPEC.md worked example
cd client
npm run dev:study1     # http://localhost:8855/study1.html?arm=B019_selective_R1
npm run build:study1   # static files in client/dist-study1/; drag that folder onto Netlify
```
