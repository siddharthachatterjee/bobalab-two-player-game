# Crate Factory: BOBALAB shipping game

Two plants, North and South, each choose how many more or fewer crates to ship than normal. Each has a private situation with a target for a low and a high market; only the AI mediator knows the market. Each plant sends one of four descriptions through the mediator, which passes it on unchanged or changes it by a fixed, published rule, then both ship. Points reward shipping near your own target and near the other plant. The full spec is `shared/arms/SPEC.md`.

There are two versions, built from the same code:

- **2-player** (Empirica): two participants play each other. Below.
- **1-player** (static page for Qualtrics): one participant against a programmed South plant. See *Study 1* further down.

## Where things live

| Path | What | Used by |
|---|---|---|
| `shared/rules.js` | All game rules as pure functions: load an arm, draw the market and situations, forward messages, the programmed partner, points | both |
| `shared/pair.js` | One 2-player round from the server's side: the draw, both messages, both shipments, timeout fallbacks, `PAIR_SESSION` (round count, timers) | 2-player server |
| `shared/secure.js` | Sealing values so only one browser (or only the server) can read them | 2-player |
| `shared/record.js` | One round as a data row, the same in both versions | both |
| `shared/arms/` | The supplied CSVs, `SPEC.md`, and `tables.js` (generated) | both |
| `client/game/` | The screens (Send, Read & ship, Results), instructions, quiz, onboarding (instructions → solo practice → quiz), solo round runner | both |
| `client/game/context.js` | `GameContext`: which plant the player runs, whether the partner is a program or a person, session shape. Every "North"/"South" label comes from here. | both |
| `client/src/` | The Empirica app: `pair/PairIntro` (onboarding), `pair/PairRound` (paid rounds), `pair/Bonus` (exit) | 2-player |
| `server/src/` | Empirica callbacks (`callbacks.js`) and the server's keys (`vault.js`) | 2-player |
| `client/study1/` | The 1-player app and the researcher page | 1-player |

Round data is stored from the player's point of view (`situation`, `sent`, `toPartner`, `partnerSent`, `fromPartner`, `partnerShip`), so the same screens work for either plant.

**Changing the arms.** Replace the CSVs in `shared/arms/`, then run `node scripts/build-arms.mjs`. It regenerates `shared/arms/tables.js` and `.empirica/treatments.yaml` (one treatment per arm). `node --test shared/` fails if you forget.

## 2-player game (Empirica)

1. **Intro (alone):** consent, then the shared onboarding: two instruction pages (roles are random, so they show the North plant), 2 practice rounds against the programmed South, and the 5-question quiz (two tries; failing ends the study).
2. **Lobby:** players are paired. The game's treatment picks the arm; roles are assigned at random.
3. **8 paid rounds**, each with three timed stages: **Send** (2 min), **Read & ship** (3 min), **Results** (1 min). The server draws the market and both situations, forwards both messages once both have sent, and scores once both have shipped.
4. **Exit:** one paid round is picked at random for the bonus; a "Back to the survey" button appears if the participant arrived with `?return=<url>` (it appends `cf_player` and `cf_total`). Then the exit survey.

**Timeouts and drop-outs.** A stage that times out without a choice is filled in by the programmed policy (the arm's message rule; the shipment lookup), flagged `sentAuto`/`shipAuto` in the data. After 2 missed stages in a row the player is marked `dropped` and the program plays for them for the rest of the game, so their partner can finish.

**Privacy.** Empirica 1.12 sends every attribute in a game to every player in it, even with `{ private: true }`, so a player could read the other's situation or the market in devtools. Values that must stay hidden until results are sealed (`shared/secure.js`): each browser makes a key pair (private half in localStorage), the server keeps its own in `.empirica/local/crate-factory-server-key.json`, and situations, delivered messages and the market are encrypted to one player or to the server only. Choices are sealed to the server. Once a round is scored nothing in it is secret, so its `result`, `record` and `outcome` are stored in plain text for export.

**Data** (`empirica export`): per player and round, `record` holds the same row as the 1-player data (`shared/record.js`); per round, `outcome` holds the market and both situations; per player, `onboarding` (practice rounds and quiz), `bonus`, `dropped`.

```sh
curl -fsS https://install.empirica.dev | sh   # once
empirica                                       # from the repo root
```

1. Admin: <http://localhost:3000/admin> (login in `.empirica/empirica.toml`). Create a batch with a treatment (an arm) and start it.
2. Players: open <http://localhost:3000/?participantKey=a> and `?participantKey=b` in two tabs.

**Before real data:** host the Empirica server somewhere participants can reach; set the lobby duration (default 5 minutes after the first player is ready) to suit how fast people arrive; and decide the pay rate (`PAIR_SESSION.dollarsPerPoint`).

## Study 1: shipping game against a programmed South plant (for Qualtrics)

One participant runs the North plant. The South plant is a program, and participants are told so. It's a static page with no server, sharing the rules and screens above.

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
