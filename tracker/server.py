#!/usr/bin/env python3
"""
Lightweight HTTP server and API for AJAC Job Application Tracker.
Provides:
  - GET /api/applications: List all applications with metadata and tracking statuses.
  - POST /api/status: Update an application's status and response status.
  - Serves static assets from tracker/
"""

import http.server
import json
import os
import re
import sys
from datetime import datetime
from urllib.parse import urlparse

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APPS_DIR = os.path.join(BASE_DIR, "applications")
STATUS_FILE = os.path.join(APPS_DIR, "tracker_status.json")
TRACKER_DIR = os.path.join(BASE_DIR, "tracker")
DATA_FILE = os.path.join(TRACKER_DIR, "data.json")


def load_tracker_status():
    if os.path.exists(STATUS_FILE):
        try:
            with open(STATUS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {STATUS_FILE}: {e}")
            return {}
    return {}


def save_tracker_status(status_dict):
    try:
        with open(STATUS_FILE, "w", encoding="utf-8") as f:
            json.dump(status_dict, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving {STATUS_FILE}: {e}")
        return False


def get_all_applications():
    # Cache reports to find extraction dates if missing in posting
    reports = {}
    if os.path.exists(APPS_DIR):
        for rep in os.listdir(APPS_DIR):
            if rep.startswith("report_") and rep.endswith(".md"):
                r_date = rep[7:-3]
                rep_path = os.path.join(APPS_DIR, rep)
                try:
                    with open(rep_path, "r", encoding="utf-8", errors="ignore") as f:
                        for line in f:
                            for slug in re.findall(r"applications/([a-zA-Z0-9_-]+)", line):
                                if slug not in reports:
                                    reports[slug] = r_date
                except Exception:
                    pass

    tracker_status = load_tracker_status()
    applications = []

    if not os.path.exists(APPS_DIR):
        return applications

    for item in sorted(os.listdir(APPS_DIR)):
        item_path = os.path.join(APPS_DIR, item)
        if not os.path.isdir(item_path) or item.startswith(("_", ".")):
            continue

        jp_path = os.path.join(item_path, "job_posting.md")
        date_val = None
        company = None
        title = None
        location = None
        source_url = None

        if os.path.exists(jp_path):
            try:
                with open(jp_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                    # Date extraction
                    m_date = re.search(
                        r"(?:Captured Date|Date Captured|Extracted Date|Date Extracted|Date Fetched|Fetched Date|Date Added|Date)\*\*:\s*([0-9-]+)",
                        content,
                        re.IGNORECASE,
                    )
                    if m_date:
                        date_val = m_date.group(1)

                    # Company extraction
                    m_comp = re.search(r"Company\*\*:\s*(.+)", content)
                    if m_comp:
                        company = m_comp.group(1).strip()

                    # Title extraction
                    m_title = re.search(r"Title\*\*:\s*(.+)", content)
                    if m_title:
                        title = m_title.group(1).strip()

                    # Location extraction
                    m_loc = re.search(r"Location\*\*:\s*(.+)", content)
                    if m_loc:
                        location = m_loc.group(1).strip()

                    # Source URL
                    m_url = re.search(r"Source URL\*\*:\s*(.+)", content)
                    if m_url:
                        source_url = m_url.group(1).strip()

                    # Fallback title & company from H1 header
                    if not title or not company:
                        m_h1 = re.search(r"^#\s*(.+)", content, re.MULTILINE)
                        if m_h1:
                            raw_h1 = m_h1.group(1).strip()
                            if "—" in raw_h1:
                                parts = raw_h1.split("—", 1)
                                if not title:
                                    title = parts[0].strip()
                                if not company and len(parts) > 1:
                                    company = parts[1].strip()
                            elif " - " in raw_h1:
                                parts = raw_h1.split(" - ", 1)
                                if not title:
                                    title = parts[0].strip()
                                if not company and len(parts) > 1:
                                    company = parts[1].strip()
                            elif not title:
                                title = raw_h1
            except Exception as e:
                print(f"Error parsing {jp_path}: {e}")

        # Fallback date from reports
        if not date_val and item in reports:
            date_val = reports[item]

        # Fallback date from fit_evaluation.md
        if not date_val:
            fe_path = os.path.join(item_path, "fit_evaluation.md")
            if os.path.exists(fe_path):
                try:
                    with open(fe_path, "r", encoding="utf-8", errors="ignore") as f:
                        m_fe = re.search(r"(?:Date|Evaluated):\s*([0-9-]+)", f.read())
                        if m_fe:
                            date_val = m_fe.group(1)
                except Exception:
                    pass

        # Fallback date from file modification timestamp
        if not date_val:
            mtime = os.path.getmtime(item_path)
            date_val = datetime.fromtimestamp(mtime).strftime("%Y-%m-%d")

        # Fallback strings
        slug_clean = item.replace("-", " ").title()
        if not company:
            company = slug_clean
        if not title:
            title = slug_clean

        # Available generated files
        files_present = []
        for fn in os.listdir(item_path):
            if fn.endswith((".docx", ".pdf", ".yaml", ".md")):
                files_present.append(fn)

        # Status resolution from tracker_status
        raw_status = tracker_status.get(item, {})
        app_status = raw_status.get("status")
        resp_status = raw_status.get("response_status")

        # Backward-compatibility if legacy keys present
        if raw_status.get("archived") is True or app_status == "did_not_apply":
            app_status = "did_not_apply"
            resp_status = None
        elif not app_status:
            if "stage" in raw_status or "applied_date" in raw_status:
                app_status = "applied"
                if raw_status.get("outcome") == "negative" or raw_status.get("stage") == "rejected":
                    resp_status = "rejected"
                elif raw_status.get("stage") == "interviewing":
                    resp_status = "interviewing"
                elif raw_status.get("stage") == "completed":
                    resp_status = "interview_completed"
                else:
                    resp_status = "no_answer"
            else:
                app_status = "not_applied"
                resp_status = None
        else:
            if app_status == "applied":
                if resp_status not in ("no_answer", "interviewing", "interview_completed", "selected", "rejected"):
                    resp_status = "no_answer"
            else:
                resp_status = None

        applications.append(
            {
                "slug": item,
                "company": company,
                "title": title,
                "location": location or "Not specified",
                "date": date_val,
                "source_url": source_url or "",
                "status": app_status,
                "response_status": resp_status,
                "updated_at": raw_status.get("updated_at", ""),
                "notes": raw_status.get("notes", ""),
                "files": files_present,
            }
        )

    # Sort applications by date descending by default
    applications.sort(key=lambda x: (x["date"] or "", x["company"].lower()), reverse=True)
    return applications


def build_data_json():
    apps = get_all_applications()
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(apps, f, indent=2)
    print(f"Generated {DATA_FILE} with {len(apps)} applications.")
    return apps


class TrackerRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=TRACKER_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path in ("/api/applications", "/api/sync"):
            apps = build_data_json()
            data = json.dumps(apps).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return

        if parsed.path == "/":
            self.path = "/index.html"

        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/sync":
            apps = build_data_json()
            response_data = json.dumps({
                "success": True,
                "count": len(apps),
                "applications": apps
            }).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response_data)))
            self.end_headers()
            self.wfile.write(response_data)
            return

        if parsed.path == "/api/status":
            content_len = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_len)
            try:
                payload = json.loads(body.decode("utf-8"))
                slug = payload.get("slug")
                status = payload.get("status")  # "not_applied" or "applied"
                response_status = payload.get("response_status")  # "no_answer", "rejected", or None

                if not slug:
                    self.send_error(400, "Missing slug")
                    return

                if status not in ("not_applied", "applied", "did_not_apply"):
                    self.send_error(400, "Invalid status")
                    return

                if status == "applied":
                    if response_status not in ("no_answer", "interviewing", "interview_completed", "selected", "rejected"):
                        response_status = "no_answer"
                else:
                    response_status = None

                tracker_status = load_tracker_status()
                existing = tracker_status.get(slug, {})
                existing["status"] = status
                existing["response_status"] = response_status
                if status == "did_not_apply":
                    existing["archived"] = True
                else:
                    existing.pop("archived", None)
                existing["updated_at"] = datetime.utcnow().isoformat() + "Z"
                tracker_status[slug] = existing

                save_tracker_status(tracker_status)

                # Also refresh data.json
                build_data_json()

                response_data = json.dumps(
                    {
                        "success": True,
                        "slug": slug,
                        "status": status,
                        "response_status": response_status,
                        "updated_at": existing["updated_at"],
                    }
                ).encode("utf-8")

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(response_data)))
                self.end_headers()
                self.wfile.write(response_data)
                return
            except Exception as e:
                self.send_error(500, f"Error processing status update: {e}")
                return

        self.send_error(404, "Not Found")


def run(port=5173):
    build_data_json()
    server_address = ("", port)
    httpd = http.server.HTTPServer(server_address, TrackerRequestHandler)
    print(f"Job Application Tracker server running at http://localhost:{port}/")
    print(f"Serving tracker UI from: {TRACKER_DIR}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.server_close()


if __name__ == "__main__":
    if "--build-data" in sys.argv:
        build_data_json()
    else:
        port = 5173
        for arg in sys.argv[1:]:
            if arg.isdigit():
                port = int(arg)
        run(port)
