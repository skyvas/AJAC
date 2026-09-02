---
name: setup-profile
description: >-
  Interview the candidate and initialize or update their master profile, job search preferences,
  and cover letter voice guidelines. Use when the user asks to setup, configure, or update
  their profile, target roles, locations, or application preferences.
---

# Setup Profile Skill

This skill guides an interactive interview with the user to ensure `profile/profile.yaml`, `profile/preferences.yaml`, and `profile/cover_letter_voice.md` accurately reflect the candidate's background, target criteria, and preferred tone.

---

## Workflow Steps

1. **Read Existing Configuration**:
   - Inspect [profile/profile.yaml](../../../profile/profile.yaml) (candidate experience, skills, education).
   - Inspect [profile/preferences.yaml](../../../profile/preferences.yaml) (target roles, locations, work authorization, deal-breakers, portals).
   - Inspect [profile/cover_letter_voice.md](../../../profile/cover_letter_voice.md) (voice and tone guidelines).
   - Summarize the current state in concise bullet points for the user.

2. **Conduct the Alignment Interview**:
   - Ask the user (do not assume) about:
     - **Recent Experience**: Any new roles, promotions, projects, or achievements not yet documented in `experience`.
     - **Target Roles & Locations**: Changes to target job titles or locations. Verify location constraints (e.g., Vancouver, BC, and Remote Canada / US-Remote allowing Canada).
     - **Deal-Breakers & Must-Haves**: Any updated constraints (salary minimums, tech stack requirements, in-office vs hybrid vs remote policies).
     - **Cover Letter Tone**: Whether the tone guidelines in `cover_letter_voice.md` still reflect their preferred style.

3. **Verify Environment & Dependencies**:
   - Ensure the Python virtual environment is set up with required packages (`python-docx`, `pyyaml`):
     ```bash
     .venv/bin/python -c "import docx, yaml; print('Environment OK')"
     ```
   - If missing or broken, initialize:
     ```bash
     python3 -m venv .venv && .venv/bin/pip install -r scripts/requirements.txt
     ```

4. **Apply Updates**:
   - Directly update `profile/profile.yaml`, `profile/preferences.yaml`, and `profile/cover_letter_voice.md` based on the user's responses.
   - Maintain schema integrity and accurate formatting.

5. **Anti-Fabrication Guardrail**:
   - Never invent claims or assume specific metrics. If the user gives vague input ("I helped with CI/CD"), ask for specific tools or measurable outcomes before adding it to `profile.yaml`.

6. **Confirm & Summarize**:
   - Provide a concise summary of changes made to the user.
