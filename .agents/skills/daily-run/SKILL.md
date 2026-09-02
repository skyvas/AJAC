---
name: daily-run
description: >-
  Execute the unattended morning job workflow to find new job postings since the last run,
  screen out scams, auto-draft resumes and cover letters for High and Medium fit roles, and generate a daily report.
  Use when running the morning daily digest or automating unattended job searches and applications.
---

# Daily Run Skill

This skill performs an automated, unattended morning workflow. It scans for newly posted job openings across configured portals, filters out scams and previously processed postings, automatically drafts full applications for High and Medium fit roles, and compiles a comprehensive daily summary report in `applications/report_<YYYY-MM-DD>.md`.

---

## Workflow Steps

1. **Construct the "Already Seen" URL Index**:
   - Aggregate all job URLs from historical runs to avoid duplicate processing:
     - Scan all `applications/scrape_*.md` files.
     - Extract `Source URL` lines from existing `applications/*/job_posting.md` files.
   - Any URL found during today's search that matches this index is dropped immediately.

2. **Execute Multi-Portal Job Scraping**:
   - Follow the `scrape-jobs` procedure:
     - Load `profile/preferences.yaml`.
     - Execute broad portal queries across LinkedIn, Indeed, BrianJobs, BuiltIn, and direct ATS boards (Greenhouse, Lever, Ashby).
     - Screen out fraudulent listings and recruiter scams.
     - Rate fit as High, Medium, or Low.
     - Exclude URLs identified in Step 1.

3. **Persist Today's Scrape Log**:
   - Write or append new candidate postings to `applications/scrape_<YYYY-MM-DD>.md`.
   - Maintain full records of all newly discovered listings (High, Medium, Low, and scam-excluded).

4. **Auto-Draft Applications for High and Medium Fit Roles**:
   - For each newly discovered role scored **High** or **Medium**:
     - Create application slug directory `applications/<company-title-slug>/`.
     - Generate `job_posting.md` and `fit_evaluation.md`.
     - Draft tailored `resume.yaml` and `cover_letter.yaml` adhering to `profile/profile.yaml` and `profile/cover_letter_voice.md`.
     - Compile Word and PDF artifacts:
       ```bash
       .venv/bin/python scripts/generate_docx.py resume applications/<slug>/resume.yaml applications/<slug>/AVashista_resume.docx
       .venv/bin/python scripts/generate_docx.py cover-letter applications/<slug>/cover_letter.yaml applications/<slug>/AVashista_cover_letter.docx
       ```
   - *Default Headless Behavior*: If an ambiguity arises (e.g. uncertain Canadian remote authorization for a US-remote role), mark as "confirm eligibility" and skip auto-drafting rather than guessing.

5. **Generate Morning Report**:
   - Write `applications/report_<YYYY-MM-DD>.md` using the standard summary format:
     ```markdown
     # Daily job report — <YYYY-MM-DD>

     <N> new posting(s) found, <M> drafted.

     ## Ready to apply

     | Title | Company | Fit | URL | Resume | Cover Letter |
     |---|---|---|---|---|---|
     | <Title> | <Company> | High/Medium | <URL> | applications/<slug>/AVashista_resume.docx | applications/<slug>/AVashista_cover_letter.docx |

     ## Found but not drafted (Low fit / flagged)

     | Title | Company | Fit | URL | Why |
     |---|---|---|---|---|
     | <Title> | <Company> | Low | <URL> | <Reason> |

     ## Excluded — suspected scam

     | Title | Company | URL | Red flag(s) |
     |---|---|---|---|
     | <Title> | <Company> | <URL> | <Flags> |
     ```
   - Sort the "Ready to apply" table with High-fit opportunities leading.

6. **Summary Output**:
   - Conclude with a single-sentence overview of the number of new postings found, applications drafted, and the location of `applications/report_<YYYY-MM-DD>.md`.
