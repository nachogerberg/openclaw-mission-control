import { akClaudeCodeArchitecture, akDocLinks, akMeta, akSections } from '@/lib/astonKnightsData';

export default function AstonKnightsPage() {
  return (
    <main className="min-h-screen bg-mc-bg text-mc-text">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10">
        <section className="rounded-2xl border border-mc-border bg-mc-bg-secondary p-6 shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.24em] text-mc-text-secondary">Hermes Atlas • Aston Knights Strategy</p>
              <h1 className="text-3xl font-semibold text-white">{akMeta.title}</h1>
              <p className="max-w-4xl text-sm leading-6 text-mc-text-secondary">{akMeta.subtitle}. This page makes the current strategy accessible online and includes the mobile game architecture brief you can hand to Claude Code.</p>
            </div>
            <div className="rounded-xl border border-mc-border bg-mc-bg p-4 text-sm text-mc-text-secondary">
              <div>Updated: {akMeta.updatedAt}</div>
              <div>Route: {akMeta.liveUrlPath}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            {akSections.map((section) => (
              <section key={section.id} className="rounded-2xl border border-mc-border bg-mc-bg-secondary p-6">
                <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-mc-text-secondary">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3 rounded-xl border border-mc-border bg-mc-bg px-4 py-3">
                      <span className="mt-1 text-mc-accent">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-mc-border bg-mc-bg-secondary p-6">
              <h2 className="text-xl font-semibold text-white">Accessible documents</h2>
              <p className="mt-2 text-sm text-mc-text-secondary">These are the current source documents Atlas created locally. If you want, I can also convert any of them into public pages individually.</p>
              <div className="mt-4 space-y-3">
                {akDocLinks.map((doc) => (
                  <div key={doc.path} className="rounded-xl border border-mc-border bg-mc-bg px-4 py-3">
                    <div className="font-medium text-white">{doc.title}</div>
                    <div className="mt-1 text-xs break-all text-mc-text-secondary">{doc.path}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-mc-border bg-mc-bg-secondary p-6">
              <h2 className="text-xl font-semibold text-white">Claude Code game architecture brief</h2>
              <p className="mt-3 text-sm leading-6 text-mc-text-secondary">{akClaudeCodeArchitecture.vision}</p>

              <div className="mt-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-mc-text-secondary">Recommended stack</h3>
                <ul className="mt-3 space-y-2 text-sm text-mc-text">
                  {akClaudeCodeArchitecture.stack.map((item) => (
                    <li key={item} className="flex gap-2"><span className="text-mc-accent">→</span><span>{item}</span></li>
                  ))}
                </ul>
              </div>

              <div className="mt-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-mc-text-secondary">Core systems</h3>
                <ul className="mt-3 space-y-2 text-sm text-mc-text">
                  {akClaudeCodeArchitecture.systems.map((item) => (
                    <li key={item} className="flex gap-2"><span className="text-mc-accent">→</span><span>{item}</span></li>
                  ))}
                </ul>
              </div>

              <div className="mt-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-mc-text-secondary">Pilot loop</h3>
                <ol className="mt-3 space-y-2 text-sm text-mc-text">
                  {akClaudeCodeArchitecture.loop.map((item, index) => (
                    <li key={item} className="flex gap-3"><span className="text-mc-accent">{index + 1}.</span><span>{item}</span></li>
                  ))}
                </ol>
              </div>

              <div className="mt-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-mc-text-secondary">AI features</h3>
                <ul className="mt-3 space-y-2 text-sm text-mc-text">
                  {akClaudeCodeArchitecture.aiFeatures.map((item) => (
                    <li key={item} className="flex gap-2"><span className="text-mc-accent">✦</span><span>{item}</span></li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {akClaudeCodeArchitecture.pilotRule}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
