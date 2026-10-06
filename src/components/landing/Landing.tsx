import { useRef, type ReactNode } from 'react';
import { ArrowRight, Hand, MessageCircleQuestion, Play, ShieldCheck, Zap } from 'lucide-react';
import { ThinkingOrb } from 'thinking-orbs';
import NavbarSectionTwo, { type MenuPanel, type NavItem } from '@/components/ui/navbar-section-2';
import { RailToc, type RailTocItem } from '@/components/ui/rail-toc';
import { PioneerMark } from '@/components/ui/PioneerMark';
import { AGENTS } from '@/agents/team';
import { AD, MAP_CREDIT } from '@/data/abudhabi';
import { COSTS, formatMoney } from '@/data/incident';
import './landing.css';

const NAV: NavItem[] = [
  { label: 'Product', panelId: 'product' },
  { label: 'How it works', panelId: 'how' },
  { label: 'Agents', href: '#agents' },
  { label: 'Real map', href: '#map' },
  { label: 'Safety', href: '#safety' },
];

const PANELS: MenuPanel[] = [
  {
    id: 'product',
    layout: 'feature',
    items: [
      { title: 'Live city twin', href: '#twin', mediaType: 'image', imageSrc: '/landing/twin.jpg', imageAlt: 'The 3D twin of downtown Abu Dhabi' },
      { title: 'Crews on real roads', href: '#demo', mediaType: 'image', imageSrc: '/landing/drive.jpg', imageAlt: 'A repair crew driving through downtown' },
      { title: 'Ask why', description: 'The agents explain every choice in plain words.', href: '#safety' },
      { title: 'Real Abu Dhabi', description: 'Built from the real streets and buildings.', href: '#map' },
    ],
  },
  {
    id: 'how',
    items: [
      { title: 'Spot', description: 'Sensors notice small changes under the street before anyone else.', href: '#how' },
      { title: 'Plan', description: 'Six AI agents compare the fixes and pick the safest one.', href: '#how' },
      { title: 'Fix', description: 'The right crew drives over and fixes it. Pioneer checks it worked.', href: '#how' },
    ],
  },
];

const TOC: RailTocItem[] = [
  { id: 'how', label: 'How it works' },
  { id: 'agents', label: 'The agents' },
  { id: 'map', label: 'Real Abu Dhabi' },
  { id: 'safety', label: 'You stay in charge' },
  { id: 'start', label: 'Try it' },
];

const STEPS = [
  { n: '01', title: 'Spot', text: 'Sensors under the streets notice small changes before anyone else does.' },
  { n: '02', title: 'Plan', text: 'Six AI agents compare the fixes and pick the safest one.' },
  { n: '03', title: 'Fix', text: 'The right crew drives over and fixes it. Pioneer checks that it worked.' },
];

const MODES = [
  { icon: Zap, title: 'Full auto', text: 'The agents handle everything and tell you after.' },
  { icon: ShieldCheck, title: 'With limits', text: 'They act alone up to your spend limit, then ask.' },
  { icon: Hand, title: 'Ask me', text: 'They plan. You approve every step.' },
];

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <PioneerMark size={30} />
      <span className="font-display text-[19px] font-medium tracking-[-0.01em]">Pioneer</span>
    </span>
  );
}

function Section({ id, title, lead, children }: { id: string; title: string; lead: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-10" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="font-display text-[34px] font-medium leading-[1.05] tracking-[-0.02em] md:text-[44px]">
        {title}
      </h2>
      <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-muted-foreground">{lead}</p>
      <div className="mt-10">{children}</div>
    </section>
  );
}

