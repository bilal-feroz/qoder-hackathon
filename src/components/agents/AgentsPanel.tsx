import { useEffect, useMemo, useRef, useState } from 'react';
import { ThinkingOrb } from 'thinking-orbs';
import { Check, ChevronDown, GitCompare, RotateCcw, X } from 'lucide-react';
import { useTwinStore } from '../../store/useTwinStore';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { buildRun, crewStatus, type AgentEntry, type AgentRun, type Autonomy, type How } from '../../agents/brain';
import { AGENT_BY_ID, type AgentId } from '../../agents/team';
import { CREWS, PEOPLE_ON_SHIFT, type Skill } from '../../agents/crews';
import { COSTS, INCIDENT, formatMoney } from '../../data/incident';
import { factsNow } from '../../agents/ask';
import { RimGlow } from '../ui/ai-lights/RimGlow';
import { useRimMask } from '../ui/ai-lights/useAiLights';
import { EVEN_STOPS } from '../ui/ai-lights/mask';
import { AutonomySwitch } from './AutonomySwitch';
import { ThinkingLine } from './ThinkingLine';
import { ApprovalCard } from './ApprovalCard';
import { AskUnderGrid } from './AskUnderGrid';
import { SavingsChart, WhatIfChart } from './AgentCharts';

const DOING: Record<AgentId, string> = {
  watch: 'Watch is comparing nearby sensors…',
  diagnose: 'Diagnose is working out how long we have…',
  plan: 'Plan is weighing the options…',
  patch: 'Patch is adjusting valves remotely…',
  dispatch: 'Dispatch is tracking the crew…',
  verify: 'Verify is testing the pressure…',
};

const SKILL: Record<Skill, string> = { 'water-main': 'Big pipes', 'water-service': 'Small pipes', electric: 'Power', sewage: 'Sewage' };

function howLabel(how: How, autonomy: Autonomy) {
  if (how === 'auto') return autonomy === 'full' ? 'Did it alone' : 'Inside your limits';
  if (how === 'approved') return 'You approved';
  if (how === 'declined') return 'Changed after your answer';
  return 'Waiting for you';
}

