---
name: scrape-jobs
description: >-
  Search job portals (LinkedIn, Indeed, BrianJobs, BuiltIn, and direct ATS boards) for openings
  matching candidate preferences, screen out scams, evaluate fit, and generate a daily scrape log.
  Use when the user asks to find new jobs, search for open positions, or scrape job boards.
---

# Scrape Jobs Skill

This skill executes multi-portal job searches, validates company legitimacy to filter out recruiter scams, rates each opportunity's fit (High / Medium / Low) against the candidate's preferences, and persists the results into a dated scrape log.

---

## Workflow Steps

1. **Read Search Preferences**:
   - Read [profile/preferences.yaml](../../../profile/preferences.yaml) to extract:
     - `target_roles`: Roles spanning QA, SDET, Automation, and Lead levels.
     - `locations` & `work_authorization`: Accepted locations and Canadian remote eligibility.
     - `must_haves`, `nice_to_haves`, `deal_breakers`, and `portals`.

2. **Formulate Targeted Search Queries**:
   - Construct targeted search queries across configured job boards:
     - `site:linkedin.com/jobs QA Engineer Vancouver`
     - `site:ca.indeed.com/viewjob QA Automation Vancouver`
     - `site:ca.indeed.com "SDET" "Vancouver"`
     - `site:brianjobs.com QA Automation Canada`
     - `site:builtinvancouver.org QA Engineer`
     - `site:boards.greenhouse.io QA Vancouver OR Remote Canada`
     - `site:jobs.lever.co "QA Engineer" Vancouver`
     - `site:jobs.ashbyhq.com SDET Canada`
   - Cover the full seniority range (Junior to Lead) and both manual & automation QA titles.
   - Group queries efficiently to provide comprehensive coverage across 10–15 search executions.

3. **Execute Searches & Deduplicate**:
   - Search the web using the queries.
   - Extract posting metadata: Title, Company, Location, Portal, and URL.
   - Deduplicate results by `(company, title)`.

4. **Fetch Details for Ambiguous Postings**:
   - If search snippets lack necessary details (remote eligibility, seniority, core stack), read the page content to confirm.
   - Skip fetching obviously ineligible postings (e.g., in rejected locations).
   - Filter out expired or stale listings.

5. **Screen for Scams & Fraudulent Listings**:
   - Screen each candidate company for red flags:
     - No discoverable company web presence or zero legitimate LinkedIn footprint.
     - Upfront requests for money, deposits, or equipment purchases.
     - Demands for bank details, SIN/SSN, or passport/ID scans prior to any interview.
     - Sole contact via personal email (`@gmail.com`) or chat apps (`Telegram`, `WhatsApp`).
     - Implausibly high compensation without specific job requirements.
     - Generic, template-only job descriptions.
   - Exclude flagged listings from the fit ranking and place them under the `Excluded — suspected scam` section.

6. **Evaluate Fit (High / Medium / Low)**:
   - **Reject Outright**: Postings hitting a `deal_breaker` or located in a `rejected` location.
   - **Remote - US**: If US-only without confirmed Canadian remote work, classify as "confirm eligibility".
   - **High Fit**: Meets all `must_haves`, multiple `nice_to_haves`, appropriate seniority and tech stack.
   - **Medium Fit**: Meets `must_haves` with fewer `nice_to_haves`, or minor seniority stretch.
   - **Low Fit**: Borderline on a must-have or significant seniority mismatch (listed with explanation).

7. **Format & Present Results**:
   - Render a markdown table sorted High → Medium → Low:
     `| Title | Company | Location | Portal | Fit | Why | URL |`
   - Include the `Excluded — suspected scam` table if any postings were flagged:
     `| Title | Company | URL | Red flag(s) |`

8. **Persist Scrape Log**:
   - Save/append the output to `applications/scrape_<YYYY-MM-DD>.md`.
   - If the file exists for today, append new postings and deduplicate against existing entries by URL.

9. **Next Steps**:
   - Advise the user that they can run the `apply-job` skill on any chosen URL from the results table.
