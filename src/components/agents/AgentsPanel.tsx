import { useMemo, useState } from 'react';
import { BorderBeam } from 'border-beam';
import { ThinkingOrb } from 'thinking-orbs';
import { Check, ChevronDown, GitCompare, RotateCcw, X } from 'lucide-react';
import { useTwinStore } from '../../store/useTwinStore';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { buildRun, crewStatus, type AgentEntry, type AgentRun, type Autonomy, type How } from '../../agents/brain';
import { AGENTS, AGENT_BY_ID, type AgentId } from '../../agents/team';
import { CREWS, PEOPLE_ON_SHIFT, type Skill } from '../../agents/crews';
import { COSTS, INCIDENT, formatMoney } from '../../data/incident';
import { AutonomySwitch } from './AutonomySwitch';
import { ThinkingLine } from './ThinkingLine';
import { ApprovalCard } from './ApprovalCard';
import { AskPioneer } from './AskPioneer';
import { factsNow } from '../../agents/ask';

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
  if (how === 'auto') return autonomy === 'full' ? 'Did it alone' : 'Alone · inside your limits';
  if (how === 'approved') return 'You approved';
  if (how === 'declined') return 'Changed after your answer';
  return 'Waiting for you';
}

function Entry({ e, latest, autonomy, still }: { e: AgentEntry; latest: boolean; autonomy: Autonomy; still: boolean }) {
  const [open, setOpen] = useState(false);
  const agent = AGENT_BY_ID[e.agent];
  const expanded = open || (latest && !!e.options);
  return (
    <li className={`entry ${latest ? 'is-latest' : ''}`}>
      <div className="entry-who">
        {latest ? <ThinkingOrb state={agent.orb} size={20} theme="light" paused={still} aria-hidden="true" /> : <span className="entry-dot" aria-hidden="true" />}
        <span className="entry-agent">{agent.name}</span>
        {e.how && <span className={`entry-how how-${e.how}`}>{howLabel(e.how, autonomy)}</span>}
      </div>
      <p className="entry-title">{e.title}</p>
      <p className="entry-detail">{e.detail}</p>
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
      {e.options && (
        <div className={`entry-options ${expanded ? 'is-open' : ''}`}>
          <button className="entry-options-toggle" aria-expanded={expanded} onClick={() => setOpen(!expanded)}>
            Compared {e.options.length} options
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
        </div>
      )}
    </li>
  );
}

function CrewBoard({ run, t, active }: { run: AgentRun; t: number; active: boolean }) {
  const rows = CREWS.map((c) => ({ c, s: crewStatus(c, run, t, active) }));
  const working = rows.filter((r) => r.s.tone === 'moving' || r.s.tone === 'working' || r.s.tone === 'busy').reduce((n, r) => n + r.c.people, 0);
  return (
    <section className="crews" aria-label="Crews on shift">
      <div className="crews-head">
        <span>Crews</span>
        <span className="tnum">
          {working} of {PEOPLE_ON_SHIFT} people busy
        </span>
      </div>
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
    </section>
  );
}

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
      <div className="outcome-actions">
        <button className={`btn-primary ${compare ? 'is-on' : ''}`} onClick={() => setCompare(compare ? null : 'none')}>
          <GitCompare size={15} />
          {compare ? 'Close' : 'With and without Pioneer'}
        </button>
        <button className="btn-ghost" onClick={replay} aria-label="Run again">
          <RotateCcw size={14} />
        </button>
      </div>
    </section>
  );
}

export function AgentsPanel() {
  const snap = useTwinStore((s) => s.snap);
  const policy = useTwinStore((s) => s.policy);
  const verdict = useTwinStore((s) => s.approvals.plan);
  const awaiting = useTwinStore((s) => s.awaiting);
  const still = useMediaQuery('(prefers-reduced-motion: reduce)');
  const run = useMemo(() => buildRun(policy, verdict), [policy, verdict]);

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

  return (
    <BorderBeam size="line" colorVariant="mono" theme="light" active={working && !still} duration={3.4} strength={0.8} borderRadius={22} className="agents-beam">
      <div className="rail-inner agents">
        <header className="rail-head">
          <span className="rail-title">Agents</span>
          <span className="agents-mode">{active ? (resolved ? 'Done' : awaiting ? 'Paused' : 'Working') : 'Standing by'}</span>
        </header>

        <AutonomySwitch />

        <ul className="team" aria-label="Agent team">
          {AGENTS.map((a) => (
            <li key={a.id} className={a.id === lead ? 'is-lead' : ''} title={a.job}>
              <ThinkingOrb state={a.orb} size={20} theme="light" paused={still || a.id !== lead} aria-hidden="true" />
              <span>{a.name}</span>
            </li>
          ))}
        </ul>

        <ThinkingLine text={line} live={working || !active} />

        {awaiting && <ApprovalCard gate={awaiting} still={still} />}
        {resolved && <Outcome run={run} />}

        <AskPioneer facts={() => factsNow(run, shown, policy, awaiting, t, active, resolved)} />

        {shown.length > 0 && (
          <ol className="feed" aria-label="What the agents did" reversed>
            {[...shown].reverse().map((e) => (
              <Entry key={e.id} e={e} latest={e === latest && !resolved} autonomy={policy.autonomy} still={still} />
            ))}
          </ol>
        )}

        <CrewBoard run={run} t={t} active={active} />
      </div>
    </BorderBeam>
  );
}
