export const overviewContent = `# Insurance Tech Stack Audit — Master Audit Pack

## 1) Scope Assumptions (A + B)
Since you said to move forward with all A/B/C, this audit assumes full coverage across the operating stack.

### Core Revenue Stack
- Lead capture and forms
- CRM and pipeline management
- Dialer / calling platform
- SMS platform
- Email platform
- Appointment booking and reminders
- Call tracking and attribution
- Automation / workflow orchestration
- Reporting / dashboards

### Agency / Servicing Stack
- Quoting tools / rater
- Agency management system (AMS)
- Policy admin / carrier workflow touchpoints
- E-sign / document collection
- Payments / premium financing touchpoints
- Customer support / ticketing
- Renewals / retention workflows
- Compliance / recording / consent controls

### Data / Growth / Ops Layer
- Source tracking and UTMs
- Sales rep scorecards
- CAC / CPL / CPA visibility
- Lead-to-bind conversion visibility
- Agent performance tracking
- LTV / retention / renewal reporting
- Data warehouse / BI / exports
- Integration quality and failure points

## 2) Output Format (C)
Delivered in Markdown for portability, clarity, and versionability.

## 3) Deliverables in This Pack
1. Executive Audit Questionnaire
2. Scoring Rubric + Evaluation Framework
3. Vendor / Tool Inventory Table
4. Gap Analysis Structure
5. Recommendation Structure

---

# Document 1 — Executive Audit Questionnaire

## Objective
Map the current insurance operating stack, identify inefficiencies, expose integration gaps, and determine the highest-leverage upgrades for InsureX.

## Section A — Business Model + Channel Context
1. What lines of insurance are being sold today?
2. Which lines are strategic priorities over the next 12 months?
3. Is the business primarily inbound, outbound, referral-driven, partner-driven, paid media-driven, or hybrid?
4. What is the current monthly lead volume by source?
5. What is the target monthly submitted apps / quotes / binds?
6. What are the current bottlenecks in growth?

## Section B — Lead Capture + Attribution
1. Where do leads currently come from?
2. What tools collect inbound leads?
3. Are forms routed into the CRM instantly?
4. Are UTMs / campaign IDs captured and stored?
5. Is call tracking in place by source / campaign / landing page?
6. Can the team tie spend to booked appointments, quoted opportunities, submitted apps, bound policies, and retained customers?
7. Where does attribution break today?

## Section C — CRM + Pipeline
1. What CRM is currently used?
2. Are there separate pipelines by product, agent, or source?
3. What are the current pipeline stages?
4. Are stages standardized or rep-specific?
5. What fields are required at each stage?
6. Which actions are manual that should be automated?
7. Are there duplicate records across systems?
8. Is ownership assignment automatic?
9. Are lead reactivation workflows in place?
10. Is there a clean distinction between raw lead, contacted lead, qualified prospect, quoted prospect, submitted application, issued/bound policy, and retained customer?

## Section D — Dialer / SMS / Email
1. What dialer is in use today?
2. Is it native to the CRM or standalone?
3. What SMS provider is in use?
4. What email provider is in use?
5. Are all touchpoints logged centrally?
6. Are calls recorded?
7. Is dispositioning standardized?
8. What is the average speed-to-lead?
9. Are there power dialers / parallel dialers / preview dialers involved?
10. Are rep-level connect, contact, and appointment metrics visible?
11. Are no-show and nurture sequences automated across SMS + email?
12. Are opt-out / consent workflows enforced reliably?

## Section E — Quoting + Policy + AMS
1. What quoting tool(s) are used?
2. What AMS / policy system is used?
3. Is quoting done inside the CRM, inside an AMS, or in carrier portals?
4. How many systems must an agent touch to go from lead to issued policy?
5. Where is data re-entered manually?
6. What causes the most quoting friction?
7. Is application status visible to sales and ops in one place?
8. Are renewal dates and policy details synced back to the CRM?
9. Are cross-sell / upsell opportunities surfaced automatically?
10. Is document collection and signature automated?

## Section F — Automation + Integrations
1. What automation platform is used?
2. What systems are integrated today?
3. Which integrations are native vs custom vs manual?
4. Where do automations fail most often?
5. Are there webhooks / APIs in use?
6. Is there alerting when critical automations fail?
7. Are there shadow processes in spreadsheets, Slack, or email inboxes?
8. Are there mission-critical workflows dependent on one person?

## Section G — Reporting + Decision Support
1. What dashboards exist today?
2. Who owns reporting?
3. Which KPIs are visible daily?
4. Which KPIs matter but are currently invisible?
5. Can leadership see performance by source, campaign, rep, team, product line, carrier, close rate, issued premium, and retention / renewal?
6. Is revenue reporting lagging behind operations?
7. Are dashboards trusted by the team?
8. Where do numbers conflict between tools?

## Section H — Team Workflow
1. How many agents / setters / closers / support staff use the system?
2. What does a new lead workflow look like in the first 15 minutes?
3. What does follow-up look like over 30 days?
4. Who handles quoting?
5. Who handles policy service / retention?
6. Where do handoffs break?
7. What tasks are repetitive and low-leverage?
8. What workarounds has the team invented?

## Section I — Compliance + Risk
1. Are consent and opt-in records stored?
2. Are call recordings stored compliantly?
3. Are disclosures standardized?
4. Are there audit logs?
5. Are permissions role-based?
6. Are there risks around TCPA, CAN-SPAM, recording laws, or carrier compliance?
7. Are customer documents stored securely?

## Section J — Strategic Goals
1. What does the business need from the stack in the next 90 days?
2. What does it need in the next 12 months?
3. Is the priority more lead volume, better conversion, better rep accountability, faster quoting, better retention, cleaner attribution, lower software cost, or easier management visibility?
4. What absolutely cannot break during a transition?
5. What would make the stack feel 10x better operationally?

---

# Document 2 — Scoring Rubric + Evaluation Framework

## Scoring Method
Use a 1–5 scale for each category:
- 1 = Broken / materially limiting growth
- 2 = Weak / inconsistent / high-friction
- 3 = Functional but mediocre
- 4 = Strong / mostly scalable
- 5 = Best-in-class / highly scalable / operator-friendly

## Weighted Categories
- Lead capture + routing — 10%
- Attribution + call tracking — 10%
- CRM + pipeline design — 15%
- Dialer / SMS / email execution — 10%
- Quoting + AMS workflow — 15%
- Automation + integrations — 10%
- Reporting + dashboards — 10%
- Team usability + adoption — 8%
- Compliance + controls — 7%
- Strategic fit / future scale — 5%

## Final Score Bands
- 85–100 = Strong scale-ready stack
- 70–84 = Good stack with meaningful upgrade opportunities
- 55–69 = Functional but constraining growth
- 40–54 = Fragmented stack requiring intervention
- <40 = Serious operational handicap
`;

