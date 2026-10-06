import { T } from '../simulation/timeline';
import { COSTS, INCIDENT, formatMoney } from '../data/incident';
import { CREWS, type Crew, type Skill } from './crews';
import type { AgentId } from './team';

/**
 * How the agents decide. Everything here is a pure function of the operator's
 * limits and their answers, so the demo clock can pause, seek and replay exactly.
 *
 * The rule of thumb: agents act on their own when an action stays inside the
 * limits; when the best option breaks a limit they look for one that doesn't,
 * and only ask a person when nothing fits.
 */

export type Autonomy = 'full' | 'limits' | 'ask';
export type Verdict = 'approved' | 'declined';
export type How = 'auto' | 'approved' | 'declined' | 'waiting';

export interface Policy {
  autonomy: Autonomy;
  spendLimit: number;
}

export const DEFAULT_POLICY: Policy = { autonomy: 'limits', spendLimit: 1_000_000 };
export const SPEND_LIMITS = [400_000, 1_000_000, 4_000_000] as const;

export interface Check {
  label: string;
  ok: boolean;
}

export interface Option {
  label: string;
  note: string;
  chosen?: boolean;
}

export interface AgentEntry {
  id: string;
  t: number;
  agent: AgentId;
  title: string;
  detail: string;
  /** Set on actions and decisions: who allowed it. */
  how?: How;
  checks?: Check[];
  options?: Option[];
}

export interface Gate {
  id: 'plan';
  t: number;
  title: string;
  why: string;
  items: string[];
  declineLabel: string;
}

export interface AgentRun {
  entries: AgentEntry[];
  gate: Gate | null;
  fix: Fix;
  crew: Crew;
  sideCrew: Crew;
  riskAfter: number;
  lasting: boolean;
}

/* ------------------------------------------------------------------ */
/* Choices the agents weigh                                            */
/* ------------------------------------------------------------------ */

interface Fix {
  id: 'replace' | 'clamp' | 'wait';
  label: string;
  short: string;
  cost: number;
  riskAfter: number;
  lasting: boolean;
}

const FIXES: Fix[] = [
  { id: 'replace', label: 'Replace the damaged 3 m section', short: 'replace the pipe section', cost: COSTS.preventive, riskAfter: INCIDENT.riskAfter, lasting: true },
  { id: 'clamp', label: 'Put a temporary clamp on it', short: 'clamp the leak for now', cost: 150_000, riskAfter: 58, lasting: false },
  { id: 'wait', label: 'Wait and watch', short: 'wait', cost: 0, riskAfter: INCIDENT.riskFuture, lasting: false },
];

const FIX_NOTE: Record<Fix['id'], string> = {
  replace: `${formatMoney(COSTS.preventive)} now · lasting fix`,
  clamp: `${formatMoney(150_000)} now · likely to break again within weeks`,
  wait: `Nothing now · about ${formatMoney(COSTS.failure)} when it bursts`,
};

/** Money now plus the chance it still fails times what a burst costs. Lower is better. */
const expectedCost = (f: Fix) => f.cost + (f.riskAfter / 100) * COSTS.failure;
const RANKED_FIXES = [...FIXES].sort((a, b) => expectedCost(a) - expectedCost(b));

const TRAFFIC = [
  { label: 'Close Khalifa Street for 4 hours', note: 'Blocks the ambulance route to the hospital', keepsAccess: false, hours: 4 },
  { label: 'Close one lane for 6 hours', note: 'Ambulances still get through', keepsAccess: true, hours: 6 },
  { label: 'Work at night with no closure', note: 'Finishes 9 hours later', keepsAccess: true, hours: 15 },
];

function whyNot(c: Crew, skill: Skill): string | null {
  if (!c.skills.includes(skill)) return skill === 'water-main' && c.skills.includes('water-service') ? "Can't handle a pipe this size" : 'Wrong skills for this job';
  return c.busy ?? null;
}

export function chooseCrew(skill: Skill) {
  const considered = CREWS.filter((c) => c.skills.some((s) => s.startsWith(skill.split('-')[0])));
  const free = considered.filter((c) => !whyNot(c, skill)).sort((a, b) => a.minutesAway - b.minutesAway);
  return { pick: free[0], considered };
}

/* ------------------------------------------------------------------ */
/* Limits                                                              */
/* ------------------------------------------------------------------ */