/** One decision: who, what, and (for the latest) the options it weighed. */
function Entry({ e, latest, autonomy, still }: { e: AgentEntry; latest: boolean; autonomy: Autonomy; still: boolean }) {
  const [open, setOpen] = useState(false);
  const agent = AGENT_BY_ID[e.agent];
  return (
    <li className={`entry ${latest ? 'is-latest' : ''}`}>
      <div className="entry-who">
        {latest ? <ThinkingOrb state={agent.orb} size={20} theme="dark" paused={still} aria-hidden="true" /> : <span className="entry-dot" aria-hidden="true" />}
        <span className="entry-agent">{agent.name}</span>
        {e.how && <span className={`entry-how how-${e.how}`}>{howLabel(e.how, autonomy)}</span>}
      </div>
      <p className="entry-title">{e.title}</p>
      {latest && <p className="entry-detail">{e.detail}</p>}
      {latest && e.options && (
        <div className={`entry-options ${open ? 'is-open' : ''}`}>
          <button className="entry-options-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
            Why this one? {e.options.length} options compared
            <ChevronDown size={13} />
          </button>
          <div className="entry-options-panel">
            <ul className="entry-options-inner">
              {e.options.map((o) => (
                <li key={o.label} className={o.chosen ? 'is-chosen' : ''}>
                  <b>{o.label}</b>
                  <span>{o.note}</span>
                </li>
              ))}
            </ul>
          </div>
          {e.checks && (
            <ul className="entry-checks" aria-label="Limits checked">
              {e.checks.map((c) => (
                <li key={c.label} className={c.ok ? 'is-ok' : 'is-no'}>
                  {c.ok ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
                  {c.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

/** Crews folded to one line; open it to see who is where. */
function Crews({ run, t, active }: { run: AgentRun; t: number; active: boolean }) {
  const [open, setOpen] = useState(false);
  const rows = CREWS.map((c) => ({ c, s: crewStatus(c, run, t, active) }));
  const working = rows.filter((r) => r.s.tone === 'moving' || r.s.tone === 'working' || r.s.tone === 'busy').reduce((n, r) => n + r.c.people, 0);
  const moving = rows.find((r) => r.s.tone === 'moving' || r.s.tone === 'working');
  return (
    <section className={`crews ${open ? 'is-open' : ''}`} aria-label="Crews on shift">
      <button className="crews-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>Crews</span>
        <span className="crews-sum">{moving ? `${moving.c.name} · ${moving.s.label}` : `${working} of ${PEOPLE_ON_SHIFT} people busy`}</span>
        <ChevronDown size={13} />
      </button>
      {open && (
        <ul>
          {rows.map(({ c, s }) => (
            <li key={c.id} className={`crew tone-${s.tone}`}>
              <i aria-hidden="true" />
              <b>{c.name}</b>
              <span className="crew-skill">{c.skills.map((k) => SKILL[k]).join(' · ')}</span>
              <span className="crew-status">{s.label}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The result, with the two charts: what the fix saved and what would have happened. */
function Outcome({ run }: { run: AgentRun }) {
  const setCompare = useTwinStore((s) => s.setCompare);
  const compare = useTwinStore((s) => s.compare);
  const replay = useTwinStore((s) => s.run);
  return (
    <section className="outcome" aria-label="Result">
      <div className="outcome-title">
        <span className="outcome-check" aria-hidden="true">
          <Check size={15} strokeWidth={3} />
        </span>
        {run.lasting ? 'Fixed before it broke' : 'Leak stopped for now'}
      </div>
      <div className="outcome-kpis">
        <div>
          <b className="tnum">{INCIDENT.population.toLocaleString('en-US')}</b>
          <span>kept their water</span>
        </div>
        <div>
          <b className="tnum">{run.lasting ? formatMoney(COSTS.avoided) : formatMoney(run.fix.cost)}</b>
          <span>{run.lasting ? 'saved' : 'spent so far'}</span>
        </div>
        <div>
          <b className="tnum">
            {INCIDENT.riskBefore} → {run.riskAfter}
          </b>
          <span>risk</span>
        </div>
      </div>
      <SavingsChart fixCost={run.fix.cost} />
      <WhatIfChart />
      <div className="outcome-actions">
        <button className={`btn-primary ${compare ? 'is-on' : ''}`} onClick={() => setCompare(compare ? null : 'none')}>
          <GitCompare size={15} />
          {compare ? 'Close' : 'With and without UnderGrid'}
        </button>
        <button className="btn-ghost" onClick={replay} aria-label="Run again">
          <RotateCcw size={14} />
        </button>
      </div>
    </section>
  );
}

/**
 * The agents as a dropdown: one line saying what they are doing, opening on its own when they need
 * a person (an approval) or have a result, and on demand otherwise. A constant light-blue halo
 * (AI lights) runs round its rim.
 */
export function AgentsPanel() {
  const snap = useTwinStore((s) => s.snap);
  const policy = useTwinStore((s) => s.policy);
  const verdict = useTwinStore((s) => s.approvals.plan);
  const awaiting = useTwinStore((s) => s.awaiting);
  const still = useMediaQuery('(prefers-reduced-motion: reduce)');
  const run = useMemo(() => buildRun(policy, verdict), [policy, verdict]);
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState(false);
  const glowRef = useRef<HTMLDivElement>(null);
  const layers = useRimMask(glowRef, { stops: EVEN_STOPS });

  const { t, active, resolved } = snap;
  const shown = active ? run.entries.filter((e) => e.t <= t + 1e-6) : [];
  const latest = shown[shown.length - 1];
  const working = active && !resolved && !awaiting;
  const lead: AgentId = !active ? 'watch' : awaiting ? 'plan' : resolved ? 'verify' : (latest?.agent ?? 'watch');
  const line = !active
    ? 'Watch is checking 216 sensors'
    : awaiting
      ? 'Waiting for your OK on the repair plan'
      : resolved
        ? run.lasting
          ? 'All clear · lesson saved'
          : 'Leak stopped · full repair needs your OK'
        : DOING[lead];
  const mode = active ? (resolved ? 'Done' : awaiting ? 'Needs you' : 'Working') : 'Standing by';

  // drop down when needed: a decision waiting for a person, or the result is in
  useEffect(() => {
    if (awaiting) setOpen(true);
  }, [awaiting]);
  useEffect(() => {
    if (resolved) setOpen(true);
  }, [resolved]);
  useEffect(() => {
    if (!active) {
      setOpen(false);
      setHistory(false);
    }
  }, [active]);

  const earlier = shown.slice(0, -1).reverse();

  return (
    <div ref={glowRef} className={`agents-dd ai-lights is-constant ${open ? 'is-open' : ''} ${awaiting ? 'needs-you' : ''}`}>
      <RimGlow layers={layers} />
      <div className="agents-face">
        <button className="agents-head" aria-expanded={open} aria-controls="agents-body" onClick={() => setOpen(!open)}>
          <ThinkingOrb state={AGENT_BY_ID[lead].orb} size={20} theme="dark" paused={still || !working} aria-hidden="true" />
          <span className="agents-head-text">
            <span className="agents-title-row">
              <span className="rail-title">Agents</span>
              <span className={`agents-mode mode-${mode.replace(' ', '-').toLowerCase()}`}>{mode}</span>
            </span>
            <ThinkingLine text={line} live={working || !active} />
          </span>
          <ChevronDown size={16} className="agents-chev" aria-hidden="true" />
        </button>

        <div id="agents-body" className="agents-body" aria-hidden={!open}>
          <div className="agents-body-inner">
            <AutonomySwitch />
            {awaiting && <ApprovalCard gate={awaiting} still={still} />}
            {resolved && <Outcome run={run} />}
            {!resolved && latest && (
              <ol className="feed" aria-label="What the agents are doing">
                <Entry key={latest.id} e={latest} latest autonomy={policy.autonomy} still={still} />
              </ol>
            )}
            {earlier.length > 0 && (
              <section className={`history ${history ? 'is-open' : ''}`}>
                <button className="history-toggle" aria-expanded={history} onClick={() => setHistory(!history)}>
                  {earlier.length} {earlier.length === 1 ? 'step' : 'steps'} so far
                  <ChevronDown size={13} />
                </button>
                {history && (
                  <ol className="feed is-compact" aria-label="Earlier steps">
                    {earlier.map((e) => (
                      <Entry key={e.id} e={e} latest={false} autonomy={policy.autonomy} still={still} />
                    ))}
                  </ol>
                )}
              </section>
            )}
            <AskUnderGrid facts={() => factsNow(run, shown, policy, awaiting, t, active, resolved)} />
            <Crews run={run} t={t} active={active} />
          </div>
        </div>
      </div>
    </div>
  );
}
