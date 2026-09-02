---
name: collect-job
description: >-
  Extract and save a job posting into its dedicated application directory as a job_posting.md file
  without drafting documents yet. Use when the user provides a job URL to collect, save, or bookmark for later.
---

# Collect Job Skill

This skill captures a job posting from a provided URL into a dedicated application workspace (`applications/<company-title-slug>/job_posting.md`) as a grounded source document, without drafting resume or cover letter files yet.

---

## Workflow Steps

1. **Extract Posting Information**:
   - Read the job posting URL provided in the prompt.
   - Extract key details:
     - Job Title
     - Company Name
     - Location & Remote Policy
     - Seniority Level
     - Responsibilities
     - Must-Have Requirements
     - Nice-to-Have Requirements
     - Application Instructions & Deadlines
     - Source URL and extraction date
   - If the fetch fails (e.g., auth-walled or JS-blocked), report the issue to the user without hallucinating content.

2. **Derive Workspace Slug**:
   - Format a clean, lowercase, hyphenated slug: `<company>-<job-title>` (e.g., `semios-quality-assurance-engineer`).
   - Check if `applications/<slug>/` already exists. If so, notify the user and confirm whether to update or keep the existing folder.

3. **Save `job_posting.md`**:
   - Create `applications/<slug>/job_posting.md` with the extracted markdown structure.
   - Example structure:
     ```markdown
     # <Job Title> — <Company>

     - **Source URL**: <URL>
     - **Extracted Date**: <YYYY-MM-DD>
     - **Location**: <Location> (<Remote/Hybrid/Onsite>)
     - **Seniority**: <Level>

     ## Responsibilities
     ...

     ## Requirements
     ### Must-Have
     ...
     ### Nice-to-Have
     ...
     ```

4. **Conclude**:
   - Inform the user that the job posting has been captured in `applications/<slug>/job_posting.md`.
   - Remind them that `apply-job` can be executed whenever they are ready to evaluate fit and generate tailored documents.
