# BOBALAB 2-Player Coordination Game: Design Doc (v0.2)

**Purpose:** a spec for a prototype Empirica (v2) web game that tests the model in Sinchaisri & Wang, *"Coordinating Decisions with Algorithmic Advice"* (working paper). Written to be handed directly to Codex / Claude Code.

**One-line summary:** two humans run two departments of one company; an AI advisor gives either **direct action advice** or **process-oriented advice**; we measure how that changes information sharing, actions, individual scores, and company profit.

---

## 0. Instructions for the coding agent

**Build order:** follow the milestones in section 14. Do not start M2 until M1's tests pass.

**Hard rules**

1. **`shared/rules.js` is the single source of truth for all math.** Pure functions, no I/O, no randomness (take random draws as arguments). Server and client both import it.
2. **Never send hidden state to a client.** The aggregate state $\theta$, unrevealed local conditions $X$, and the other player's private type $T$ and share choice must not be readable from any other client's browser (see 10.4 and the leak test in 14).
3. **Do not silently change formulas or defaults.** If something in this doc seems wrong, add a note under `## Open issues` at the bottom of this file and keep going with the documented behavior.
4. **No live LLM calls in M1 to M5.** The AI advisor is a deterministic rule-based module (section 9). The LLM component is a stub behind an interface.
5. **Log everything** in the schema of section 12. Analysis depends on it.
6. Keep every tunable number in `shared/constants.js`. No magic numbers elsewhere.

**Verify before relying on:** Empirica API details below come from the v2 docs (callbacks in `server/src/callbacks.js`, hooks, `player.stage.set("submit", true)`). Exact callback names may differ slightly by template version (the docs say `onStageEnd`; some templates use `onStageEnded`). Check the generated project template first and match it.

---

## 1. Research goal and hypotheses

Compare two ways an AI can advise interdependent decision-makers:

| Advice type | What it tells the player | Paper term |
|---|---|---|
| **Action advice** | *What to do* (a numeric action) | pure action advice ($g=0$, designs $h$) |
| **Process advice** | *Whether to prepare/share information* before acting | collaboration advice (designs $g$, actions stay Nash) |

**Central tradeoff (paper):** action advice can *substitute for* human information acquisition (crowding out sharing); process advice can *preserve or redirect* that effort when local information still has value.

**Testable predictions (log enough data to check each):**

