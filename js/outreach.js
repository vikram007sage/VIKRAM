/* VIKRAM outreach content: templates + defaults. Placeholders: {first} {company} {team} {hook} {proof} {cv} {linkedin} {sig} {value} */
var VK_OUTREACH = {
  QUOTA: 15,          // personalised emails per weekday while the window is open
  WINDOW: [['2026-12-15', '2027-03-31'], ['2027-07-15', '2027-08-31']],
  FOLLOWUPS: [4, 10], // days after first email
  STATUSES: ['To contact', 'Sent', 'Follow-up 1', 'Follow-up 2', 'Replied', 'Call / test', 'Interview', 'Offer', 'Closed'],
  PROOFS: {
    an: 'As a product intern at CheQ (a credit-management fintech) I worked on onboarding A/B tests and user-journey analytics.',
    qt: 'I like solving under time pressure: I train mental maths and probability daily and won gold in Open IIT\'s case competition.',
    co: 'I won gold in Open IIT\'s case competition (a 15-city Flipkart Minutes expansion strategy) and was a national finalist in the Indian Case Challenge.',
    pm: 'I interned in product at CheQ and built VIKRAM, my own offline productivity app (PWA with sync and push notifications), from PRD to launch.',
    fi: 'At IFSA I wrote sector reports for an advisory client and benchmarked startup IPOs on EV/revenue multiples.',
    vc: 'I co-founded KiFayti, an IIT KGP deep-tech startup building sub-₹100 soil and water sensors, backed by a ₹10 lakh institute innovation grant.',
    ai: 'For my startup I built a Gaussian-process optimiser that guides laser-graphene fabrication experiments, and I\'m now building LLM projects.'
  },
  TEMPLATES: [
    { id: 'cold', n: 'Cold email: internship ask', s: 'IIT KGP student: summer 2027 internship, {team}', b: 'Hi {first},\n\nI\'m Aryan, a fourth-year dual-degree student at IIT Kharagpur. {hook}\n\n{proof}\n\nI\'d love to contribute to {team} at {company} as a summer intern (May–July 2027). Would you have 15 minutes for a call this week or next?\n\nCV: {cv}\n\nThanks,\n{sig}' },
    { id: 'alum', n: 'Alumni: advice first, referral later', s: 'KGPian asking for 10 minutes of advice', b: 'Hi {first},\n\nI\'m Aryan, a fourth-year at IIT Kharagpur. {hook}\n\nI\'m preparing for {team} roles and would really value 10 minutes of your advice on how you got into {company} and what they look for. If it seems like a fit afterwards, I\'d be grateful for a referral, but advice first.\n\n{proof}\n\nCV: {cv}\n\nThank you,\n{sig}' },
    { id: 'hr', n: 'HR / recruiter: short', s: 'Summer 2027 internship: IIT Kharagpur, {team}', b: 'Hello {first},\n\nI\'m Aryan Rajak from IIT Kharagpur (B.Tech + M.Tech, graduating 2028). I\'m applying for a summer 2027 internship in {team} at {company}. {proof}\n\nMy CV is here: {cv}. Could you tell me the right process or person for this?\n\nRegards,\n{sig}' },
    { id: 'fu1', n: 'Follow-up 1 (day 4): add value', s: 'Re: {subject}', b: 'Hi {first},\n\nA quick follow-up on my note below. Since writing, I {value}. Happy to share it if it\'s useful.\n\nWould a short call work in the next week?\n\nThanks,\n{sig}' },
    { id: 'fu2', n: 'Follow-up 2 (day 10): last touch', s: 'Re: {subject}', b: 'Hi {first},\n\nLast note from me, I promise. If summer internships aren\'t planned for {team} this year, I\'d really appreciate a pointer to the right person or team at {company}.\n\nThanks for your time either way,\n{sig}' },
    { id: 'thanks', n: 'Thank-you after a call', s: 'Thank you, {first}', b: 'Hi {first},\n\nThank you for the time today. {hook}\n\nAs discussed, I\'ll {value}. I\'ll share it with you by the end of the week.\n\nBest,\n{sig}' },
    { id: 'li', n: 'LinkedIn connection note (≤300 chars)', s: '', b: 'Hi {first}, I\'m Aryan, a 4th-year at IIT Kharagpur. {hook} I\'m exploring {team} internships for summer 2027 and would love to learn from your path at {company}. Thanks!' }
  ],
  CALL: [
    'Hi, am I speaking with {first}? I\'m Aryan Rajak, a fourth-year student at IIT Kharagpur. Is this an OK time for 60 seconds?',
    'I\'m reaching out about summer 2027 internships in {team} at {company}.',
    'In one line: {proof}',
    'Could you tell me whether {company} takes interns for this, and the best way to apply or the right person to email?',
    'Thank you. I\'ll email you my CV right after this call. What\'s the best address?'
  ],
  VALUE_IDEAS: ['wrote a one-page teardown of {company}\'s onboarding flow', 'sized the market for one of {company}\'s products', 'drafted a short memo on a competitor\'s recent launch', 'built a small dashboard on public data about {company}\'s sector']
};
if (typeof module !== 'undefined') module.exports = VK_OUTREACH;
