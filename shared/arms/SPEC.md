# Shipping game: settings and CSV rules

The participant runs North plant; the programmed counterpart runs South plant. Each chooses how many more or fewer crates to ship than normal.

## 1. Parameters and four targets

Choose one row of `arms.csv`. It contains `z_L, z_H, p, b, q, gamma, base_points, c`, shipment bounds, and the forwarding and suggestion settings. Use its `arm_id` to load the other tables. The high market has probability `p`; the low market has probability `1-p`.

Each plant independently faces one of four situations:

| Situation ID | Target if low | Target if high | Probability |
|---|---|---|---|
| 0 | $z_L+b$ | $z_H+b$ | $q/2$ |
| 1 | $z_L-b$ | $z_H-b$ | $(1-q)/2$ |
| 2 | $-(z_L-b)$ | $-(z_H-b)$ | $(1-q)/2$ |
| 3 | $-(z_L+b)$ | $-(z_H+b)$ | $q/2$ |

Load these values from `targets.csv` using `block_id, situation_id`. Use its `name` and `display_order` in the interface. A message ID refers to the situation with the same ID.

Show the market probabilities, situation probabilities, the participant's own situation and two targets, and then the message choices. Only the mediator knows the realized market before the results.

## 2. Calculator and final points

Let $A$ be North's shipment, $D_L,D_H$ its true targets, $B$ the `base_points`, and $\gamma$ the `gamma`.

The participant adjusts their shipment $A$ and their guess $\widehat A_j$ of South's shipment. Using the configured market probability $p$, the calculator shows:

$$
\text{Average points at the stated market probabilities}
=B-c\left[(1-\gamma)\{(1-p)(A-D_L)^2
+p(A-D_H)^2\}
+\gamma(A-\widehat A_j)^2\right].
$$

After revealing the market and shipments, use:

$$
\text{Actual points}
=B-c\left[(1-\gamma)(A-D_z)^2+\gamma(A-A_j)^2\right].
$$

$D_z$ is North's true target in the realized market; $A_j$ is South's actual shipment.

## 3. Forwarding rule

When selective forwarding is enabled, use `forwarding_rules.csv`:

`arm_id, market, original_message_id -> delivered_message_id`.

Use the same table in both directions. Under unchanged forwarding, output equals input.

Place a "Forwarding rule" button beside the received message. It opens the same rule used for both plants, listing what is sent and what is delivered in each market.

## 4. South's behavior

South is the simulated user. Use two lookups:

- Message choice: `message_rules.csv[arm_id, situation_id] -> message_id`.
- Shipment choice: `opponent_shipments.csv[arm_id, situation_id, received_message_id] -> shipment`.

Generate South's message before reading North's report. Forward both reports, then obtain South's shipment using the message delivered to South. North chooses its own shipment independently.

## 5. AI suggestion

When `recommendation_on=1`, use `message_rules.csv[arm_id, situation_id]` for North's situation. Display:

**AI suggestion**  
Send [message name].

When off, hide the suggestion. 

## 6. Worked example: one row of arms.csv

Use `B019_selective_R1`:

$z_L=55$, $z_H=75$, $p=0.2$, $b=50$, $q=0.2$, $\gamma=0.5$, $B=100$, $c=0.0008$. Shipment bounds are $[-175,175]$.

| Situation / message | Probability | Low market: 80% | High market: 20% |
|---|---:|---:|---:|
| Large increase (0) | 10% | +105 | +125 |
| Small increase (1) | 40% | +5 | +25 |
| Small decrease (2) | 40% | -5 | -25 |
| Large decrease (3) | 10% | -105 | -125 |

The supplied reporting rules are:

| Own situation | Unchanged forwarding | Selective forwarding |
|---|---|---|
| Large increase | Large increase | Large increase |
| Small increase | Large increase | Large increase |
| Small decrease | Large decrease | Small decrease |
| Large decrease | Large decrease | Large decrease |

The forwarding rule, applied to both plants, is:

| Original message | Delivered if low | Delivered if high |
|---|---|---|
| Large increase | Small increase | Large increase |
| Small increase | Small increase | Large increase |
| Small decrease | Small decrease | Large decrease |
| Large decrease | Large decrease | Large decrease |

One round:

1. The market is high. North's situation is Small increase; South's is Large increase.
2. North sees **AI suggestion: Send Large increase.** South also sends Large increase.
3. If North follows the suggestion, both reports are Large increase. The mediator delivers Large increase to both plants.
4. South's shipment lookup returns **85**. North's Nash benchmark is **35**, but the participant chooses freely. Under unchanged forwarding, the corresponding benchmarks would be **69** and **19**.
5. With shipment 35 and a South-shipment guess of 45, the calculator averages the two market cases using the configured 20% high-market probability and displays **99.66 points**.
6. South actually ships 85, so North's final score is **98.96 points**:

$$
100-0.0008\left[0.5(35-25)^2+0.5(35-85)^2\right]=98.96.
$$