export const questionnaireContent = `# InsureX Insurance Tech Stack Audit — Working Questionnaire

Use this document during discovery calls, async review, or internal stack mapping.

## Company Snapshot
- Business name
- Primary contact
- Date
- Auditor
- Product lines
- Monthly lead volume
- Monthly quotes
- Monthly binds
- Team size

## 1. Revenue Engine
- Main acquisition channels
- Highest-converting channels
- Lowest-quality channels
- Current cost per lead by channel
- Current close rate by channel
- Current retention / persistency by line

## 2. Lead Intake
- What tools capture leads today?
- How are inbound calls handled?
- Are web leads enriched or scored?
- How are leads assigned?
- Is speed-to-lead measured?
- Where do duplicate leads appear?

## 3. CRM / Pipeline
- CRM platform
- Pipeline stages
- Required fields
- Automation triggers
- Reassignment / round-robin rules
- Re-engagement workflows
- Main CRM pain points

## 4. Dialer / Messaging
- Dialer
- SMS platform
- Email platform
- Are messages centralized?
- Are calls recorded and searchable?
- Are dispositions standardized?
- Can management see rep activity quality?

## 5. Quoting / AMS / Policy Flow
- Quoting tools
- AMS / policy system
- Carrier portals used
- Number of systems used per sale
- Main quoting delays
- Main servicing delays
- Renewal management process

## 6. Automation / Integrations
- Core integrations
- Native vs custom
- Webhooks / APIs in use
- Common failures
- Alerting in place
- Spreadsheet / manual workarounds

## 7. Reporting / Visibility
- Daily dashboard used
- Source-level attribution available?
- Rep scorecards available?
- Quote-to-bind visibility available?
- Retention / renewal visibility available?
- Trusted source of truth
- Biggest reporting blind spot

## 8. Compliance / Governance
- Consent capture method
- Opt-out enforcement
- Recording compliance
- Role permissions
- Audit logs
- Document storage
- Known risks

## 9. Strategic Assessment
- What is blocking growth right now?
- What should be automated first?
- What should be eliminated?
- What tools are likely redundant?
- What must stay?
- What would a better stack enable in 90 days?
- What would a better stack enable in 12 months?

## 10. Preliminary Auditor Notes
### Observed Frictions
- 

### Likely Revenue Leaks
- 

### Suspected Redundancies
- 

### High-Leverage Fixes
- 
`;

export const scorecardContent = `# InsureX Insurance Tech Stack Audit — Scorecard

## Scoring Summary
- Lead capture + routing — 10
- Attribution + call tracking — 10
- CRM + pipeline design — 15
- Dialer / SMS / email — 10
- Quoting + AMS workflow — 15
- Automation + integrations — 10
- Reporting + dashboards — 10
- Team usability + adoption — 8
- Compliance + controls — 7
- Strategic fit / future scale — 5

## Score Interpretation
- 85–100 = Strong scale-ready stack
- 70–84 = Good stack with meaningful upgrade opportunities
- 55–69 = Functional but constraining growth
- 40–54 = Fragmented stack requiring intervention
- <40 = Serious operational handicap

## Category Notes
### Lead Capture + Routing
Assess instant ingestion, source tagging, routing, duplicate prevention, and SLA support.

### Attribution + Call Tracking
Assess source traceability, call tracking coverage, offline conversion feedback loops, and spend-to-bind visibility.

### CRM + Pipeline Design
Assess stage clarity, reporting integrity, required fields, rep usability, and manager visibility.

### Dialer / SMS / Email
Assess speed-to-lead, activity logging, standardized dispositions, multi-touch automation, and rep performance visibility.

### Quoting + AMS Workflow
Assess quote turnaround time, system sprawl, duplicate data entry, app/policy status visibility, and renewal workflow quality.

### Automation + Integrations
Assess integration strength, failure rate, observability, alerting, and remaining manual patchwork.

### Reporting + Dashboards
Assess trustworthiness, daily usefulness, executive visibility, source-to-close insight, and retention insight.

### Team Usability + Adoption
Assess simplicity, consistency, training burden, workarounds, and manager enforcement load.

### Compliance + Controls
Assess consent records, recording controls, role permissions, auditability, and document security.

### Strategic Fit / Future Scale
Assess support for the growth plan, product-line expansion, onboarding scalability, and cost vs leverage.

## Final Recommendation Block
- Keep
- Replace
- Integrate Better
- Automate Immediately
- Investigate Further
`;
