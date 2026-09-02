---
name: apply-job
description: >-
  Evaluate a job posting's fit against candidate preferences, draft a tailored resume and cover letter,
  conduct an anti-fabrication review, and generate formatted .docx and .pdf files. Use when the user asks
  to apply to a job, tailor application documents for a posting URL, or generate resume and cover letter.
---

# Apply Job Skill

This skill performs end-to-end processing of a job application: extracting the posting, evaluating fit against candidate criteria, drafting tailored YAML files for the resume and cover letter, executing a pre-generation quality review, and compiling the final Word (`.docx`) and PDF (`.pdf`) documents.

---

## Workflow Steps

1. **Read Ground Truth Context**:
   - Inspect [profile/profile.yaml](../../../profile/profile.yaml) (candidate's actual skills, experience, education).
   - Inspect [profile/preferences.yaml](../../../profile/preferences.yaml) (criteria, target roles, dealbreakers).
   - Inspect [profile/cover_letter_voice.md](../../../profile/cover_letter_voice.md) (cover letter voice and structure rules).

2. **Retrieve or Ingest the Job Posting**:
   - If `applications/<slug>/job_posting.md` already exists, load it as the grounded source.
   - Otherwise, fetch the posting URL provided by the user, extract all role requirements, derive the `<company-title-slug>`, and write `applications/<slug>/job_posting.md`.

3. **Evaluate Fit & Write `fit_evaluation.md`**:
   - Compare the posting requirements against `profile/preferences.yaml` and `profile/profile.yaml`.
   - Score the fit: **High**, **Medium**, or **Low** / **Deal-Breaker**.
   - Save the detailed analysis to `applications/<slug>/fit_evaluation.md`.
   - *Checkpoint*: If a deal-breaker is triggered or work authorization is questionable (e.g. US-remote without Canadian authorization), alert the user before proceeding to draft.

4. **Draft Tailored `resume.yaml`**:
   - Create `applications/<slug>/resume.yaml` adhering to the schema in `profile/profile.yaml`.
   - **Tailoring Rules**:
     - Tailor the `headline` to mirror the target title and key technologies.
     - Rewrite the `summary` to foreground the specific overlap between candidate experience and role needs.
     - Reorder competencies and experience bullets so the most relevant points appear first.
     - **Strict Anti-Fabrication Rule**: Do NOT invent bullets, technologies, or metrics. Every bullet must trace back to `profile/profile.yaml`.

5. **Draft Tailored `cover_letter.yaml`**:
   - Create `applications/<slug>/cover_letter.yaml` adhering to `applications/_example/cover_letter.yaml`.
   - Follow the structure outlined in `profile/cover_letter_voice.md`:
     - **Paragraph 1**: Hook & role interest.
     - **Paragraph 2**: Relevant technical accomplishments & overlap.
     - **Paragraph 3 (Why this company)**: Grounded strictly in specific facts from `job_posting.md`.
     - **Paragraph 4**: Value proposition and closing.

6. **Execute Application Review**:
   - Apply the `application-reviewer` skill checks:
     - Verify no ungrounded claims or invented tools exist.
     - Confirm Paragraph 3 of the cover letter references genuine details from `job_posting.md`.
     - Ensure alignment with tone and voice rules.
   - Refine the YAML drafts if any issues are identified.

7. **Compile `.docx` and `.pdf` Documents**:
   - Run the Python document compiler:
     ```bash
     .venv/bin/python scripts/generate_docx.py resume applications/<slug>/resume.yaml applications/<slug>/AVashista_resume.docx
     .venv/bin/python scripts/generate_docx.py cover-letter applications/<slug>/cover_letter.yaml applications/<slug>/AVashista_cover_letter.docx
     ```
   - Verify that the resulting `.docx` and `.pdf` files are generated cleanly.

8. **Summarize for the User**:
   - Present the fit verdict, highlighting key alignments and any caveats.
   - Provide clickable paths to the generated files:
     - `applications/<slug>/fit_evaluation.md`
     - `applications/<slug>/AVashista_resume.docx` / `AVashista_resume.pdf`
     - `applications/<slug>/AVashista_cover_letter.docx` / `AVashista_cover_letter.pdf`
   - Remind the candidate to perform a final manual proofread before submitting.
