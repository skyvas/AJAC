# ai_apply — Automated AI Job Application Assistant

**ai_apply** is an intelligent, agentic job application workflow built for **Google Gemini** and the **Antigravity IDE & CLI**. It automates finding target QA, SDET, and Automation Engineering roles, screening out fraudulent recruiter scams, evaluating fit against candidate preferences, and generating customized, ATS-friendly Word (`.docx`) and PDF (`.pdf`) resumes and cover letters.

---

## Table of Contents
1. [Architecture & Directory Layout](#architecture--directory-layout)
2. [Specific Files & Schemas](#specific-files--schemas)
3. [Working with Gemini Functions & Skills](#working-with-gemini-functions--skills)
4. [End-to-End Application Workflow](#end-to-end-application-workflow)
5. [Automated Scheduling & Morning Runs](#automated-scheduling--morning-runs)
6. [Core Guardrails & Safety Principles](#core-guardrails--safety-principles)
7. [Quickstart & Setup](#quickstart--setup)

---

## Architecture & Directory Layout

The workspace is organized into modular directories separating candidate truth data, workspace application artifacts, Python build utilities, and native Gemini customizations:

```
ai_apply/
├── GEMINI.md                                  # Root Gemini instructions, context, & safety rules
├── README.md                                  # Comprehensive documentation & reference guide
├── .agents/                                   # Native Antigravity / Gemini customization root
│   ├── rules/
│   │   └── job_application_rules.md          # Workspace rules for document generation & grounding
│   └── skills/
│       ├── setup-profile/SKILL.md             # Skill: Candidate onboarding & preference config
│       ├── scrape-jobs/SKILL.md               # Skill: Multi-portal scraping, scam filtering, & fit rating
│       ├── collect-job/SKILL.md               # Skill: Ingests a raw job posting URL to job_posting.md
│       ├── apply-job/SKILL.md                 # Skill: Tailors resume/cover letter & compiles DOCX/PDF
│       ├── application-reviewer/SKILL.md      # Skill: Editorial auditor checking for fabrication & voice
│       └── daily-run/SKILL.md                 # Skill: Headless morning job search & auto-drafting
├── profile/                                   # Source of truth for candidate background & preferences
│   ├── profile.yaml                           # Master candidate profile (truth source for all claims)
│   ├── preferences.yaml                       # Target roles, locations, must/nice-to-haves, deal-breakers
│   └── cover_letter_voice.md                  # Voice, tone, structure, and style guidelines
├── applications/                              # Generated application workspaces and daily reports
│   ├── _example/                              # Schema references and formatting examples
│   ├── scrape_<YYYY-MM-DD>.md                 # Daily portal search logs (High, Medium, Low, Scams)
│   ├── report_<YYYY-MM-DD>.md                 # Daily morning digest (new roles found & drafted)
│   └── <company-title-slug>/                  # Application workspace for a specific job
│       ├── job_posting.md                     # Extracted job posting details and source URL
│       ├── fit_evaluation.md                  # Fit score and analysis against preferences
│       ├── resume.yaml                        # Tailored resume YAML data
│       ├── cover_letter.yaml                  # Tailored cover letter YAML data
│       ├── AVashista_resume.docx              # Compiled Word resume
│       ├── AVashista_resume.pdf               # Generated PDF duplicate resume
│       ├── AVashista_cover_letter.docx        # Compiled Word cover letter
│       └── AVashista_cover_letter.pdf         # Generated PDF duplicate cover letter
├── scripts/                                   # Generation scripts and automation entrypoints
│   ├── generate_docx.py                       # Compiles YAML data into Word (.docx) and PDF (.pdf)
│   ├── daily_run.sh                           # Shell script for launchd / cron automated execution
│   └── requirements.txt                       # Python dependencies (python-docx, pyyaml)
├── logs/                                      # Automation execution logs (gitignored)
└── .venv/                                     # Isolated Python virtual environment
```

---

## Specific Files & Schemas

### 1. Master Candidate Profile (`profile/profile.yaml`)
The single source of truth for all professional experience. **Gemini will never draft a bullet point, tool, or metric that does not trace directly to this file.**

Key Sections:
- `contact`: Name, location, phone, email, LinkedIn, website.
- `headline`: Target professional positioning.
- `summary`: High-level value proposition and experience summary.
- `core_competencies`: Categorized technical competencies (e.g. Test Automation, Framework Design).
- `professional_strengths`: Key behavioral and technical strengths with supporting details.
- `experience`: List of past and current roles with company, title, dates, environment stack, and bulleted achievements.
- `tools_and_technologies`: Specific tool proficiencies (Automation, Languages, Testing, Cloud/CI/CD, Management).
- `education`: Degrees, institutions, and dates.

### 2. Search Preferences (`profile/preferences.yaml`)
Defines the boundaries of what jobs are in-scope and how candidate fit is scored.

Key Sections:
- `target_roles`: Accepted job titles across all levels (Junior, Intermediate, Senior, Lead, SDET).
- `locations`: Accepted geographic regions (e.g., Vancouver, BC; British Columbia; Remote Canada).
- `work_authorization`: Candidate residency/citizenship status and Canadian remote constraints.
- `deal_breakers`: Hard disqualifiers (e.g., in-office outside accepted regions, non-QA roles).
- `must_haves` & `nice_to_haves`: Positive scoring criteria (e.g., Playwright, TypeScript, CI/CD).
- `portals`: Target search boards (LinkedIn, Indeed, BrianJobs, BuiltIn, direct ATS platforms).

### 3. Cover Letter Voice Guide (`profile/cover_letter_voice.md`)
Defines the exact tone, style, and paragraph architecture for cover letters:
- **Paragraph 1 (The Hook)**: Clear statement of interest and relevant positioning.
- **Paragraph 2 (Core Fit & Accomplishments)**: 2–3 concrete achievements demonstrating technical overlap.
- **Paragraph 3 (Why This Company)**: Specific details grounded **strictly** in `job_posting.md` (no generic praise or fabricated company facts).
- **Paragraph 4 (Closing)**: Value proposition and professional call to action.

### 4. Job Workspaces (`applications/<company-title-slug>/`)
Every evaluated position receives an isolated directory named via a normalized slug (e.g. `applications/semios-quality-assurance-engineer/`):
- `job_posting.md`: Grounded snapshot of the job listing (responsibilities, requirements, source URL).
- `fit_evaluation.md`: Breakdown of fit score (**High**, **Medium**, **Low**) with detailed reasoning.
- `resume.yaml` & `cover_letter.yaml`: Tailored data structures matching the candidate profile schema.
- `AVashista_resume.docx` & `AVashista_cover_letter.docx`: Cleanly formatted Word documents.
- `AVashista_resume.pdf` & `AVashista_cover_letter.pdf`: Headless PDF exports (generated via LibreOffice).

### 5. Document Generator (`scripts/generate_docx.py`)
A standalone Python utility that reads YAML data and outputs formatted documents:
```bash
# Render tailored resume to DOCX and PDF:
.venv/bin/python scripts/generate_docx.py resume applications/<slug>/resume.yaml applications/<slug>/AVashista_resume.docx

# Render tailored cover letter to DOCX and PDF:
.venv/bin/python scripts/generate_docx.py cover-letter applications/<slug>/cover_letter.yaml applications/<slug>/AVashista_cover_letter.docx
```

---

## Working with Gemini Functions & Skills

Antigravity uses a **Skills system** located in `.agents/skills/`. Gemini automatically detects and activates these skills based on your natural language prompts, or you can invoke them directly.

### Summary of Available Skills

| Skill Name | Purpose | Example Prompts |
| :--- | :--- | :--- |
| **`setup-profile`** | Onboard/update candidate profile & preferences | *"Let's update my resume experience"*, *"Update my job search preferences"* |
| **`scrape-jobs`** | Multi-portal search, scam screening & fit rating | *"Find new QA jobs in Vancouver"*, *"Scrape job boards for SDET positions"* |
| **`collect-job`** | Ingest posting URL into `job_posting.md` | *"Collect this job URL: https://..."*, *"Save this job posting"* |
| **`apply-job`** | Fit evaluation, tailoring & doc compilation | *"Apply to this job URL: https://..."*, *"Tailor my resume for this role"* |
| **`application-reviewer`** | Editorial review of drafted documents | *"Review my drafted resume and cover letter"*, *"Check this draft for fabrication"* |
| **`daily-run`** | Automated morning unattended search & drafting | *"Run today's daily morning job routine"*, *"Execute the daily run"* |

---

### Detailed Skill Workflows

#### 1. `setup-profile`
- **Location**: `.agents/skills/setup-profile/SKILL.md`
- **What it does**: Conducts an interactive interview to update `profile.yaml`, `preferences.yaml`, or `cover_letter_voice.md`. Verifies the Python virtual environment and installed dependencies.

#### 2. `scrape-jobs`
- **Location**: `.agents/skills/scrape-jobs/SKILL.md`
- **What it does**:
  1. Reads `profile/preferences.yaml`.
  2. Constructs multi-portal search queries across LinkedIn, Indeed, BrianJobs, BuiltIn, and direct ATS boards (Greenhouse, Lever, Ashby).
  3. Screens candidate companies for fraudulent scam indicators.
  4. Rates fit as **High**, **Medium**, or **Low**.
  5. Appends results to `applications/scrape_<YYYY-MM-DD>.md`.

#### 3. `collect-job`
- **Location**: `.agents/skills/collect-job/SKILL.md`
- **What it does**: Extracts metadata, responsibilities, and requirements from a job URL and writes `applications/<slug>/job_posting.md` without generating application documents yet.

#### 4. `apply-job`
- **Location**: `.agents/skills/apply-job/SKILL.md`
- **What it does**:
  1. Fetches/reads the target `job_posting.md`.
  2. Compares requirements against `preferences.yaml` and writes `fit_evaluation.md`.
  3. Drafts `resume.yaml` by prioritizing relevant bullets from `profile.yaml`.
  4. Drafts `cover_letter.yaml` adhering to `cover_letter_voice.md`.
  5. Runs the `application-reviewer` check for anti-fabrication and voice integrity.
  6. Compiles `.docx` and `.pdf` files using `generate_docx.py`.

#### 5. `application-reviewer`
- **Location**: `.agents/skills/application-reviewer/SKILL.md`
- **What it does**: Acts as an independent auditor. Compares drafted `resume.yaml` and `cover_letter.yaml` against `profile.yaml` to ensure no skills or metrics were invented, checks that Paragraph 3 of the cover letter is grounded in `job_posting.md`, and validates tone.

#### 6. `daily-run`
- **Location**: `.agents/skills/daily-run/SKILL.md`
- **What it does**: Headless morning job execution. Builds a historical index of already-seen URLs, scrapes for new postings, auto-drafts complete applications for High and Medium fit roles, and writes the morning summary digest to `applications/report_<YYYY-MM-DD>.md`.

---

## End-to-End Application Workflow

```
[Candidate Profile & Preferences] (profile/profile.yaml, preferences.yaml)
                │
                ▼
      [scrape-jobs Skill]
   (Multi-portal search & scam screening)
                │
                ▼
  applications/scrape_<date>.md
                │
                ▼
       [apply-job Skill]  <─── User selects a posting URL
                │
        ┌───────┴────────────────────────┐
        ▼                                ▼
[applications/<slug>/fit_evaluation.md]  [applications/<slug>/job_posting.md]
        │
        ▼
[Draft resume.yaml & cover_letter.yaml]
        │
        ▼
[application-reviewer Skill]  (Anti-fabrication & grounding verification)
        │
        ▼
[scripts/generate_docx.py]
        │
        ▼
[AVashista_resume.docx / .pdf] & [AVashista_cover_letter.docx / .pdf]
        │
        ▼
Candidate manually reviews and submits application
```

---

## Automated Scheduling & Morning Runs

The morning job routine can be executed automatically or on a schedule:

### 1. In Antigravity / Gemini Sessions
You can set up a recurring schedule directly within the assistant session using the scheduling system:
```text
Schedule daily-run to execute every weekday morning at 8:00 AM
```

### 2. Command-Line Execution
Using the Antigravity CLI (`agy`):
```bash
agy run "Execute daily-run skill"
```

### 3. macOS Launchd Scheduler (`scripts/daily_run.sh`)
An automated `launchd` plist (`~/Library/LaunchAgents/com.aiapply.dailyscrape.plist`) triggers `scripts/daily_run.sh` at 8:00 AM daily:
- Logs are written to `logs/daily_<YYYY-MM-DD>.log`.
- Outputs today's summary report to `applications/report_<YYYY-MM-DD>.md`.

---

## Core Guardrails & Safety Principles

1. **Zero Fabrication**: Every bullet, metric, tool, and qualification in drafted resumes and cover letters must trace directly to `profile/profile.yaml`.
2. **Scam Screening**: Unverifiable companies, payment requests, or demands for personal banking/SIN data before interviews are filtered and recorded under `Excluded — suspected scam`.
3. **Grounded Cover Letters**: Paragraph 3 of the cover letter must cite only facts confirmed in `job_posting.md`.
4. **Human in the Loop**: The assistant prepares documents; the candidate always conducts the final review and submits applications manually.

---

## Quickstart & Setup

### 1. Environment Setup
```bash
# Clone and navigate to repository
cd ai_apply

# Create virtual environment and install dependencies
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements.txt

# Verify environment
.venv/bin/python -c "import docx, yaml; print('Environment Ready!')"
```

### 2. Configure Your Profile
In Antigravity / Gemini, type:
> *"Run setup-profile to configure my background and job search preferences."*

### 3. Find and Apply for Jobs
- To discover new postings:
  > *"Scrape job boards for open QA Engineer roles."*
- To generate application documents for a posting:
  > *"Apply to this job URL: https://boards.greenhouse.io/example/jobs/12345"*