function Shot({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="overflow-hidden rounded-[22px] border border-border bg-panel shadow-[0_30px_70px_-40px_rgba(30,36,60,0.5)]">
      <img src={src} alt={alt} loading="lazy" className="block h-auto w-full" />
      {caption && <figcaption className="border-t border-border px-5 py-3 text-sm text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}

const pill = 'inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function Landing() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div ref={scroller} className="landing h-dvh overflow-y-auto bg-background text-foreground">
      <NavbarSectionTwo
        logo={<Logo />}
        logoLabel="Pioneer home"
        items={NAV}
        panels={PANELS}
        cta={{ label: 'Open the twin', href: '#twin' }}
        ctaClassName="bg-black hover:bg-zinc-800"
        className="min-h-0 bg-background pb-0"
      >
        <section className="relative z-10 mt-12 w-full max-w-[1080px] text-center lg:mt-20">
          <a href="#map" className="group mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-panel/80 py-1 pl-1 pr-3 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <span className="rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-primary-foreground">Live demo</span>
            Real Abu Dhabi streets
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </a>
          <h1 className="font-display mx-auto max-w-3xl text-[46px] font-medium leading-[1] tracking-[-0.035em] md:text-[80px]">
            Fix the city
            <br />
            before it breaks
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-muted-foreground md:text-[19px]">
            AI agents watch the pipes under the streets, plan the repair and send the right crew. You set the limits.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a href="#twin" className={`${pill} bg-foreground text-primary-foreground hover:bg-zinc-800`}>
              Open the live twin
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
            <a href="#demo" className={`${pill} border border-border bg-panel/70 text-foreground hover:bg-panel`}>
              <Play className="size-4" aria-hidden="true" />
              Watch the 1-minute demo
            </a>
          </div>
          <figure className="relative mx-auto mt-14 overflow-hidden rounded-t-[26px] border border-b-0 border-border bg-panel shadow-[0_50px_100px_-50px_rgba(30,36,60,0.55)]">
            <img src="/landing/twin.jpg" alt="Pioneer's 3D twin of downtown Abu Dhabi: sensors on the left, the city in the middle, the AI agents on the right" width={1600} height={1000} className="block h-auto w-full" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/70 to-transparent" />
          </figure>
        </section>
      </NavbarSectionTwo>

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-14 px-6 pb-24 lg:grid-cols-[172px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-12 pt-20">
            <RailToc items={TOC} containerRef={scroller} offset={48} title="On this page" />
          </div>
        </aside>

        <main className="flex min-w-0 flex-col gap-32 pt-20">
          <Section id="how" title="How it works" lead="Three steps. The agents do the busy work. People make the big calls.">
            <div className="grid gap-4 md:grid-cols-3">
              {STEPS.map((s) => (
                <article key={s.n} className="rounded-[22px] border border-border bg-panel p-6">
                  <span className="font-mono text-sm text-muted-foreground">{s.n}</span>
                  <h3 className="font-display mt-8 text-[26px] font-medium tracking-[-0.01em]">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{s.text}</p>
                </article>
              ))}
            </div>
            <div className="mt-6">
              <Shot src="/landing/drive.jpg" alt="Crew 07 driving through downtown traffic to the leak" caption="Crew 07 drives real streets to the leak, past everyday traffic." />
            </div>
          </Section>

          <Section id="agents" title="Six agents, one team" lead="Each agent has one job and hands off to the next.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {AGENTS.map((a) => (
                <article key={a.id} className="flex items-center gap-4 rounded-[18px] border border-border bg-panel px-5 py-4">
                  <ThinkingOrb state={a.orb} size={32} theme="light" aria-hidden="true" />
                  <div>
                    <h3 className="text-[16px] font-semibold">{a.name}</h3>
                    <p className="text-sm text-muted-foreground">{a.job}</p>
                  </div>
                </article>
              ))}
            </div>
          </Section>

          <Section id="map" title="Real Abu Dhabi" lead="Every street, tower and palm on the Corniche comes from the real map of Al Danah.">
            <div className="grid gap-4 md:grid-cols-2">
              <Shot src="/landing/district.jpg" alt="Map of Al Danah with Khalifa Street highlighted" caption="Al Danah, with Khalifa Street where the demo leak happens." />
              <Shot src="/landing/xray.jpg" alt="Water, power, telecom, cooling and sewage networks under the real streets" caption="Five networks under the streets: water, power, telecom, cooling, sewage." />
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                [AD.buildings.length.toLocaleString('en-US'), 'real buildings'],
                [AD.roads.length.toLocaleString('en-US'), 'real streets'],
                [AD.palms.length.toLocaleString('en-US'), 'palm trees'],
                ['5', 'networks underneath'],
              ].map(([n, label]) => (
                <div key={label} className="rounded-[18px] border border-border bg-panel px-5 py-4">
                  <dt className="sr-only">{label}</dt>
                  <dd className="font-display text-[32px] font-medium tracking-[-0.02em]">{n}</dd>
                  <dd className="text-sm text-muted-foreground">{label}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-muted-foreground">Streets and buildings are real. The pipes, sensors, crews and the leak are made up for the demo.</p>
          </Section>

          <Section id="safety" title="You stay in charge" lead="You choose how much the agents can do alone. Big decisions wait for a person.">
            <div className="grid gap-4 md:grid-cols-3">
              {MODES.map(({ icon: Icon, title, text }) => (
                <article key={title} className="rounded-[22px] border border-border bg-panel p-6">
                  <Icon className="size-5" aria-hidden="true" />
                  <h3 className="mt-6 text-[18px] font-semibold">{title}</h3>
                  <p className="mt-1.5 leading-relaxed text-muted-foreground">{text}</p>
                </article>
              ))}
            </div>
            <div className="mt-6 grid items-start gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <Shot src="/landing/approval.jpg" alt="The agents pausing for approval because the repair is over the spend limit" caption="Over your limit? The agents stop and ask." />
              <article className="rounded-[22px] border border-border bg-panel p-6">
                <MessageCircleQuestion className="size-5" aria-hidden="true" />
                <h3 className="mt-6 text-[18px] font-semibold">Ask them why</h3>
                <p className="mt-1.5 leading-relaxed text-muted-foreground">Type a question like “Why Crew 07?” and get a short answer, in English or Arabic, built only from what the agents actually did.</p>
                <p className="mt-4 text-sm text-muted-foreground">Answers by Qwen. It can explain, never approve.</p>
              </article>
            </div>
          </Section>

          <section id="start" aria-labelledby="start-title" className="scroll-mt-10 overflow-hidden rounded-[28px] bg-instrument px-8 py-14 text-instrument-ink md:px-14">
            <h2 id="start-title" className="font-display max-w-lg text-[36px] font-medium leading-[1.05] tracking-[-0.02em] md:text-[48px]">
              See it fix a leak in one minute
            </h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-instrument-ink-2">
              A pipe under Khalifa Street starts to fail. Fixing it early costs {formatMoney(COSTS.preventive)}. Waiting costs {formatMoney(COSTS.failure)}.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#demo" className={`${pill} bg-instrument-ink text-instrument hover:bg-white`}>
                <Play className="size-4" aria-hidden="true" />
                Watch the demo
              </a>
              <a href="#twin" className={`${pill} border border-white/20 text-instrument-ink hover:bg-instrument-row`}>
                Explore the twin
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>
          </section>
        </main>
      </div>

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-2 text-foreground">
            <PioneerMark size={18} />
            Pioneer
          </span>
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="hover:text-foreground">
            {MAP_CREDIT}
          </a>
        </div>
      </footer>
    </div>
  );
}
