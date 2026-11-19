# Project rules

Everyone working in this repository follows these rules. They apply to code,
comments, file names, site text, commit messages, branch names, and pull
request titles and descriptions.

## 1. No tool or vendor mentions

Do not name any automated writing or coding tool, the company behind it, or
the technology it runs on. Do not describe how any code or content was
produced.

- No credit or attribution lines of any kind on commits or pull requests.
- No session links or tool footers.
- No statements on the site about how its content was made.

The exact list of banned terms is enforced by `scripts/check-wording.mjs`,
which runs on every pull request and on `main`. Run it yourself before
opening a pull request:

```
node scripts/check-wording.mjs
```

If it fails, remove the term it reports. Do not edit the script to make a
failure pass.

## 2. No invented facts

No made-up figures, school names, people, reviews or dates. Where a real
value has not been supplied, use a clearly marked placeholder in square
brackets.

## 3. No invented people

Author and reviewer names must belong to real, accountable people. Until they
are supplied, use placeholders.

## 4. Changes go through pull requests

Work on a branch and open a pull request. Do not push to `main` directly and
do not merge your own pull request.
