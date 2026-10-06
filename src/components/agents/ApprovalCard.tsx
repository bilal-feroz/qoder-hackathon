import { MetalFx } from 'metal-fx';
import { ThinkingOrb } from 'thinking-orbs';
import { useTwinStore } from '../../store/useTwinStore';
import type { Gate } from '../../agents/brain';

/** The one dark card and the one metal button: the moment a person decides. */
export function ApprovalCard({ gate, still }: { gate: Gate; still: boolean }) {
  const decide = useTwinStore((s) => s.decide);
  const setAutonomy = useTwinStore((s) => s.setAutonomy);
  return (
    <section className="approve-card" role="alertdialog" aria-labelledby="approve-title" aria-describedby="approve-why">
      <div className="approve-kicker">
        <ThinkingOrb state="solving" size={20} theme="dark" paused={still} aria-hidden="true" />
        <span>Plan needs your OK</span>
      </div>
      <h3 id="approve-title">{gate.title}</h3>
      <p id="approve-why" className="approve-why">
        {gate.why}
      </p>
      <ul className="approve-items">
        {gate.items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
      <div className="approve-actions">
        <MetalFx preset="silver" theme="dark" strength={0.9} paused={still}>
          <button className="approve-btn" onClick={() => decide('approved')} autoFocus>
            Approve
          </button>
        </MetalFx>
        <button className="approve-alt" onClick={() => decide('declined')}>
          {gate.declineLabel}
        </button>
      </div>
      <button className="approve-note" onClick={() => setAutonomy('full')}>
        Paused until you answer · or let the agents decide
      </button>
    </section>
  );
}
