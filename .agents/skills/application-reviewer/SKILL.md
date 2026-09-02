---
name: application-reviewer
description: >-
  Critically review drafted resume.yaml and cover_letter.yaml against the job posting, master profile,
  and voice guidelines before documents are compiled. Use to verify drafting accuracy, check for
  fabrication risk, validate tone, and ensure strict grounding.
---

# Application Reviewer Skill

This skill acts as an independent editorial auditor. It reviews drafted `resume.yaml` and `cover_letter.yaml` files before they are compiled to ensure strict truthfulness, voice adherence, and strong alignment with the target posting.

---

## Inputs to Review

When reviewing an application draft, inspect:
1. `applications/<slug>/job_posting.md` (The grounded job posting)
2. `profile/profile.yaml` (The candidate's source-of-truth master profile)
3. `profile/preferences.yaml` (Targeting preferences & work authorization)
4. `profile/cover_letter_voice.md` (Tone, sentence length, and voice guide)
5. `applications/<slug>/resume.yaml` (The drafted tailored resume)
6. `applications/<slug>/cover_letter.yaml` (The drafted tailored cover letter)

---

## Review Rubric (Priority Order)

1. **Fabrication Risk (Top Priority)**:
   - Verify that every skill, tool, bullet point, metric, and responsibility in `resume.yaml` and `cover_letter.yaml` traces directly back to an entry in `profile/profile.yaml`.
   - Flag any technology, framework, or accomplishment that does not exist in `profile.yaml`.

2. **Cover Letter Paragraph 3 Grounding**:
   - Check the "Why This Company" paragraph in `cover_letter.yaml`.
   - Ensure every company mission, product detail, or initiative referenced is explicitly mentioned in `job_posting.md`.
   - Flag generic praise ("industry leader," "cutting-edge innovation") if it lacks specific grounding.

3. **Requirement Alignment**:
   - Check if any must-have requirements from `job_posting.md` that the candidate actually possesses in `profile.yaml` were missed or omitted in `resume.yaml`.

4. **Voice & Tone Drift**:
   - Compare `cover_letter.yaml` against `cover_letter_voice.md`:
     - Natural, direct, confident phrasing without excessive corporate jargon or clichés ("proven track record", "passionate team player").
     - Appropriate sentence length and paragraph structure.
     - Accurate reflection of candidate seniority.

5. **Consistency with Preferences**:
   - If work authorization or location has caveats (e.g., "confirm eligibility for US remote"), ensure the draft does not make false assertions.

---

## Output Format

Report feedback concisely:
- **Status**: Passed / Requires Fixes
- **Issues Found**:
  - `[Location (File + Paragraph/Bullet)]`: Description of the issue, reason for concern, and suggested adjustment.
