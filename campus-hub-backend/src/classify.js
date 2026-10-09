// Rule-based category classifier. Subject hits score 3, body hits score 1.
// Categories are listed in priority order (used to break ties).
export const CATEGORIES = ['Exams', 'Placements', 'Fees', 'Scholarships', 'Holiday', 'Events', 'Academics', 'General'];

const RULES = {
  Exams: [/\bexams?\b/, /\bexaminations?\b/, /\bassessments?\b/, /hall tickets?/, /\bviva\b/, /\bresults?\b/, /\binternals?\b/, /semester end/],
  Placements: [/placements?/, /recruit/, /campus drive/, /\binternships?\b/, /\binterviews?\b/, /off[- ]campus/, /\bdrive\b/, /\bpackage\b/],
  Fees: [/\bfees?\b/, /\bpayments?\b/, /\bchallan\b/, /\btuition\b/, /\bdues?\b/, /\brefund\b/],
  Scholarships: [/scholarships?/, /\bstipends?\b/, /\bbursary\b/, /\bgrants?\b/, /financial aid/],
  Holiday: [/\bholidays?\b/, /\bvacation\b/, /\bclosed\b/, /no classes/],
  Events: [/\bfest\b/, /\bsymposium\b/, /\bworkshops?\b/, /\bseminars?\b/, /\bhackathons?\b/, /\bcompetitions?\b/, /\bcultural\b/, /\bwebinars?\b/, /guest lecture/, /\bevents?\b/],
  Academics: [/time ?tables?/, /\bsyllabus\b/, /\bcurriculum\b/, /\bassignments?\b/, /\blab\b/, /\bclasses\b/, /\battendance\b/, /course registration/, /\bproject\b/],
};

const URGENT = /\b(urgent|immediately|asap|deadline|last date|today|tomorrow)\b/i;

export function classify(subject = '', body = '') {
  const s = subject.toLowerCase();
  const b = body.toLowerCase().slice(0, 2000);
  const scores = {};
  for (const [cat, patterns] of Object.entries(RULES)) {
    scores[cat] = patterns.reduce((n, re) => n + (re.test(s) ? 3 : 0) + (re.test(b) ? 1 : 0), 0);
  }
  const [best, top] = Object.entries(scores).sort((a, c) => c[1] - a[1])[0];
  const category = top >= 2 ? best : 'General';
  return {
    category,
    confidence: category === 'General' ? 0 : Number((top / (top + 3)).toFixed(2)),
    urgent: URGENT.test(`${subject} ${body.slice(0, 300)}`),
    scores,
  };
}
