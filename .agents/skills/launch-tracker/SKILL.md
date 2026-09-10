---
name: launch-tracker
description: >-
  Check if the front-end job application tracker is already running on localhost (port 5173),
  and if not, automatically start it without creating duplicate instances.
  Use to ensure the application tracker is live and accessible after daily runs or on demand.
---

# Launch Tracker Skill

This skill ensures that the lightweight Job Application Tracker front-end (`http://localhost:5173/`) is active and accessible on the local machine.

---

## Workflow

1. **Check Existing Service**:
   - Run the health check via `python3 scripts/launch_tracker.py`.
   - Checks whether `http://127.0.0.1:5173/` is already active.

2. **Handle Active State (No Duplicates)**:
   - If the application tracker is already running, avoid starting any duplicate processes.
   - Automatically trigger `/api/sync` to refresh the tracker with any newly discovered or drafted applications from the daily run.

3. **Handle Inactive State (Auto-Launch)**:
   - If the application tracker is not running, launch `tracker/server.py 5173` as a detached daemon.
   - Verify that the server is responding to HTTP requests before completing.
   - Direct background output to `logs/tracker.log`.

---

## Command Reference

```bash
python3 scripts/launch_tracker.py
```
