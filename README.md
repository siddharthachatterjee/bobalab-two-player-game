# Crate Factory: BOBALAB shipping game

Two plants, North and South, each choose how many more or fewer crates to ship than normal. Each has a private situation with a target for a low and a high market; only the AI mediator knows the market. Each plant sends one of four descriptions through the mediator, which passes it on unchanged or changes it by a fixed, published rule, then both ship. Each round has a shipping cost that grows with the distance from your own target and from the other plant; lower is better. The full spec is `shared/arms/SPEC.md`.

**Cost, not points.** Players see `cost = [(1−γ)(A − D)² + γ(A − A_partner)²] / 100` (`COST_SCALE` in `shared/rules.js`). That is the spec's loss, scaled so a 10-crate gap costs about 1. The spec's points are `B − c·100·cost`, so both rank choices the same way; the data records both. **Bonus:** one paid round is picked at random and pays `$2 − 2¢ × cost`, never below $0 (`pay` in `PAIR_SESSION` and in Study 1's `SESSION`). These rates are placeholders.

**Arms in use.** `shared/arms/active.js` lists the parameter blocks in use, currently **B019 and B185 (8 arms)** for the pilot. B111 and B284 are planned next. To change it, edit the list and run `node scripts/build-arms.mjs`.

There are two versions, built from the same code:

- **2-player** (Empirica): two participants play each other. Below.
- **1-player** (static page for Qualtrics): one participant against a programmed South plant. See *Study 1* further down.

## Where things live

| Path | What | Used by |
|---|---|---|
| `shared/rules.js` | All game rules as pure functions: load an arm, draw the market and situations, forward messages, the programmed partner, points | both |
| `shared/pair.js` | One 2-player round from the server's side: the draw, both messages, both shipments, timeout fallbacks, `PAIR_SESSION` (round count, timers) | 2-player server |
| `shared/record.js` | One round as a data row, the same in both versions | both |
| `shared/arms/` | The supplied CSVs, `SPEC.md`, `tables.js` (generated), and `active.js` (blocks in use) | both |
| `client/game/` | The screens (Send, Read & ship, Results), instructions, quiz, onboarding (instructions → solo practice → quiz), solo round runner | both |
| `client/game/context.js` | `GameContext`: which plant the player runs, whether the partner is a program or a person, session shape. Every "North"/"South" label comes from here. | both |
| `client/src/` | The Empirica app: `pair/PairIntro` (onboarding), `pair/PairRound` (paid rounds), `pair/Bonus` (exit) | 2-player |
| `server/src/callbacks.js` | Empirica callbacks: moves values between attributes and `shared/pair.js` | 2-player |
| `client/study1/` | The 1-player app and the researcher page | 1-player |

Round data is stored from the player's point of view (`situation`, `sent`, `toPartner`, `partnerSent`, `fromPartner`, `partnerShip`), so the same screens work for either plant.

**Changing the arms.** Replace the CSVs in `shared/arms/`, then run `node scripts/build-arms.mjs`. It regenerates `shared/arms/tables.js` and `.empirica/treatments.yaml` (one treatment per arm in the active blocks). `node --test shared/` fails if you forget.

## 2-player game (Empirica)

1. **Intro (alone):** consent, then the shared onboarding: two instruction pages (roles are random, so they show the North plant), 2 practice rounds against the programmed South, and the 5-question quiz (two tries; failing ends the study).
2. **Lobby:** players are paired. The game's treatment picks the arm; roles are assigned at random.
3. **8 paid rounds**, each with three timed stages: **Send** (2 min), **Read & ship** (3 min), **Results** (1 min). The server draws the market and both situations, forwards both messages once both have sent, and scores once both have shipped.
4. **Exit:** one paid round is picked at random for the bonus; a "Back to the survey" button appears if the participant arrived with `?return=<url>` (it appends `cf_player` and `cf_total`, the bonus in dollars). Then the exit survey.

**Timeouts and drop-outs.** A stage that times out without a choice is filled in by the programmed policy (the arm's message rule; the shipment lookup), flagged `sentAuto`/`shipAuto` in the data. After 2 missed stages in a row the player is marked `dropped` and the program plays for them for the rest of the game, so their partner can finish.

**Privacy caveat.** Empirica 1.12 sends every attribute in a game to every player in it, even ones marked `{ private: true }`. Nothing secret is shown on screen, but a participant who opens the browser's devtools mid-round could read the partner's situation and message and the market. With a few cents at stake this is unlikely to matter; if a guarantee is needed, the in-round values can be encrypted per player (an earlier commit on the `two-player-arms` branch did this).

**Data** (`empirica export`): per player and round, `record` holds the same row as the 1-player data (`shared/record.js`); per round, `draw` holds the market and both situations; per player, `onboarding` (practice rounds and quiz), `bonus`, `dropped`.

```sh
curl -fsS https://install.empirica.dev | sh   # once
empirica                                       # from the repo root
```

1. Admin: <http://localhost:3000/admin> (login in `.empirica/empirica.toml`). Create a batch with a treatment (an arm) and start it.
2. Players: open <http://localhost:3000/?participantKey=a> and `?participantKey=b` in two tabs.

**Before real data:** host the Empirica server somewhere participants can reach; set the lobby duration (default 5 minutes after the first player is ready) to suit how fast people arrive; and decide the pay rate (`PAIR_SESSION.pay`).

## Study 1: shipping game against a programmed South plant (for Qualtrics)

One participant runs the North plant. The South plant is a program, and participants are told so. It's a static page with no server, sharing the rules and screens above.

**Arms.** Each participant plays one row of `arms.csv`, chosen with `?arm=<arm_id>` (e.g. `B019_selective_R1`). If the parameter is missing or unknown, an arm is picked at random from the active blocks. The CSVs hold 96 arms: 24 parameter blocks × forwarding (`unchanged` / `selective`) × AI suggestion (`R0` / `R1`). Only the 8 arms in B019 and B185 are in use.

**A round** (market and both situations drawn fresh each round):

1. **Send.** North sees the situations table, its own situation and targets, and (R1 only) an AI suggestion from `message_rules.csv`. It sends any of the four descriptions.
2. **Read & ship.** South's message is `message_rules[arm, South's situation]`. Both messages go through `forwarding_rules.csv`, which depends on the market. South ships `opponent_shipments[arm, South's situation, message delivered to South]`. North sees what was delivered from South and picks a shipment and a guess of South's shipment. The chart shows expected cost at the configured p.
3. **Results.** The market, both shipments, a cost breakdown, and the messages sent and delivered in both directions.

**Cost:** `[(1−γ)(A − D)² + γ(A − A_South)²] / 100`, with D taken from North's true situation and the realized market. Shown to 2 decimals.

**Session:** 2 instruction pages, 2 practice rounds, a 5-question quiz built from the arm (two tries; failing twice ends the study), then 8 paid rounds with an attention check after round 4. One paid round is picked at random for the bonus. `SESSION` and `ATTENTION_AFTER` at the top of `client/study1/main.jsx` set these.

**Researcher page:** `study1.html?researcher=1` lists every arm read-only (parameters, targets, reporting rule, forwarding table, South's shipments) and links to a player preview. Parameters can't be edited, because South's shipments are precomputed for each arm.

**Data:** each round records the market, both situations, the suggestion, what North sent and whether it followed the suggestion or was truthful, both delivered messages, South's message and shipment (stored as `partner…` fields), North's shipment and guess, cost (and the spec's points), timings and help-modal opens.

**Qualtrics:** the embedded `arm` field must now hold an `arm_id` (the old A/B/C values fall back to a random arm). Results come back through `postMessage` to the parent, or through the `cf_total` (bonus in dollars) and `cf_data` parameters on `?return=`. For the pilot, randomize `arm` over these 8 values: `B019_unchanged_R0`, `B019_unchanged_R1`, `B019_selective_R0`, `B019_selective_R1`, `B185_unchanged_R0`, `B185_unchanged_R1`, `B185_selective_R0`, `B185_selective_R1`.

```sh
node --test shared/    # rules checked against the SPEC.md worked example
cd client
npm run dev:study1     # http://localhost:8855/study1.html?arm=B019_selective_R1
npm run build:study1   # static files in client/dist-study1/; drag that folder onto Netlify
```
