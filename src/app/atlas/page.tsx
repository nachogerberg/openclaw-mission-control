import { agents, atlasAuditTimestamp, directivePreviews, fleetFlags, type AgentSnapshot } from '@/lib/atlasRevenueData';

const tierColors: Record<AgentSnapshot['tier'], string> = {
  'Tier 1 Direct Revenue': 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  'Tier 2 Revenue Enablement': 'text-sky-300 border-sky-500/40 bg-sky-500/10',
  'Tier 3 Support': 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  'Restricted Research': 'text-fuchsia-300 border-fuchsia-500/40 bg-fuchsia-500/10',
};

function totalTasks(agent: AgentSnapshot) {
  return agent.taskCounts.open + agent.taskCounts.inProgress + agent.taskCounts.blocked + agent.taskCounts.done;
}

function segmentWidth(value: number, total: number) {
  if (total === 0) return '0%';
  return `${Math.max((value / total) * 100, value > 0 ? 4 : 0)}%`;
}

export default function AtlasRevenuePage() {
  const tier1 = agents.filter((agent) => agent.tier === 'Tier 1 Direct Revenue').length;
  const activeWork = agents.reduce((sum, agent) => sum + agent.taskCounts.open + agent.taskCounts.inProgress + agent.taskCounts.blocked, 0);
  const completed = agents.reduce((sum, agent) => sum + agent.taskCounts.done, 0);

  return (
    <main className="min-h-screen bg-mc-bg text-mc-text">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10">
        <section className="rounded-2xl border border-mc-border bg-mc-bg-secondary p-6 shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.24em] text-mc-text-secondary">Hermes Atlas • Live Revenue Command</p>
              <h1 className="text-3xl font-semibold text-white">Agent scorecards and revenue charters</h1>
              <p className="max-w-3xl text-sm leading-6 text-mc-text-secondary">
                This page is the online snapshot of the Atlas fleet audit: agent roles, money-making lane, KPI system,
                and live directives now assigned across the BAMC-side fleet.
              </p>
            </div>
            <div className="rounded-xl border border-mc-border bg-mc-bg p-4 text-sm text-mc-text-secondary">
              <div>Audit snapshot: {atlasAuditTimestamp}</div>
              <div>Live route: /atlas</div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <MetricCard label="Agents with live charters" value={`${agents.length}`} tone="sky" />
            <MetricCard label="Tier 1 direct revenue agents" value={`${tier1}`} tone="emerald" />
            <MetricCard label="Completed tasks in snapshot" value={`${completed}`} tone="violet" />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <MetricCard label="Open / in-progress / blocked work" value={`${activeWork}`} tone="amber" />
            <div className="rounded-2xl border border-mc-border bg-mc-bg p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-mc-text-secondary">Fleet flags</div>
              <ul className="mt-3 space-y-2 text-sm text-mc-text">
                {fleetFlags.map((flag) => (
                  <li key={flag} className="rounded-lg border border-mc-border bg-mc-bg-secondary px-3 py-2">{flag}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-mc-border bg-mc-bg-secondary p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Fleet scorecards</h2>
                <p className="mt-1 text-sm text-mc-text-secondary">Each card shows the monetization lane, KPI logic, and current workload snapshot.</p>
              </div>
            </div>
            <div className="grid gap-4">
              {agents.map((agent) => {
                const total = totalTasks(agent);
                return (
                  <article key={agent.key} className="rounded-2xl border border-mc-border bg-mc-bg p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3 xl:max-w-2xl">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                          <span className={`rounded-full border px-3 py-1 text-xs ${tierColors[agent.tier]}`}>{agent.tier}</span>
                        </div>
                        <p className="text-sm text-mc-text"><span className="text-mc-text-secondary">Purpose:</span> {agent.purpose}</p>
                        <p className="text-sm text-mc-text"><span className="text-mc-text-secondary">Lane:</span> {agent.lane}</p>
                        <p className="text-sm leading-6 text-mc-text-secondary">{agent.statusNote}</p>
                        <div>
                          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-mc-text-secondary">Revenue activities</div>
                          <div className="flex flex-wrap gap-2">
                            {agent.revenueActivities.map((item) => (
                              <span key={item} className="rounded-full border border-mc-border bg-mc-bg-secondary px-3 py-1 text-xs text-mc-text">{item}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="min-w-[280px] rounded-2xl border border-mc-border bg-mc-bg-secondary p-4">
                        <div className="text-xs uppercase tracking-[0.2em] text-mc-text-secondary">Task load snapshot</div>
                        <div className="mt-3 h-3 overflow-hidden rounded-full bg-mc-border">
                          <div className="flex h-full w-full">
                            <div className="bg-sky-500" style={{ width: segmentWidth(agent.taskCounts.open, total) }} />
                            <div className="bg-amber-400" style={{ width: segmentWidth(agent.taskCounts.inProgress, total) }} />
                            <div className="bg-rose-500" style={{ width: segmentWidth(agent.taskCounts.blocked, total) }} />
                            <div className="bg-emerald-500" style={{ width: segmentWidth(agent.taskCounts.done, total) }} />
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-mc-text-secondary">
                          <Legend label="Open" value={agent.taskCounts.open} color="bg-sky-500" />
                          <Legend label="In progress" value={agent.taskCounts.inProgress} color="bg-amber-400" />
                          <Legend label="Blocked" value={agent.taskCounts.blocked} color="bg-rose-500" />
                          <Legend label="Done" value={agent.taskCounts.done} color="bg-emerald-500" />
                        </div>
                        <div className="mt-4 border-t border-mc-border pt-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-mc-text-secondary">Weekly KPIs</div>
                          <ul className="mt-2 space-y-2 text-sm text-mc-text">
                            {agent.kpis.map((kpi) => (
                              <li key={kpi} className="flex gap-2"><span className="text-mc-accent">•</span><span>{kpi}</span></li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-mc-border bg-mc-bg-secondary p-6">
              <h2 className="text-xl font-semibold text-white">Live directive previews</h2>
              <p className="mt-1 text-sm text-mc-text-secondary">Short preview of the operating instructions Atlas has already pushed live.</p>
              <div className="mt-5 space-y-4">
                {agents.map((agent) => (
                  <div key={agent.key} className="rounded-2xl border border-mc-border bg-mc-bg p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-medium text-white">{agent.name}</h3>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] ${tierColors[agent.tier]}`}>LIVE</span>
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-mc-text-secondary">
                      {directivePreviews[agent.key].map((line) => (
                        <li key={line} className="flex gap-2"><span className="text-mc-accent">→</span><span>{line}</span></li>
                      ))}
                    </ul>
                    <div className="mt-3 rounded-xl border border-mc-border bg-mc-bg-secondary px-3 py-2 text-xs text-mc-text-secondary">
                      Source path: {agent.directivePath}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-mc-border bg-mc-bg-secondary p-6">
              <h2 className="text-xl font-semibold text-white">Revenue architecture</h2>
              <div className="mt-4 space-y-3 text-sm text-mc-text-secondary">
                <p><span className="text-white">Command:</span> Soren allocates and unblocks.</p>
                <p><span className="text-white">Conversion:</span> Drake owns pipeline leakage and follow-up speed.</p>
                <p><span className="text-white">Truth layer:</span> Sophie turns data reliability into operator action.</p>
                <p><span className="text-white">Demand:</span> Vanta creates, ranks, and tests new offer opportunities.</p>
                <p><span className="text-white">Risk / support:</span> Julian handles compliance review, Ryker protects founder output, Marcus builds research-first trading architecture.</p>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'sky' | 'emerald' | 'violet' | 'amber' }) {
  const tones = {
    sky: 'from-sky-500/20 to-sky-400/5 text-sky-300 border-sky-500/30',
    emerald: 'from-emerald-500/20 to-emerald-400/5 text-emerald-300 border-emerald-500/30',
    violet: 'from-violet-500/20 to-violet-400/5 text-violet-300 border-violet-500/30',
    amber: 'from-amber-500/20 to-amber-400/5 text-amber-300 border-amber-500/30',
  } as const;

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 ${tones[tone]}`}>
      <div className="text-xs uppercase tracking-[0.22em] text-mc-text-secondary">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
    </div>
  );
}

function Legend({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-mc-border bg-mc-bg px-3 py-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span>{label}</span>
      <span className="ml-auto text-white">{value}</span>
    </div>
  );
}