function planNeedsOk(policy: Policy, fix: Fix) {
  if (policy.autonomy === 'full') return false;
  if (policy.autonomy === 'ask') return true;
  return fix.cost > policy.spendLimit;
}

/** The pause the clock must hold until a person answers (if any). */
export function gateFor(policy: Policy): Gate | null {
  const best = RANKED_FIXES[0];
  if (!planNeedsOk(policy, best)) return null;
  const overLimit = policy.autonomy === 'limits';
  return {
    id: 'plan',
    t: T.plan,
    title: `${best.label} — ${formatMoney(best.cost)}`,
    why: overLimit
      ? `It's over your ${formatMoney(policy.spendLimit)} limit. The cheaper clamp would likely break again.`
      : 'You asked to approve every repair plan before the agents act.',
    items: ['Close 2 valves remotely', 'Send water around the break', 'Send Crew 07 with a new pipe', 'Close one lane for 6 hours'],
    declineLabel: 'Find a cheaper way',
  };
}

/* ------------------------------------------------------------------ */
/* The run: what each agent does and when                              */
/* ------------------------------------------------------------------ */

export const SIDE_JOB_T = T.predict + 1.5;

export function buildRun(policy: Policy, verdict: Verdict | undefined): AgentRun {
  const gate = gateFor(policy);
  const planHow: How = !gate ? 'auto' : verdict ?? 'waiting';
  const afterHow: How = !gate ? 'auto' : verdict === 'declined' ? 'declined' : 'approved';

  // declined → the best option that stays inside the limit (never "wait" when people are at risk)
  const fix =
    planHow === 'declined'
      ? (RANKED_FIXES.find((f) => f.id !== 'wait' && f.id !== RANKED_FIXES[0].id && (policy.autonomy !== 'limits' || f.cost <= policy.spendLimit)) ?? RANKED_FIXES[0])
      : RANKED_FIXES[0];

  const { pick: crew, considered } = chooseCrew('water-main');
  const sideCrew = chooseCrew('electric').pick;
  const traffic = TRAFFIC.filter((o) => o.keepsAccess).sort((a, b) => a.hours - b.hours)[0];
  const limitLabel = policy.autonomy === 'full' ? null : `Under your ${formatMoney(policy.spendLimit)} limit`;

  const planChecks: Check[] = [
    ...(limitLabel ? [{ label: limitLabel, ok: fix.cost <= policy.spendLimit }] : []),
    { label: 'Lasting fix', ok: fix.lasting },
    { label: 'Hospital access stays open', ok: true },
  ];

  const entries: AgentEntry[] = [
    { id: 'spot', t: T.anomaly, agent: 'watch', title: 'Spotted small changes near area B-12', detail: 'Pressure down 2.7% · ground getting wetter' },
    { id: 'link', t: T.pattern, agent: 'watch', title: 'Linked 6 sensors to one cause', detail: 'Each change alone looks harmless' },
    { id: 'leak', t: T.leak, agent: 'diagnose', title: 'Found a likely leak in the main water pipe', detail: `${INCIDENT.confidence}% sure · 2 m under ${INCIDENT.road}` },
    { id: 'when', t: T.predict, agent: 'diagnose', title: `It could burst in ${INCIDENT.failureWindow[0]}–${INCIDENT.failureWindow[1]} hours`, detail: 'Based on how fast the pressure is dropping' },
    {
      id: 'side',
      t: SIDE_JOB_T,
      agent: 'dispatch',
      title: `Sent ${sideCrew.name} to a streetlight fault in area C-13`,
      detail: `Small job, ${sideCrew.minutesAway} min away · Crew 07 kept free for the pipe`,
      how: 'auto',
      checks: [
        { label: 'Small job, under AED 20K', ok: true },
        { label: 'Crew 07 stays free', ok: true },
      ],
    },
    { id: 'who', t: T.impact, agent: 'plan', title: `${INCIDENT.population.toLocaleString('en-US')} people and a hospital rely on this pipe`, detail: 'Hospital 320 m away · school 480 m away' },
    {
      id: 'fix',
      t: T.plan,
      agent: 'plan',
      title: planHow === 'declined' ? `Changed plan: ${fix.short}` : `Chose to ${fix.short} now`,
      detail: planHow === 'waiting' ? 'Needs your OK before anyone moves' : fix.lasting ? 'Cheapest once you count the risk of a burst' : 'Stops the leak now · full repair waits for your OK',
      how: planHow,
      checks: planChecks,
      options: RANKED_FIXES.map((f) => ({ label: f.label, note: FIX_NOTE[f.id], chosen: f.id === fix.id })),
    },
    {
      id: 'road',
      t: T.plan + 1.4,
      agent: 'plan',
      title: traffic.label,
      detail: traffic.note,
      how: afterHow,
      checks: [
        { label: 'Hospital access stays open', ok: true },
        { label: 'Done well before it could burst', ok: true },
      ],
      options: TRAFFIC.map((o) => ({ label: o.label, note: o.note, chosen: o === traffic })),
    },
    {
      id: 'valves',
      t: T.repair,
      agent: 'patch',
      title: 'Closed 2 valves remotely',
      detail: 'Water to the damaged part is off',
      how: afterHow,
      checks: [
        { label: 'Can be undone', ok: true },
        { label: 'Takes seconds, no crew needed', ok: true },
      ],
    },
    {
      id: 'reroute',
      t: T.reroute,
      agent: 'patch',
      title: 'Sent water around the break',
      detail: 'No homes lost water',
      how: afterHow,
      checks: [
        { label: 'Can be undone', ok: true },
        { label: 'No homes lose water', ok: true },
      ],
    },
    {
      id: 'crew',
      t: T.dispatch,
      agent: 'dispatch',
      title: `Sent ${crew.name} with ${fix.id === 'clamp' ? 'a repair clamp' : 'a new pipe section'}`,
      detail: `${crew.people} people · arriving in ${crew.minutesAway} min`,
      how: afterHow,
      checks: [
        { label: 'Crew has the right skills', ok: true },
        { label: 'Arrives in under 6 hours', ok: true },
      ],
      options: considered.map((c) => ({ label: c.name, note: c === crew ? `${c.minutesAway} min away · has pipe welders` : (whyNot(c, 'water-main') ?? ''), chosen: c === crew })),
    },
    { id: 'onsite', t: T.arrive, agent: 'dispatch', title: `${crew.name} is on site`, detail: fix.id === 'clamp' ? 'Fitting the clamp' : 'Replacing the damaged section' },
    { id: 'test', t: T.restore, agent: 'verify', title: 'Pressure is back to normal', detail: 'No more signs of a leak' },
    fix.lasting
      ? { id: 'done', t: T.resolved, agent: 'verify', title: 'Fixed before it broke', detail: 'Lesson saved: check pipes like this every 6 months' }
      : { id: 'done', t: T.resolved, agent: 'verify', title: 'Leak stopped for now', detail: 'Full repair is waiting for your OK' },
  ];

  return { entries, gate: planHow === 'waiting' ? gate : null, fix, crew, sideCrew, riskAfter: fix.riskAfter, lasting: fix.lasting };
}