- **H1:** Under action advice, sharing rates fall relative to control.
- **H2:** Under process advice, sharing rises for the types the advisor targets, and company profit rises when sharing is firm-valuable.
- **H3:** Action advice raises company profit when players follow it (it pulls biased players toward the firm's target) but lowers *player* score for the biased type (the "regret" of obeying).
- **H4:** Sharing incentives differ by private type: the **high type** (growth-biased) gains from sharing at moderate/high market outlook; the **low type** (conservative) often loses from sharing (private $G<0$).
- **H5 (secondary):** Obedience (distance between chosen and recommended action) decreases with AI inaccuracy and increases with advice clarity.

---

## 2. Model-to-game mapping

| Paper symbol | Meaning | In the game |
|---|---|---|
| Worker $i\in\{1,2\}$ | two workers | Player roles: **Production** (1), **Marketing** (2), randomly assigned |
| $T_i\in\{-1,+1\}$, p=½ | persistent private bias type | **Incentive profile** told only to that player: **Growth-oriented** ($+1$) or **Conservative** ($-1$). Fixed for the whole game |
| $X_{it}\in\{-1,+1\}$, p=½ | local condition, drawn each round after the share decision | **Department signal**: Production = line condition (+ spare capacity / − bottleneck). Marketing = audience window (+ cheap, high-intent / − saturated, costly). Sign flips the right direction of action |
| $\theta_t\sim U[0,1]$ | aggregate state, seen only by AI | **Market strength** (hidden). Players see only a coarse AI "outlook" |
| $a_{it}\in\mathbb{R}$ | operating action | One numeric slider per player per round (**adjustment index** in $[-2,2]$, displayed in business units) |
| $e_{it}\in\{0,1\}$, cost $c_W$ | preparation to share, chosen *before* $X$ is realized | **Cooperate** (prepare a briefing, small point cost) vs **Individual** |
| $\rho$ | independent verification prob. | Free **company-wide report** that surfaces a department's condition automatically |
| $\nu$ | prepared-share success prob. | Chance a prepared briefing actually lands |
| $Z_{it}$ | released record | "Report received": reveals $X_i$ to the partner and AI |
| pooling / separating | whether record source is labeled | Config flag `recordLabels` |
| $Y_{it}=a_{it}+\zeta$ | noisy action signal seen by coworker + AI | Partner's action shown **with noise** in results stage |
| $\gamma$ | coordination weight | How much mismatch between departments is penalized |
| $\beta$ | private bias magnitude | Strength of each department's incentive distortion |
| $c_F$ | firm cost of diverting time to prep | Charged in company profit |

**Key sharing logic (important, differs from the first draft):** a player **always knows their own $X$**. Cooperating does *not* give the player more information; it raises the chance that the **partner (and AI)** learn $X$. Even Individual players get revealed with probability $\rho$ for free. Cooperating succeeds with prob. $\nu$ when verification fails. Cost is paid even when sharing fails.

---

## 3. Formal model (reference)

**Parameters (defaults in section 13).** $h,\beta>0$, $0<\gamma<1$, $\rho,\nu\in(0,1)$, $c_W>0$, $c_F\ge 0$, $\sigma_Y>0$.

**Targets.**
$$H_{it}=\theta_t h X_{it},\qquad D_{it}=(\theta_t h+\beta T_i)X_{it}$$

$H$ is what the firm wants from worker $i$. $D$ is what worker $i$ privately wants.

**Worker loss and firm loss (per period).**
$$\ell_{it}=(1-\gamma)(a_{it}-D_{it})^2+\gamma(a_{it}-a_{jt})^2+c_W e_{it}$$
$$L_{Ot}=\frac{1-\gamma}{2}\sum_{i=1}^{2}(a_{it}-H_{it})^2+\gamma(a_{1t}-a_{2t})^2+\frac{c_F}{2}(e_{1t}+e_{2t})$$

**Record probability.** $\Pr(Z_i\neq\varnothing\mid e_i)=\rho+s\,e_i$, with $s=(1-\rho)\nu$.

**Posterior moments** from the AI's outlook message $m$: $\mu=E[\theta\mid m]$, $\eta=E[\theta^2\mid m]$, $\mathrm{Var}(\theta\mid m)=\eta-\mu^2$.

**Nash operating action (Lemma 2), with beliefs fixed at $q=\tfrac12$.** Define $\hat D_i=r_i\,\mu h\,X_i$ (record about $i$ released, $r_i=1$; otherwise $0$). Then
$$a_i^{N}=(1-\gamma)(\mu h+\beta T_i)X_i+\frac{\gamma^2\hat D_i+\gamma\hat D_j}{1+\gamma}$$

> Derivation check: public predictions satisfy $A_i=(1-\gamma)\hat D_i+\gamma A_j$, giving $A_j=(\hat D_j+\gamma\hat D_i)/(1+\gamma)$, and the best response is $a_i=(1-\gamma)d_{T_i}X_i+\gamma A_j$. The printed Eq. 28 in the PDF is garbled by text extraction; this form matches the paper's proof.

**One-parameter action advice (Eq. 41).** With $\lambda\in[0,1]$:
$$\hat a_i^{\lambda}=(1-\gamma)(\mu h+\lambda\beta T_i)X_i+\frac{\gamma^2\hat D_i+\gamma\hat D_j}{1+\gamma}$$
$\lambda=1$ is Nash. $\lambda<1$ drops part of the private-bias term (pulls the player toward the firm's target).

**Obedience regret (Prop. 3).** Following $\hat a^\lambda$ costs the worker $R^a=(1-\gamma)^2\beta^2(1-\lambda)^2$. A player "plausibly obeys" if $R^a\le\epsilon_a$:
$$\lambda\ \ge\ \lambda_{\min}=\max\Big\{0,\ 1-\frac{\sqrt{\epsilon_a}}{(1-\gamma)\beta}\Big\}$$
The advisor uses $\lambda^*=\lambda_{\min}$ (most firm-favorable obedient rule).

**Private value of sharing (Prop. 1, one period, $q=\tfrac12$ so $d(\mu,q^+)=\mu h$).** With $\kappa=\gamma/(1+\gamma)$:
$$G_i(T,\mu)=s\gamma(1-\gamma)\Big\{2\kappa\,(\mu h+\beta T)\,(\mu h)-\kappa^2(\mu h)^2\Big\}$$
Worker $i$ prefers to prepare iff $G_i-c_W>0$. Note $G$ can be negative for the low type (they dislike being predictable). Future-learning term $\delta\mathcal{L}$ is **ignored** in the MVP ($\delta=0$, myopic advisor).

**Process-advice obedience.** Following a recommendation $e=1$ has regret $\max\{0,\ c_W-G_i\}$. Recommendation $e=0$ has regret $\max\{0,\ G_i-c_W\}$. Obedient iff regret $\le\epsilon_e$.

---

## 4. Treatments and experimental design

**Advice arms** (`adviceMode`):

| Arm | AI message contains | Player UI shows |
|---|---|---|
| `none` (control) | outlook bin only | outlook only |
| `action` | outlook bin + action rule ($\lambda^*$) for each role | "AI suggests: **+0.62**" computed from the player's own $T$, $X$, public records |
| `process` | outlook bin + recommended prep plan $(g_1,g_2)$ | "AI suggests: **share / no need to share**" per role; actions are unadvised |
| `joint` (stretch) | both | both |
| `mixed` | per-round random draw among `action`, `process` | whichever was drawn; log it |

**Design decisions to confirm with the PI:**

- The first draft randomizes advice type per decision (`mixed`). That is supported, but it contaminates learning effects across arms. **Default recommendation: `adviceMode` is fixed per game (between-subjects)**, with `mixed` kept as an option and every round tagged with its arm in the logs. Implement as a treatment factor, not hard-coded.
- **Equalize outlook info across arms.** Both advice types implicitly leak information about $\theta$. Show the same coarse outlook bin in all arms (including control) so differences isolate *advice type*. Config: `thetaSignal: "bins3" | "none" | "exact"`, default `bins3`.
- Optional lever (paper: incentive alignment): `orgWeight` $\omega\in[0,1]$ blends firm loss into player payoff. Default $0$ (paper-faithful).
- Optional lever: `recordLabels: "pooled" | "separating"`. Default `pooled`.
- Optional lever: AI accuracy. `aiNoise` adds noise to the outlook bin shown (default 0; paper says advice quality matters).

---

## 5. Business framing and scenarios (static variables)

Each game randomly loads **one scenario** from `shared/scenarios.json`. A scenario provides narrative, units, and display scales. **It must not change the payoff math** except through the bounded overrides in the schema below.

**Hard constraint:** the incentive structure is the quadratic loss in section 3. Variables like unit cost, CAC, hiring cost are **flavor and display** unless mapped into $h,\beta,\gamma,c_W,c_F,\rho,\nu$.

```jsonc
{
  "id": "novabrew",
  "company": "NovaBrew (cold-brew beverages)",
  "blurb": "Two-sentence company description shown at briefing.",
  "roles": {
    "production": {
      "title": "Head of Production",
      "decisionVerbs": ["Set this week's production run", "Plan overtime", "Order raw materials"],
      "unit": "units",           "baseline": 1000,  "unitsPerIndex": 500,
      "signal": { "plus": "Line running smoothly, spare capacity", "minus": "Bottleneck on the filling line" },
      "typeText": { "+1": "Your bonus rewards output volume (growth-oriented).",
                    "-1": "Your bonus rewards low waste and low overtime (conservative)." },
      "privateInfoCards": ["Unit cost $2.10", "Overtime premium +35%", "Line capacity 1,400/wk"]
    },
    "marketing": {
      "title": "Head of Marketing",
      "decisionVerbs": ["Set this week's ad spend", "Plan a promo", "Choose campaign reach"],
      "unit": "$ ad spend",      "baseline": 20000, "unitsPerIndex": 10000,
      "signal": { "plus": "Cheap, high-intent audience window", "minus": "Audience saturated, CAC rising" },
      "typeText": { "+1": "Your bonus rewards customer growth (growth-oriented).",
                    "-1": "Your bonus rewards CAC efficiency (conservative)." },
      "privateInfoCards": ["CAC $38", "Conversion 2.4%", "Ad budget cap $40k"]
    }
  },
  "flavor": { "price": 6.5, "hiringCost": 4200, "storageCost": 0.15 },
  "paramOverrides": {},          // optional; each key must lie within PARAM_BOUNDS in constants.js
  "profitDisplay": { "baseProfit": 120000, "dollarsPerLossUnit": 60000 }
}
```

**Ship 3 scenarios** (e.g. beverage company, hardware startup, meal-kit service) with the same schema. The numeric mapping is always: displayed business value $=\text{baseline}+a\times\text{unitsPerIndex}$.

**Decision labels rotate** (`decisionVerbs`) for realism, but every round maps to the same single-number action $a_i\in[-2,2]$ (slider step 0.05, default 0 = baseline).

**Company profit display:** $\text{Profit}_t=\text{baseProfit}-\text{dollarsPerLossUnit}\times L_{Ot}$. Cumulative profit and history are shown in the sidebar.

---

## 6. Game flow

### 6.1 Setup (Empirica intro steps, asynchronous)

1. Consent (optional, configurable).
2. Role-agnostic instructions: company, rules, scoring, what AI is, what sharing does, $\rho$ and $\nu$ stated in plain percentages ("about 20%", "about 80%").
3. **Comprehension quiz** (4-6 questions; must pass to proceed; log attempts). Required for experimental validity.
4. Lobby (2 players). Assigned role (random) and private type $T$ (random, independent), both shown on a **Role Card** that stays visible.

### 6.2 Per decision (= one Empirica round, 5 stages)

| # | Stage | Duration | What happens |
|---|---|---|---|
| 1 | `advice` | 12 s (or both submit) | Server draws $\theta$, computes outlook bin, runs advisor, publishes the public message $m$. Both players see it. |
| 2 | `prepare` | 20 s | Each player chooses **Cooperate** (pay $c_W$) or **Individual**. Choice is private. Default on timeout: Individual. |
| 3 | `reveal` | 10 s | Server draws $X_1,X_2$ and the $\rho$/$\nu$ outcomes. Each player sees their own $X$ (always) and any **released record** about the partner. Everyone sees whether a record about *themself* was released. If `recordLabels=separating`, record source is shown. |
| 4 | `act` | 40 s | Each player picks $a_i$ via slider. In `action` arm, the recommended value appears. Default on timeout: 0, flagged. |
| 5 | `result` | 15 s | Reveal true $\theta$, targets $H_i$, $D_i$, both actions (partner's shown as noisy $Y$), losses, points, company profit, history update. |

**Randomness timing matters:** $X$ is drawn **after** the prepare stage closes. Draw all randomness server-side (section 10.4).

### 6.3 Information table (who sees what)

| Item | AI | Player i | Partner j |
|---|---|---|---|
| $\theta_t$ | yes | no (outlook bin only) until `result` | same |
| $T_i$ | no | yes | no |
| $e_i$ (share choice) | no | yes | no (unless `separating` and record released) |
| $X_i$ | only if record released | yes (after `reveal`) | only if record released |
| released record $Z_i$ | yes | yes | yes |
| $a_i$ | noisy $Y_i$ | exact | noisy $Y_i$ |

Message $m$ is public to both. In the `action` arm the full rule for both roles is stored in the public message data, but the UI renders only the viewer's own rule (documented simplification).

---

## 7. Scoring and metrics

**Per-round player points** (always shown as integers on screen):
$$\text{points}_{it}=\text{BASE}-K\big[(1-\omega)\,\ell_{it}+\omega\,L_{Ot}\big]$$

Defaults: BASE=100, K=100, $\omega=0$. No clipping (points can go negative; the UI shows the true value).

This fixes a sign error in the first draft: score must **fall** as the deviation between the player's action and their optimum grows (squared loss), not rise. The "fixed cost for sharing" is $c_W$, shown as $K c_W$ points (3 points at defaults).

**Metrics tracked and displayed**

- Player 1 and 2 cumulative score (own always visible; partner's shown at round end).
- Company profit per round and cumulative.
- History table/chart: round, scenario decision label, outlook, true $\theta$, $X_1,X_2$, shares, records, actions, points, profit, advice arm, advice followed?
- Researcher-only derived: share rate by type and arm, obedience distance, welfare gap vs Nash benchmark.

**Optional payment:** `pointsToUSD` config; out of scope for the prototype.

---

## 8. Decision support UI choices (configurable)

- `showOwnTarget` (default **true**): show the player's own ideal level given the outlook, $(\mu h+\beta T)X$, in business units. Keeps the experiment about coordination and advice, not arithmetic.
- `showPayoffPreview` (default **false**): live points preview as the slider moves. Off by default because it would reveal best responses.
- Always show a plain-language reminder: "Moving far from your partner costs points. The market may be stronger or weaker than the outlook."

---

## 9. AI advisor module

### 9.1 Interface

```js
// client/src/ai/RecommendationProvider.js
// ctx = { params, round, mu, varTheta, outlookBin, mode, beliefs? }
// returns { outlookBin, mu, varTheta,
//           plans: { production: {prep: 0|1|null, lambda: number|null},
//                    marketing:  {prep: 0|1|null, lambda: number|null} },
//           text: { production: string, marketing: string } }
export interface RecommendationProvider { getMessage(ctx): Promise<Message> }
```

Two implementations:

1. **`RuleBasedAdvisor` (default, M3):** deterministic, uses `shared/rules.js` (9.2). Produces all numbers and the default English text.
2. **`LLMAdvisor` (placeholder stub, M6+):** leave as a stub that throws `NotImplemented`, or falls back to the rule-based message. Rule: **numbers always come from `RuleBasedAdvisor`; an LLM may only rephrase the rationale text.** This preserves experimental control.

Token-efficient prompt for the future LLM stub (brevity preference):

```
System: Rephrase advice in <=40 words, plain tone. Never change numbers or the recommendation.
User: {"role":"production","advice":"set +0.62","outlook":"strong","type":"action"}
```

### 9.2 Rule-based advisor logic

**Outlook:** with `bins3`, $\theta$ falls in $[0,\tfrac13),[\tfrac13,\tfrac23),[\tfrac23,1]$; $\mu=\{\tfrac16,\tfrac12,\tfrac56\}$, $\mathrm{Var}=\tfrac1{108}$ per bin (general: $\mu=\frac{2k+1}{2K}$, $\mathrm{Var}=\frac{1}{12K^2}$).

**`action` arm:** $\lambda^*=\lambda_{\min}(\epsilon_a)$ from section 3. The message stores $\lambda^*$. The player-facing number is computed at `act` stage start by `actionRule(...)` with the player's own $T$, $X$ and the public records. Computed **server-side**, stored as a private attribute, so $T$ never leaves the server.

**`process` arm:** enumerate the 9 candidate plans $(g_1,g_2)\in\{(0,0),(0,1),(1,1)\}^2$ (monotone in type, per Eq. 40). For each:

1. Drop it if any (role, type) violates the obedience constraint (regret $\le\epsilon_e$, section 3).
2. Compute expected firm loss $\bar L_O$ by enumeration (9.3), averaging over $T_1,T_2$ uniform.
3. Choose the plan with minimum $\bar L_O$ (ties: fewer preps).

Actions in this arm are not advised (players choose freely; benchmark is Nash).

**`none`:** outlook only.

### 9.3 Expected-loss enumeration (for advisor, sweep script, tests)

Given $(T_1,T_2)$, $(e_1,e_2)$, $\mu$, $\mathrm{Var}(\theta)$, $q=\tfrac12$: enumerate $X\in\{\pm1\}^2$ (prob ¼ each) and $r\in\{0,1\}^2$ with $\Pr(r_i=1)=\rho+s e_i$. Compute $a_i^N$ (or $\hat a^\lambda$). Then
$$E[(a_i-D_i)^2]=(a_i-(\mu h+\beta T_i)X_i)^2+h^2\mathrm{Var}(\theta),\qquad E[(a_i-H_i)^2]=(a_i-\mu h X_i)^2+h^2\mathrm{Var}(\theta)$$
and the coordination term is $(a_1-a_2)^2$.

---

## 10. Architecture

### 10.1 Layout

```
bobalab-game/
  .empirica/
    treatments.yaml        # factors: adviceMode, nRounds, recordLabels, orgWeight, thetaSignal, aiNoise
    lobbies.yaml           # 2 players, timeout config
  shared/
    constants.js           # PARAMS, PARAM_BOUNDS, STAGES, SCORING, DEFAULT_TREATMENT
    rules.js               # pure math (section 11)
    scenarios.json
    advisor.js             # RuleBasedAdvisor (pure; imports rules.js)
    prng.js                # seeded PRNG + hash-based per-round streams
  server/src/
    callbacks.js           # Empirica.onGameStart/onRoundStart/onStageStart/onStageEnd/onRoundEnd/onGameEnd
    state.js               # per-round hidden-state derivation
  client/src/
    App.jsx                # loading, role card, intro steps wiring
    Game.jsx               # switch on stage name; sidebar
    stages/Advice.jsx  Prepare.jsx  Reveal.jsx  Act.jsx  Result.jsx
    components/RoleCard.jsx  AdviceCard.jsx  Sidebar.jsx  HistoryTable.jsx  ProfitChart.jsx  ActionSlider.jsx
    ai/RecommendationProvider.js   # interface + RuleBased wrapper + LLM stub
    intro/Consent.jsx  Instructions.jsx  Quiz.jsx
  scripts/
    sweep.js               # parameter explorer (see section 13)
    simulate.js            # Nash-agent Monte Carlo benchmark per arm
  test/
    rules.test.js  advisor.test.js
```

**Shared folder caveat:** Empirica's template has separate `client/` and `server/` packages. Import `shared/` by relative path and make sure the bundlers can see it (Vite `server.fs.allow: [".."]`; server bundles via esbuild, so relative imports normally work). If this causes friction, switch to npm workspaces. Use ESM syntax only.

### 10.2 Empirica data model

| Scope | Key | Value | Visibility |
|---|---|---|---|
| game | `treatment` | resolved treatment (factors) | all |
| game | `params` | frozen PARAMS for this game | all |
| game | `scenarioId` | scenario id | all |
| player | `role` | `"production"` or `"marketing"` | all |
| player | `T` | $\pm1$ | **private** |
| player | `score` | cumulative points | all (partner's shown at round end only; hide in UI) |
| round | `armThisRound` | `none`/`action`/`process` | all |
| round | `message` | public message $m$ | all |
| round | `records` | `{production:{released,X?,source?}, marketing:{...}}`, set at `reveal` | all |
| round | `result` | θ, X's, actions, losses, profit (set at `result`) | all, only after stage 5 begins |
| player.round | `share` | 0/1 | **private** |
| player.round | `X` | $\pm1$ | **private** |
| player.round | `recAction` | recommended number (action arm) | **private** |
| player.round | `action` | slider value | **private** until `result` |
| player.round | `timedOut` | flags | private |

Empirica attributes support options such as `private`, `protected`, `immutable`, `ephemeral`. **Verify the exact option names in the installed `@empirica/core` typings**, then run the leak test (14).

### 10.3 Server callbacks (behavior)

- **`onGameStart`:** read treatment; pick scenario; assign roles and types (seeded); set `params`; `game.addRound({name})` per decision, each with the 5 stages above using durations from constants. Set `armThisRound` per round (fixed arm, or seeded draw for `mixed`).
- **`onRoundStart`:** derive hidden state (10.4); compute $\mu$, $\mathrm{Var}$; call advisor; set `message`.
- **`onStageStart("reveal")`:** draw $X$, $\rho$/$\nu$ outcomes; set private `X`, public `records`.
- **`onStageStart("act")`:** in `action` arm compute `recAction` per player (server-side).
- **`onStageEnd("prepare"|"act")`:** apply defaults for missing submissions; write `timedOut`.
- **`onStageStart("result")`:** compute losses, points, firm loss, profit, noisy $Y$; update cumulative scores; write public `result`; append to history.
- **`onGameEnd`:** finalize totals; write analysis summary.

Stage submission uses `player.stage.set("submit", true)`; a stage ends early when all players submit, else at its duration.

### 10.4 Hidden state and randomness (anti-leak design)

- Do **not** store $\theta$ or unrevealed $X$ in any attribute visible to clients.
- Derive per-round draws deterministically on the server: `rng = prng(hash(SERVER_SECRET, gameId, roundIndex, streamName))` with streams `theta`, `X1`, `X2`, `rho1`, `rho2`, `nu1`, `nu2`, `noiseY1`, `noiseY2`, `adviceArm`. This is restart-safe and replayable for analysis. `SERVER_SECRET` comes from env.
- Anything a client legitimately needs before its reveal point is stored as a private attribute for that one player only.

---

## 11. `shared/rules.js` reference implementation

```js
// All functions pure. p = { h, beta, gamma, rho, nu, cW, cF }
export const kappa = (g) => g / (1 + g);
export const sShare = (p) => (1 - p.rho) * p.nu;

export function binPosterior(k, K) {
  const mu = (2 * k + 1) / (2 * K);
  const varTheta = 1 / (12 * K * K);
  return { mu, varTheta, eta: varTheta + mu * mu };
}

export function lambdaMin(epsA, p) {
  return Math.max(0, 1 - Math.sqrt(epsA) / ((1 - p.gamma) * p.beta));
}

// rI/rJ: record released about self/partner. XJ only used if rJ.
export function actionRule({ T, X, rI, rJ, XJ, mu, lambda = 1, p }) {
  const DI = rI ? mu * p.h * X : 0;
  const DJ = rJ ? mu * p.h * XJ : 0;
  return (1 - p.gamma) * (mu * p.h + lambda * p.beta * T) * X
       + (p.gamma ** 2 * DI + p.gamma * DJ) / (1 + p.gamma);
}

export function workerLoss({ aI, aJ, theta, T, X, e, p }) {
  const D = (theta * p.h + p.beta * T) * X;
  return (1 - p.gamma) * (aI - D) ** 2 + p.gamma * (aI - aJ) ** 2 + p.cW * e;
}

export function firmLoss({ a1, a2, theta, X1, X2, e1, e2, p }) {
  const H1 = theta * p.h * X1, H2 = theta * p.h * X2;
  return ((1 - p.gamma) / 2) * ((a1 - H1) ** 2 + (a2 - H2) ** 2)
       + p.gamma * (a1 - a2) ** 2 + (p.cF / 2) * (e1 + e2);
}

// One-period private gross value of sharing, q fixed at 1/2 (Prop. 1)
export function gShare(T, mu, p) {
  const k = kappa(p.gamma), m = mu * p.h;
  return sShare(p) * p.gamma * (1 - p.gamma) * (2 * k * (m + p.beta * T) * m - k * k * m * m);
}

export const points = ({ lossI, lossO, omega, base, K }) =>
  base - K * ((1 - omega) * lossI + omega * lossO);

// TODO (M3): expectedLosses({T:[T1,T2], e:[e1,e2], lambda:[l1,l2], mu, varTheta, p})
//            -> { worker:[l1,l2], firm }   (section 9.3 enumeration)
// TODO (M3): processPlan({mu, varTheta, p, epsE}) in advisor.js (section 9.2)
```

---

## 12. Logging and export schema

One row per player per round (`data/player_rounds.csv`) and one row per round (`data/rounds.csv`). Use Empirica's export plus an explicit summary written in `onGameEnd`.

**player_round:** `gameId, playerId, role, T, roundIdx, scenarioId, decisionLabel, armThisRound, adviceMode, outlookBin, mu, recordLabels, planPrepSelf, planPrepPartner, lambda, recAction, share, X, recSelfReleased, recPartnerReleased, XPartnerSeen, action, actionTimedOut, shareTimedOut, obedienceDist, lossI, lossO, points, scoreCum, noisyYPartner, stageDurations, uiEvents`

**round:** `gameId, roundIdx, theta, X1, X2, share1, share2, rho1Hit, rho2Hit, nu1Hit, nu2Hit, a1, a2, firmLoss, profit, profitCum, nashBenchmarkLoss`

Also log quiz attempts, instruction time, and disconnect events. **Never** export the server secret.

---

## 13. Default parameters (`shared/constants.js`)

```js
export const PARAMS = {
  h: 1.0, beta: 0.6, gamma: 0.5,
  rho: 0.2, nu: 0.8,
  cW: 0.03, cF: 0.0,
  sigmaY: 0.3,
  epsA: 0.02, epsE: 0.02,
  thetaBins: 3, nRounds: 20, delta: 0,
};
export const SCORING = { base: 100, K: 100, omega: 0 };
export const ACTION = { min: -2, max: 2, step: 0.05, default: 0 };
export const STAGE_SECONDS = { advice: 12, prepare: 20, reveal: 10, act: 40, result: 15 };
export const PARAM_BOUNDS = { h:[0.5,2], beta:[0.2,1.0], gamma:[0.2,0.8], rho:[0.05,0.5],
                              nu:[0.3,0.95], cW:[0.005,0.1], cF:[0,0.1], sigmaY:[0.05,1] };
```

**Why these defaults:** $\beta=0.6\ge h/2$ puts the model in the paper's interesting regime where private incentives diverge by type. With $\theta h<\beta$ (market below 0.6) the low type's *preferred* action points opposite to the firm's, so conservative players really are pulled the wrong way in weak markets.

**Worked numbers (sanity check, $\gamma=.5,\rho=.2,\nu=.8$, so $s=.64$, $\kappa=\tfrac13$):**

| Outlook $\mu$ | $G$ high type | $G$ low type | vs $c_W=.03$ |
|---|---|---|---|
| 1/6 | ≈ .013 | ≈ −.008 | nobody prefers to share |
| 1/2 | ≈ .054 | ≈ −.010 | high shares, low does not |
| 5/6 | ≈ .115 | ≈ .008 | high shares, low does not |

**`scripts/sweep.js` (M1):** print, for each outlook bin and type, $G-c_W$, the $\lambda^*$, the chosen process plan, and expected firm loss under {Nash, action, process}. Use it to pick final parameters so that arms produce **distinguishable regimes** (e.g. process advice recommends sharing for a type that would not share on its own). Tune `epsE`, `cW`, `beta` as needed and record the final choices in the repo.

**`scripts/simulate.js` (M6):** Monte Carlo of fully rational (Nash) players per arm, to give theoretical benchmark scores to compare against human data.

---

## 14. Milestones and acceptance criteria

| M | Deliverable | Done when |
|---|---|---|
| **M0** | Scaffold: `empirica create`, folder layout above, 2-tab dev flow | `empirica` runs, two tabs join the same game |
| **M1** | `shared/rules.js`, `constants.js`, `prng.js`, `scripts/sweep.js`, unit tests | all tests below pass |
| **M2** | Full 5-stage loop, no advice (`none`), scoring, sidebar, history, results | two humans complete 20 rounds; CSV export matches section 12 |
| **M3** | `advisor.js`, `action` and `process` arms, `RecommendationProvider` + LLM stub | arms show correct UI; recommended values match unit tests |
| **M4** | Intro, instructions, comprehension quiz, scenarios (3), polish, timers/timeouts | quiz gates entry; timeouts apply defaults and are flagged |
| **M5** | `separating` mode; optional belief tracking $q_{it}$ (Bayes, Eq. 22) feeding AI and $d^\lambda(\mu,q)$ | toggles change behavior and are logged |
| **M6** | `simulate.js`, bot/virtual partner for solo testing, `joint` arm, analysis notebook | benchmark vs observed plotted |

**Unit tests (M1)**

1. **Nash fixed point:** for random $(T,X,r,\mu)$, the closed-form $a_i^N$ satisfies $a_i=(1-\gamma)(\mu h+\beta T_i)X_i+\gamma A_j$ with $A_j=(\hat D_j+\gamma\hat D_i)/(1+\gamma)$.
2. **Gross-share formula vs enumeration:** with $q=\tfrac12$, `gShare(T, mu, p)` equals the enumerated drop in expected worker loss (excluding $c_W$) from $e_i=0$ to $e_i=1$, to $10^{-9}$. If this fails, flag it in `## Open issues`; do not "fix" by changing the formula.
3. **Regret bound:** at $\lambda=\lambda_{\min}$, $(1-\gamma)^2\beta^2(1-\lambda)^2=\epsilon_a$ (when $\lambda_{\min}>0$).
4. **Limits:** $\lambda=1$ equals Nash; $\gamma\to0$ gives $a=(\mu h+\beta T)X$.
5. **Record probability:** simulated release frequency matches $\rho+s e$.
6. **Determinism:** same `(secret, gameId, round)` always yields the same draws.

**Integration / acceptance tests**

- **Leak test (blocking):** with two browsers joined, in devtools inspect everything the Empirica client holds (e.g. via hooks and `usePlayers()`). Player A's browser must not contain $\theta$, B's $T$, B's unrevealed $X$, B's `share`, or B's `recAction`.
- **Timing test:** $X$ for round $t$ does not exist anywhere before the `prepare` stage for round $t$ ends.
- **Timeout test:** idle player gets defaults (Individual, action 0) and rows are flagged.
- **Arm test:** `action` arm never shows a prep recommendation; `process` arm never shows an action number.
- **Data test:** exported rows reproduce points from logged inputs using `rules.js`.

**Edge cases:** a dropped partner ends the game early (Empirica's exit handling), data kept and flagged `earlyExit`. Both players' random role/type assignment is seeded and logged.

---

## 15. Changes from the first draft

- **Score direction fixed:** score decreases with deviation from the player's optimum (squared loss), instead of "increases proportional to deviation".
- **Cooperate clarified:** sharing only affects whether the *partner and AI* learn $X$; players always know their own. Sharing can fail ($\nu$), and a free report ($\rho$) can reveal $X$ even for Individual players.
- **AI observes the hidden market state $\theta$** and the outlook message carries information in every arm; equalized across arms so advice type is the only contrast.
- **Per-round random advice type** is supported but not the default (confounds learning).
- **Persistent private types** ($T$) added; this is what creates the incentive conflict the paper is about.
- Company "profit" is a transform of firm loss; scenario cost variables (CAC, hiring cost, etc.) are flavor unless mapped into model parameters.

---

## Open issues

- (Fill in as discovered. First candidates: Eq. 34 vs the enumeration test; exact Empirica private-attribute option names; callback names in the installed template.)