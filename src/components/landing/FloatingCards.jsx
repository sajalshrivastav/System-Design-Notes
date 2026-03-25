import { Cpu, Zap, ShieldCheck } from 'lucide-react';

const CARDS = [
  { cls: 'f1', iconCls: '',       Icon: Cpu,        title: 'Co-Pilot',  sub: 'Node Architecture' },
  { cls: 'f2', iconCls: 'yellow', Icon: Zap,        title: 'Automate',  sub: 'CI/CD Pipelines'   },
  { cls: 'f3', iconCls: 'green',  Icon: ShieldCheck, title: 'Secure',   sub: 'OAuth & JWT'        },
];

/** Decorative floating glassmorphic cards on the hero background. */
export default function FloatingCards() {
  return (
    <div className="floating-elements">
      {CARDS.map(({ cls, iconCls, Icon, title, sub }) => (
        <div key={cls} className={`f-card ${cls}`}>
          <div className={`f-icon-wrap ${iconCls}`}>
            <Icon size={15} />
          </div>
          <div className="f-text">
            <strong>{title}</strong>
            <span>{sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