/* ------------------------------------------------------------------ */
/* Crew board                                                          */
/* ------------------------------------------------------------------ */

export type CrewTone = 'ready' | 'busy' | 'moving' | 'working' | 'done';

export function crewStatus(c: Crew, run: AgentRun, t: number, active: boolean): { label: string; tone: CrewTone } {
  if (c.busy) return { label: 'Busy · other repair', tone: 'busy' };
  if (active && c.id === run.crew.id && t >= T.dispatch) {
    if (t < T.arrive) {
      const p = Math.min(1, Math.max(0, (t - T.dispatch - 0.8) / (T.arrive - T.dispatch - 0.8)));
      return { label: `On the way · ${Math.max(1, Math.round(c.minutesAway * (1 - p)))} min`, tone: 'moving' };
    }
    if (t < T.resolved) return { label: 'Working on site', tone: 'working' };
    return { label: 'Done', tone: 'done' };
  }
  if (active && c.id === run.sideCrew.id && t >= SIDE_JOB_T) {
    if (t < SIDE_JOB_T + 5) return { label: `On the way · ${c.minutesAway} min`, tone: 'moving' };
    if (t < SIDE_JOB_T + 11) return { label: 'Fixing a streetlight', tone: 'working' };
    return { label: 'Done', tone: 'done' };
  }
  return { label: 'Ready', tone: 'ready' };
}
