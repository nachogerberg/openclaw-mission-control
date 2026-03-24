import { overviewContent, questionnaireContent, scorecardContent } from '@/lib/insurance-tech-stack-audit-content';

const docs = [
  {
    id: 'overview',
    title: 'Master Audit Pack',
    subtitle: 'Scope, framework, questionnaire structure, scoring logic, and recommendation model.',
    badge: 'Overview',
    content: overviewContent,
  },
  {
    id: 'questionnaire',
    title: 'Working Questionnaire',
    subtitle: 'Discovery prompts to map the current stack, operating gaps, and decision bottlenecks.',
    badge: 'Questionnaire',
    content: questionnaireContent,
  },
  {
    id: 'scorecard',
    title: 'Evaluation Scorecard',
    subtitle: 'Weighted categories, scoring interpretation, and final recommendation structure.',
    badge: 'Scorecard',
    content: scorecardContent,
  },
];

function renderMarkdownLike(content: string) {
  return content.split('\n').map((line, index) => {
    const key = `${index}-${line.slice(0, 20)}`;

    if (!line.trim()) return <div key={key} className="h-3" />;

    if (line.startsWith('# ')) {
      return (
        <h1 key={key} className="text-3xl md:text-4xl font-semibold tracking-tight text-white mt-2 mb-5">
          {line.replace(/^#\s+/, '')}
        </h1>
      );
    }

    if (line.startsWith('## ')) {
      return (
        <h2 key={key} className="text-xl md:text-2xl font-semibold text-white mt-8 mb-3">
          {line.replace(/^##\s+/, '')}
        </h2>
      );
    }

    if (line.startsWith('### ')) {
      return (
        <h3 key={key} className="text-base md:text-lg font-semibold text-[#9cc9ff] mt-5 mb-2 uppercase tracking-[0.08em]">
          {line.replace(/^###\s+/, '')}
        </h3>
      );
    }

    if (line.startsWith('- ')) {
      return (
        <div key={key} className="flex gap-3 mb-2 text-sm md:text-[15px] leading-7 text-slate-300">
          <span className="mt-[11px] h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
          <span>{line.replace(/^-\s+/, '')}</span>
        </div>
      );
    }

    if (/^\d+\.\s+/.test(line)) {
      const [, number, text] = line.match(/^(\d+)\.\s+(.*)$/) || [];
      return (
        <div key={key} className="flex gap-3 mb-2 text-sm md:text-[15px] leading-7 text-slate-300">
          <span className="shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xs text-slate-200">
            {number}
          </span>
          <span>{text}</span>
        </div>
      );
    }

    if (line.trim() === '---') {
      return <div key={key} className="my-6 border-t border-white/10" />;
    }

    return (
      <p key={key} className="mb-3 text-sm md:text-[15px] leading-7 text-slate-300">
        {line}
      </p>
    );
  });
}

export default function InsuranceTechStackAuditPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#142338_0%,#0b1220_35%,#060b14_100%)] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-14">
        <div className="mb-10 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-4 inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">
            InsureX · Insurance Tech Stack Audit
          </div>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
            Live audit workspace for the 3 core strategy documents
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            Clean, readable, executive-friendly view of the audit pack: the master framework, discovery questionnaire, and weighted scorecard.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Documents</div>
              <div className="mt-2 text-3xl font-semibold">3</div>
              <div className="mt-1 text-sm text-slate-400">Overview, questionnaire, scorecard</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Format</div>
              <div className="mt-2 text-3xl font-semibold">Markdown → UI</div>
              <div className="mt-1 text-sm text-slate-400">Structured for fast review and iteration</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Goal</div>
              <div className="mt-2 text-3xl font-semibold">Decision clarity</div>
              <div className="mt-1 text-sm text-slate-400">Expose gaps, rank tools, guide stack upgrades</div>
            </div>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          {docs.map((doc) => (
            <a
              key={doc.id}
              href={`#${doc.id}`}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-white"
            >
              {doc.badge}
            </a>
          ))}
        </div>

        <div className="grid gap-6">
          {docs.map((doc) => (
            <section
              id={doc.id}
              key={doc.id}
              className="rounded-3xl border border-white/10 bg-slate-950/55 p-6 shadow-2xl backdrop-blur md:p-8"
            >
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">
                    {doc.badge}
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">{doc.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400 md:text-base">{doc.subtitle}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-[#09101b] p-5 md:p-7">
                {renderMarkdownLike(doc.content)}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
