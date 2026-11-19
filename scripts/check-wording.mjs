// Wording check. Fails when a tracked file or a new commit message
// contains a term from the project's banned list (see CONTRIBUTING.md).
// Terms are assembled from character codes so that this file passes its own check.
import { execSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const t = (...codes) => String.fromCharCode(...codes);
const word = (s, flags = 'i') => new RegExp('\\b' + s + '\\b', flags);

const rules = [
  new RegExp(t(99, 108, 97, 117, 100, 101), 'i'),
  new RegExp(t(97, 110, 116, 104, 114, 111, 112, 105, 99), 'i'),
  word(t(65, 73), ''),
  new RegExp('\\b' + t(65) + '\\.' + t(73) + '\\b'),
  word(t(108, 108, 109) + 's?'),
  new RegExp(t(99, 104, 97, 116, 103, 112, 116), 'i'),
  new RegExp(t(111, 112, 101, 110, 97, 105), 'i'),
  new RegExp(t(99, 111, 112, 105, 108, 111, 116), 'i'),
  new RegExp('\\b' + t(103, 112, 116) + '-?\\d', 'i'),
  new RegExp('generated' + '\\s+(by|with)\\b', 'i'),
  new RegExp('co-authored' + '-by', 'i'),
];

const skipNames = /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/;
const skipTypes = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|pdf|zip|mp4|webm)$/i;

const run = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const problems = [];

const scan = (label, text) => {
  text.split('\n').forEach((line, i) => {
    for (const rule of rules) {
      const hit = line.match(rule);
      if (hit) problems.push(`${label}:${i + 1}  "${hit[0]}"`);
    }
  });
};

for (const file of run('git ls-files').split('\n').filter(Boolean)) {
  if (skipNames.test(file) || skipTypes.test(file)) continue;
  for (const rule of rules) {
    const hit = file.match(rule);
    if (hit) problems.push(`${file}  (file name)  "${hit[0]}"`);
  }
  try {
    if (statSync(file).size > 2_000_000) continue;
    scan(file, readFileSync(file, 'utf8'));
  } catch {
    // unreadable or removed file: nothing to check
  }
}

const base = process.env.WORDING_BASE || 'origin/main';
try {
  const log = run(`git log ${base}..HEAD --format=%h%n%B%n----`);
  scan('commit message', log);
} catch {
  // no base branch available (for example on main itself): skip commit messages
}

if (problems.length) {
  console.error('Wording check failed. Remove these terms:\n');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log('Wording check passed.');
