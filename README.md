# ai_apply

A Claude Code project that finds QA/SDET job postings matching a target
profile, rates fit, and drafts a tailored resume + cover letter per
posting. A scheduled morning job automates the "find + draft" part; the
user always applies manually.

## Project tree

```
ai_apply/
├── README.md
├── .claude/
│   ├── settings.json                  # tool permission allow-list
│   ├── agents/
│   │   └── application-reviewer.md    # reviews a drafted resume/cover letter before finalizing
│   └── commands/
│       ├── setup.md                   # /setup  — interview the user, write profile/*
│       ├── scrape.md                  # /scrape — search job portals (LinkedIn, Indeed, BrianJobs, etc.), rate fit, list candidates
│       ├── apply.md                   # /apply  — draft resume + cover letter for one posting URL
│       └── daily.md                   # /daily  — unattended: new postings only, auto-draft High/Medium
├── profile/
│   ├── profile.yaml                   # source of truth: experience, skills, education
│   ├── preferences.yaml               # target roles, locations, must/nice-to-haves, deal-breakers, portals
│   └── cover_letter_voice.md          # tone/voice guide for cover letters
├── applications/
│   ├── _example/
│   │   └── cover_letter.yaml          # schema reference
│   ├── scrape_<YYYY-MM-DD>.md         # daily portal search results (all fit levels, one file per day)
│   ├── report_<YYYY-MM-DD>.md         # /daily's morning report (new postings + drafted docs)
│   └── <company-title-slug>/          # one folder per posting that got drafted
│       ├── job_posting.md             # extracted posting details + source URL
│       ├── fit_evaluation.md          # verdict against preferences.yaml
│       ├── resume.yaml                # tailored resume (source)
│       ├── resume.docx                # rendered resume
│       ├── cover_letter.yaml          # tailored cover letter (source)
│       └── cover_letter.docx          # rendered cover letter
├── scripts/
│   ├── generate_docx.py               # renders resume/cover_letter yaml -> .docx
│   ├── daily_run.sh                   # launchd entrypoint, runs `claude -p "/daily"`
│   └── requirements.txt               # python-docx, pyyaml
├── logs/                              # daily_run.sh output (gitignored)
└── .venv/                             # local python env for generate_docx.py
```

A macOS launchd agent (`~/Library/LaunchAgents/com.aiapply.dailyscrape.plist`,
outside this repo) runs `scripts/daily_run.sh` every morning at 8:00 AM.

## Flow

### One-time / occasional setup

```
/setup
   │
   ▼
profile/profile.yaml, preferences.yaml, cover_letter_voice.md
(source of truth for every later step)
```

### Collect first, then apply

```
/scrape
   │  read preferences.yaml → search portals → dedupe candidates
   │  validate each company is legit (drop suspected scams — see below)
   │  rate the rest High / Medium / Low
   ▼
applications/scrape_<date>.md
   (fit tables + a separate "Excluded — suspected scam" table)
   │  user picks a URL
   ▼
/apply <url>
   │  read collected job_posting.md or fetch if needed
   │  write fit_evaluation.md
   │  draft resume.yaml + cover_letter.yaml from profile.yaml
   │  generate_docx.py → AVashista_resume.docx + AVashista_cover_letter.docx
   ▼
applications/<slug>/   (ready to review and submit manually)
```

**Scam screening** (`/scrape` step 5): before rating fit, each remaining
candidate is checked for recruiter-scam red flags — no findable company
presence, requests for payment/deposits or bank/SIN/ID details before an
interview, contact only via personal email or messaging apps, comp that's
implausibly high with no other detail, templated copy-paste listings, or
an unverifiable staffing shop. Any hard signal (or several weak ones)
excludes the posting outright — it's never rated or drafted, and is logged
under "Excluded — suspected scam" instead of silently dropped.

### Automated morning run

```
launchd (8:00 AM daily)
   │
   ▼
scripts/daily_run.sh
   │  cd repo; claude -p "/daily"   (no bypass flag — see Permissions note)
   ▼
/daily
   │  1. collect every URL already in scrape_*.md and */job_posting.md
   │  2. search + validate + rate (same as /scrape), keep only URLs not
   │     seen before; scam-flagged postings are dropped here too
   │  3. write today's applications/scrape_<date>.md
   │  4. for each NEW High/Medium fit posting: run the /apply flow in full
   │     (Low fit and scam-excluded postings are listed, never drafted)
   ▼
applications/report_<date>.md
   (Ready to apply / Found but not drafted / Excluded — suspected scam,
    each with Title | Company | Fit | URL | Resume path | Cover Letter path)
   │
   ▼
user reads the report, opens the docx files, applies manually
```

`/daily` never submits an application — it only finds postings and prepares
documents for the companies it drafts. Collecting is always separate from the
later fit-evaluation/doc-generation step for chosen companies.

## Permissions note

`/scrape` and `/apply` run interactively under normal permission prompts.
The scheduled `/daily` run is unattended (no one is around at 8am to
approve a prompt), so instead of skipping permissions entirely,
`.claude/settings.json` pre-approves exactly what `/daily` needs and
nothing else:

- `WebSearch` and `WebFetch` (any domain — job postings and company sites
  vary daily, so this can't be a fixed domain list)
- `Bash` restricted to three exact command patterns: the venv sanity
  check plus two `generate_docx.py` invocations that only write
  `applications/**/{resume,cover_letter}.docx` — no general shell access

Anything not on that list is denied automatically rather than hanging on a
prompt nobody can answer. `scripts/daily_run.sh` deliberately does **not**
pass `--dangerously-skip-permissions` — even if something in `/daily`
misbehaved, it has no way to touch anything outside this repo or run an
arbitrary command.
