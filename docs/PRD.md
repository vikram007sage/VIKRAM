# VIKRAM — Product Requirements Document

*Owner: Aryan (PM, designer, first user) · v1.0 · Nov 2026 · Status: v1 shipped, iterating*

> This PRD doubles as a portfolio case study for product-management interviews: problem → user insight → decisions and trade-offs → metrics → what I learned.

## 1. Problem
A final-year IIT student has 13 months to become placement-ready for non-software roles (analyst, consulting, product, finance, quant, AI/ML) while running a lab project and wanting to rebuild daily habits. The materials exist (11 GB of books and casebooks). What fails is **execution**:
- Plans live in many places and are re-decided every morning, which costs willpower.
- Short-form video (Instagram) fills every gap in the day; reading never starts.
- One missed day turns into a lost week. Generic habit apps punish streak breaks, which accelerates quitting.
- Afternoon sleep wipes out the lab block.

## 2. User and insights
Primary user: me. Insights from 4 weeks of self-observation:
1. **Decision fatigue, not lack of information.** I knew what to study; I didn't know what to do *right now*.
2. **The phone is the trigger.** The urge to scroll appears in 2–3 minute gaps; any replacement must fit that gap.
3. **Recovery matters more than streaks.** My failure mode is the second missed day, not the first.
4. **I like solving and winning.** Scores and personal bests motivate me more than reminders.

## 3. Goals and non-goals
**Goals**
- G1: Tell me what to do *now*, for every hour from 5:00 to 21:00, with zero planning in the moment.
- G2: Replace scrolling in short gaps with one-minute learning cards.
- G3: Make returning after a bad day cheap (comeback mode).
- G4: Run the 13-month placement roadmap with dated deadlines and offline notes.
- G5: Work offline on phone and laptop, synced, with notifications.

**Non-goals (v1)**
- Social features, leaderboards, accounts for other users.
- AI chat inside the app (content is pre-generated; the app must run without a model).
- Automatic email sending (outreach drafts only, the human sends).

## 4. Success metrics
| Type | Metric | Target (Dec 2026) |
|---|---|---|
| North star | Planned checklist items completed per week | ≥ 70% |
| Behaviour | Urges beaten per day (Feed opens from the Urge button) | ≥ 5 |
| Recovery | Days from a missed day to the next ≥ 60% day | ≤ 1 |
| Outcome | Roadmap tasks done on or before due date | ≥ 80% |
| Skill | Math-sprint best score (120 s) | 40 by 31 Dec |
| Guardrail | Sleep by 21:00 ticked | ≥ 5 nights/week |
| Guardrail | Instagram screen time (phone setting) | ≤ 20 min/day |

## 5. Solution (v1 scope)
| Area | Feature | Priority |
|---|---|---|
| Today | Time-blocked day (5:00 wake → 21:00 sleep) from 3 templates (study, class, Sunday), "Now" card, checklist, score ring, streak with freezes, XP levels | Must |
| Recovery | Comeback mode: after 2 missed days or 3 low days → 3-task day, overdue tasks rescheduled over 7 days, exits after 3 good days | Must |
| Anti-scroll | "Urge to scroll?" button → Feed of 1-minute cards (aptitude, history, geopolitics, French, business, mindset) | Must |
| Prep | Dated roadmap (Dec 2026 → Day 1, 1 Dec 2027), notes library, 120-s math sprint with history | Must |
| Life | Why screen + life plan, habit heatmap, writing pad, reading tracker | Should |
| Sync | Private GitHub repo as the data store; per-record newest-wins merge | Must |
| Notifications | Web Push from a scheduled GitHub Action; calendar (.ics) alarms for exact times; in-app reminders | Must |
| Later | Practice engine + question banks, outreach CRM, history reader, French course | Next batches |

## 6. Key decisions and trade-offs
1. **PWA over a native app.** One codebase for Android, iPhone and laptop, installable, offline via service worker. Trade-off: background notifications need a server, so push is sent from outside the app.
2. **GitHub as the backend.** Free, private, versioned (every sync is a commit, so history doubles as a backup). Trade-off: not real-time; sync runs on open, on change and every 3 minutes, and a token has to be pasted once per device.
3. **Scheduled GitHub Action for push.** Free on a public repo and needs no server to maintain. Trade-off: GitHub can delay scheduled runs by several minutes, so exact-time alarms (5:00 wake, sleep) come from the phone calendar instead. Two channels, each used for what it's good at.
4. **Newest-wins per record, not per file.** Ticking a habit on the phone and writing in the journal on the laptop never overwrite each other.
5. **Content as plain JS data files.** The same file powers the browser app and the push sender, and works from `file://` with no build step.
6. **Minimum versions for every habit.** Lowers the cost of a bad day so the streak can survive; this directly addresses insight 3.
7. **Phase-in of habits.** New habits start on dated schedules (writing from 15 Dec, history from 1 Jan, chess from 15 Jan) so the list never overwhelms.

## 7. Risks
| Risk | Mitigation |
|---|---|
| I stop opening the app | Push nudges + calendar alarms; home-screen spot where Instagram used to be |
| Push delays or failures | Calendar alarms are the exact-time backbone; push is the smart layer |
| Token leak | Fine-grained token limited to one private repo; it stays on the device and is never committed |
| Over-gamification | XP is a side signal; the north star is completion of planned items |

## 8. Roadmap
- **v1 (Nov 2026):** core loop, sync, notifications, roadmap, Feed seed, math sprint.
- **v1.1:** outreach CRM + company list + email templates.
- **v1.2:** practice engine (timed sets, spaced-repetition flashcards), history reader with public-domain originals, French course.
- **v1.3:** weekly review screen with charts; Sunday report.

## 9. What I'll measure and write up (fill in after 4 weeks)
- North-star trend by week:
- Biggest behaviour change:
- Feature I was wrong about:
- What I'd build differently:
