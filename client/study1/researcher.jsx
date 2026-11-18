// Researcher page (?researcher=1): browse the supplied arms read-only and open
// a player preview of any of them. Parameters are not editable here: South's
// shipments are precomputed for each arm, so changing a number would make them stale.
import React, { useMemo, useState } from "react";
import { ACTIVE_BLOCKS } from "../../shared/arms/active.js";
import {
  COST_SCALE,
  armIds,
  buildArm,
  forwardingChangesAnything,
  formatCrates,
  pct,
  situationName,
} from "../../shared/rules.js";
import { Box, Button, ForwardingTable, H1, P, Page, Section, SituationTable, TopBar } from "../game/parts";

const Field = ({ label, value }) => (
  <div className="flex justify-between gap-4 border-b border-line py-1.5 text-[15px]">
    <span className="text-muted">{label}</span>
    <span className="font-mono text-ink tabular-nums">{value}</span>
  </div>
);

export function Researcher({ tables }) {
  const ids = useMemo(() => armIds(tables), [tables]);
  const blocks = useMemo(() => [...new Set(tables.arms.map((a) => a.block_id))], [tables]);
  const [block, setBlock] = useState(ACTIVE_BLOCKS[0]);
  const [forwarding, setForwarding] = useState("selective");
  const [recommend, setRecommend] = useState(true);
  const id = `${block}_${forwarding}_R${recommend ? 1 : 0}`;
  const arm = ids.includes(id) ? buildArm(tables, id) : null;
  const preview = `${window.location.pathname}?arm=${id}`;

  return (
    <div className="h-screen overflow-auto bg-paper">
      <TopBar>Researcher settings</TopBar>
      <Page>
        <H1>Experiment configuration</H1>
        <P>
          Pick an arm from the supplied tables ({ids.length} arms in {blocks.length} blocks). Everything below is read
          from <code>shared/arms/</code>. In Qualtrics, set the <code>arm</code> embedded data field to the arm ID. Blocks
          in use now (<code>shared/arms/active.js</code>): {ACTIVE_BLOCKS.join(", ")}.
        </P>
        <div className="flex flex-wrap items-end gap-6">
          <label className="space-y-1">
            <div className="text-[13px] text-muted">Block</div>
            <select value={block} onChange={(e) => setBlock(e.target.value)} className="h-11 rounded-md border border-ink/30 bg-surface px-3 text-[16px]">
              {blocks.map((b) => (
                <option key={b} value={b}>
                  {b}
                  {ACTIVE_BLOCKS.includes(b) ? " (in use)" : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-1">
            <div className="text-[13px] text-muted">Mediator mode</div>
            <div className="flex rounded-md border border-ink/30 overflow-hidden">
              {["unchanged", "selective"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setForwarding(f)}
                  className={`h-11 px-4 text-[15px] capitalize ${forwarding === f ? "bg-ink text-surface" : "bg-surface text-ink"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 h-11 text-[15px] text-ink">
            <input type="checkbox" checked={recommend} onChange={(e) => setRecommend(e.target.checked)} className="h-5 w-5 accent-[#1d1c1a]" />
            AI suggestion on
          </label>
          <div className="font-mono text-[15px] text-ink">arm = {id}</div>
        </div>

        {arm && (
          <>
            {arm.forwarding === "selective" && !forwardingChangesAnything(arm) && (
              <Box tone="warm">
                In this block the selective forwarding table changes no messages, so this arm plays exactly like the
                unchanged arm except for the "may change messages" wording.
              </Box>
            )}
            <div className="grid gap-8 md:grid-cols-3">
              <div>
                <Section>Market</Section>
                <Field label="Low market z_L" value={arm.zL} />
                <Field label="High market z_H" value={arm.zH} />
                <Field label="Chance of high p" value={pct(arm.p)} />
              </div>
              <div>
                <Section>Targets</Section>
                <Field label="Target gap b" value={arm.b} />
                <Field label="Common q" value={pct(arm.q)} />
                <Field label="Shipment bounds" value={`${arm.min} … ${arm.max}`} />
              </div>
              <div>
                <Section>Cost</Section>
                <Field label="Shown cost = loss ÷" value={COST_SCALE} />
                <Field label="Spec points: B, c" value={`${arm.base}, ${arm.c}`} />
                <Field label="Coordination weight γ" value={arm.gamma} />
              </div>
            </div>

            <div className="space-y-3">
              <Section>Generated targets</Section>
              <SituationTable arm={arm} />
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-3">
                <Section>Reporting rule {arm.recommend ? "(shown as the AI suggestion)" : "(South only; suggestion off)"}</Section>
                <table className="w-full text-[15px]">
                  <thead>
                    <tr className="text-left text-muted">
                      <th className="py-1 font-medium">Situation</th>
                      <th className="py-1 font-medium">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arm.displayOrder.map((s) => (
                      <tr key={s} className="border-t border-line">
                        <td className="py-1.5">{situationName(arm, s)}</td>
                        <td className={`py-1.5 ${arm.messageRule[s] !== s ? "font-semibold text-accent" : ""}`}>
                          {situationName(arm, arm.messageRule[s])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3">
                <Section>Forwarding</Section>
                <ForwardingTable arm={arm} />
              </div>
            </div>

            <div className="space-y-3">
              <Section>South's shipment</Section>
              <P>By South's own situation (rows) and the message delivered to South (columns).</P>
              <div className="overflow-x-auto">
                <table className="w-full text-[15px] text-center">
                  <thead>
                    <tr className="text-muted">
                      <th className="py-1 text-left font-medium">South's situation</th>
                      {arm.displayOrder.map((m) => (
                        <th key={m} className="py-1 font-medium">
                          gets {situationName(arm, m)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {arm.displayOrder.map((s) => (
                      <tr key={s} className="border-t border-line">
                        <td className="py-1.5 text-left">{situationName(arm, s)}</td>
                        {arm.displayOrder.map((m) => (
                          <td key={m} className="py-1.5 font-mono tabular-nums">
                            {formatCrates(arm.programmed[s][m], 1)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3 border-t border-line pt-6">
              <a href={preview} target="_blank" rel="noreferrer">
                <Button>Preview player screens</Button>
              </a>
            </div>
          </>
        )}
      </Page>
    </div>
  );
}
