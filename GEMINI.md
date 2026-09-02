# GEMINI.md — ai_apply Workspace Context & Guidelines

Welcome to **ai_apply**. This project is an automated and interactive AI assistant workflow for finding QA / SDET job postings, evaluating job fit against a candidate profile, and generating tailored, publication-ready resumes and cover letters in `.docx` and `.pdf` formats.

---

## Core Guidelines & Safety Principles

1. **Zero Fabrication (Non-Negotiable)**:
   - Every single bullet point, technology, framework, metric, or responsibility drafted into `resume.yaml` or `cover_letter.yaml` **must trace directly back to `profile/profile.yaml`**.
   - Tailoring means reordering, re-weighting, and rephrasing for relevance — **never inventing experience**.
   - If a job requirement cannot be matched truthfully from `profile/profile.yaml`, acknowledge the gap or note it rather than fabricating.

2. **Scam & Fraudulent Listing Screening**:
   - Before evaluating fit or drafting documents, screen postings for scam red flags (unverifiable company presence, asking for money/deposits/starter kits, requesting bank/SIN/ID details before interviews, personal email/messaging app contact only, implausible compensation).
   - Suspected scams are excluded from application drafting and logged under "Excluded — suspected scam".

3. **Grounded Cover Letter Specifics**:
   - Cover letter Paragraph 3 ("Why this company") must strictly reference details confirmed in `applications/<slug>/job_posting.md`. Do not invent product features or company values not found in the posting.
   - Follow the voice, tone, and formatting constraints defined in `profile/cover_letter_voice.md`.

4. **Targeting & Eligibility**:
   - Target locations and roles are governed by `profile/preferences.yaml` (primarily Vancouver, BC and Remote roles open to Canadian residents).
   - For "Remote - US" postings, flag as "confirm eligibility" unless Canadian remote work is explicitly supported.

---

## Workspace Customization System

This repository uses Antigravity / Gemini native workspace customizations located in `.agents/`:

### 1. Workspace Skills (`.agents/skills/`)
Skills are specialized, modular runbooks that can be activated on demand:
- **`setup-profile`**: Interactive interview to initialize or update candidate profile (`profile.yaml`), preferences (`preferences.yaml`), and cover letter voice (`cover_letter_voice.md`).
- **`scrape-jobs`**: Multi-portal search (LinkedIn, Indeed, BrianJobs, BuiltIn, direct ATS boards like Greenhouse/Lever/Ashby), scam screening, fit ranking (High/Medium/Low), and output logging to `applications/scrape_<YYYY-MM-DD>.md`.
- **`collect-job`**: Captures a single job posting URL into `applications/<slug>/job_posting.md` without drafting yet.
- **`apply-job`**: Evaluates fit, drafts `resume.yaml` and `cover_letter.yaml`, triggers reviewer check, and builds `.docx` + `.pdf` files.
- **`application-reviewer`**: Dedicated cold-critique skill to review drafted documents against `profile.yaml`, `job_posting.md`, and `cover_letter_voice.md` before finalization.
- **`daily-run`**: Unattended morning routine that finds *new* postings since the last run, auto-drafts High/Medium fit positions, and writes `applications/report_<YYYY-MM-DD>.md`.

### 2. Workspace Rules (`.agents/rules/`)
- **`job_application_rules.md`**: Core constraints for resume/cover letter drafting, schema validation, document rendering, and anti-fabrication policies.

---

## Directory Quick Reference

| Directory / File | Description |
| :--- | :--- |
| `profile/profile.yaml` | Candidate source of truth (experience, skills, education, contact info) |
| `profile/preferences.yaml` | Target roles, locations, must-haves, nice-to-haves, dealbreakers |
| `profile/cover_letter_voice.md` | Tone, sentence structure, and style rules for cover letters |
| `applications/<slug>/` | Individual job application workspaces containing posting, fit review, YAML drafts, and generated DOCX/PDF files |
| `applications/scrape_<date>.md` | Daily search result logs across all searched portals |
| `applications/report_<date>.md` | Daily morning summary report (new postings + drafted docs) |
| `scripts/generate_docx.py` | Python script that renders YAML schemas to formatted `.docx` and `.pdf` files |
| `scripts/daily_run.sh` | Shell entrypoint for automated morning scheduling |
| `.agents/skills/` | Workspace skills for Gemini / Antigravity |
| `.agents/rules/` | Directory and workspace rules for Gemini / Antigravity |
