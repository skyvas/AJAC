# Workspace Rules: Job Application & Document Generation

These rules govern how Gemini operates across the `ai_apply` workspace when evaluating postings, drafting application documents, and rendering `.docx` and `.pdf` files.

---

## 1. Grounding & Anti-Fabrication Constraints

- **Strict Source of Truth**: All experience, competencies, strengths, tools, and education listed in `resume.yaml` and `cover_letter.yaml` must derive directly from `profile/profile.yaml`.
- **Allowed Tailoring**:
  - Reordering experience bullets to place the most relevant achievements at the top.
  - Emphasizing matching technologies and methodologies that the candidate has proven experience with.
  - Rewording headlines and summaries to match the target posting's terminology truthfully.
- **Disallowed Modifications**:
  - Adding unverified frameworks, languages, or tools not present in `profile.yaml`.
  - Inflating metrics, responsibilities, or ownership.
  - Inventing company-specific facts in cover letters that do not exist in `job_posting.md`.

---

## 2. Document Generation Protocols

When creating or modifying application documents:

1. **Working in Application Workspaces**:
   - Each job opportunity has its own slug directory under `applications/<company-title-slug>/` (lowercase, hyphenated).
   - Core artifacts in an application workspace:
     - `job_posting.md`: Grounded source data for the job posting.
     - `fit_evaluation.md`: Rubric evaluation against `preferences.yaml`.
     - `resume.yaml`: Tailored resume data adhering to the schema in `profile/profile.yaml`.
     - `cover_letter.yaml`: Tailored cover letter adhering to the schema in `applications/_example/cover_letter.yaml`.
     - `AVashista_resume.docx` & `.pdf`: Compiled Word & PDF files.
     - `AVashista_cover_letter.docx` & `.pdf`: Compiled Word & PDF files.

2. **Compiling `.docx` and `.pdf`**:
   - Always run the generation script using the virtual environment:
     ```bash
     .venv/bin/python scripts/generate_docx.py resume applications/<slug>/resume.yaml applications/<slug>/AVashista_resume.docx
     .venv/bin/python scripts/generate_docx.py cover-letter applications/<slug>/cover_letter.yaml applications/<slug>/AVashista_cover_letter.docx
     ```
   - Note: The `generate_docx.py` script automatically creates matching `.pdf` files alongside the `.docx` files when LibreOffice is available.

---

## 3. Scam Screening Rules

Before drafting documents for any listing found via scraping or manual input, screen for red flags:
- Lack of verifiable company web domain or professional presence.
- Upfront requests for money, checks, training equipment purchases, or software fees.
- Personal email domains (`@gmail.com`, `@yahoo.com`, `@outlook.com`) or chat apps (`Telegram`, `WhatsApp`) used as the sole application channel.
- Requests for sensitive personal data (SIN/SSN, passport, banking info) prior to interviews.
- Exclude suspicious listings and record them under the `Excluded — suspected scam` table in scrape logs/reports.
