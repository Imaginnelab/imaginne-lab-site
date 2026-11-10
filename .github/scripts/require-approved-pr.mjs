// Refuses to deploy a commit that did not reach main through a reviewed pull request.
// The ruleset on main already refuses direct pushes; this is the second layer, in case the
// ruleset is ever turned off: a commit that skipped review never becomes a deployment.
//
// Passes only when the commit being deployed is the merge of a pull request into main that
//   - was approved, on its final commit, by one of APPROVERS other than its author, and
//   - had the "Checks" job (ci.yml) succeed on that same final commit.

const { GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA, APPROVERS = '' } = process.env;
const approvers = new Set(APPROVERS.split(',').map((login) => login.trim().toLowerCase()).filter(Boolean));

async function github(path) {
  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}${path}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  });
  if (!response.ok) throw new Error(`GitHub API ${path}: ${response.status}`);
  return response.json();
}

function refuse(reason) {
  console.log(`::error title=Deploy refused::${reason}`);
  process.exit(1);
}

const pulls = await github(`/commits/${GITHUB_SHA}/pulls`);
const pr = pulls.find((pull) => pull.merged_at && pull.base.ref === 'main' && pull.merge_commit_sha === GITHUB_SHA);
if (!pr) refuse(`Commit ${GITHUB_SHA.slice(0, 7)} did not come from a merged pull request. Changes reach main only through a reviewed PR.`);

const author = pr.user.login.toLowerCase();
const reviews = [];
for (let page = 1; ; page++) {
  const batch = await github(`/pulls/${pr.number}/reviews?per_page=100&page=${page}`);
  reviews.push(...batch);
  if (batch.length < 100) break;
}
// Each reviewer's latest decision counts; comments alone do not change it.
const latest = new Map();
for (const review of reviews) {
  if (!review.user || !['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)) continue;
  latest.set(review.user.login.toLowerCase(), review);
}
const approvals = [...latest].filter(([login, review]) => review.state === 'APPROVED' && login !== author
  && approvers.has(login) && review.commit_id === pr.head.sha);
if (!approvals.length) {
  refuse(`PR #${pr.number} by ${pr.user.login} has no approval on its final commit from ${[...approvers].filter((login) => login !== author).join(' or ')}.`);
}

const { check_runs: checks } = await github(`/commits/${pr.head.sha}/check-runs?check_name=Checks&per_page=100`);
if (!checks.some((run) => run.conclusion === 'success')) refuse(`The checks (typecheck, lint, tests, build) did not pass on the final commit of PR #${pr.number}.`);

console.log(`PR #${pr.number} by ${pr.user.login}, approved by ${approvals.map(([, review]) => review.user.login).join(', ')}, checks passed.`);
