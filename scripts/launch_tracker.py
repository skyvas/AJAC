#!/usr/bin/env python3
"""
Automation agent step to ensure the Job Application Tracker front-end
is running on localhost after daily scheduled runs.

Features:
- Checks if the tracker server is already responding on localhost:5173.
- If already running: does nothing (avoids duplicate instances) and optionally syncs fresh postings.
- If not running: launches tracker/server.py as a detached background daemon.
- Verifies server startup and logs status.
"""

import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

DEFAULT_PORT = 5173
HOST = "127.0.0.1"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRACKER_SERVER_SCRIPT = os.path.join(BASE_DIR, "tracker", "server.py")
LOG_DIR = os.path.join(BASE_DIR, "logs")
TRACKER_LOG = os.path.join(LOG_DIR, "tracker.log")


def is_tracker_running(port=DEFAULT_PORT):
    """Check if the tracker HTTP server is active and responding on localhost."""
    url = f"http://{HOST}:{port}/"
    try:
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req, timeout=2) as response:
            return response.status in (200, 301, 302)
    except (urllib.error.URLError, ConnectionError, OSError):
        pass

    # Secondary check: verify socket connection
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(1.0)
    try:
        result = s.connect_ex((HOST, port))
        s.close()
        return result == 0
    except Exception:
        return False


def sync_running_tracker(port=DEFAULT_PORT):
    """Trigger /api/sync on the active tracker so it indexes any newly drafted applications."""
    url = f"http://{HOST}:{port}/api/sync"
    try:
        req = urllib.request.Request(url, data=b"{}", headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200:
                print(f"[Tracker] Successfully synced latest postings to active tracker at http://{HOST}:{port}/")
    except Exception as e:
        print(f"[Tracker] Notice: Could not sync active tracker: {e}")


def launch_tracker(port=DEFAULT_PORT):
    """Launch the tracker server as a persistent background process."""
    os.makedirs(LOG_DIR, exist_ok=True)
    
    print(f"[Tracker] Application tracker not detected on http://{HOST}:{port}/.")
    print(f"[Tracker] Launching application tracker in background...")

    # First ensure data.json is built from current applications
    try:
        subprocess.run(
            [sys.executable, TRACKER_SERVER_SCRIPT, "--build-data"],
            cwd=BASE_DIR,
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
    except Exception:
        pass

    log_file = open(TRACKER_LOG, "a", encoding="utf-8")
    log_file.write(f"\n--- Application Tracker launched at {time.strftime('%Y-%m-%d %H:%M:%S')} ---\n")
    log_file.flush()

    process = subprocess.Popen(
        [sys.executable, TRACKER_SERVER_SCRIPT, str(port)],
        cwd=BASE_DIR,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        start_new_session=True,  # Detach from terminal session so it outlives parent script
    )

    # Wait up to 5 seconds to verify startup
    started = False
    for _ in range(10):
        time.sleep(0.5)
        if is_tracker_running(port):
            started = True
            break

    if started:
        print(f"[Tracker] Application tracker successfully launched (PID: {process.pid}) at http://{HOST}:{port}/")
        return True
    else:
        print(f"[Tracker] Warning: Process spawned (PID: {process.pid}), but port {port} not yet responding. Check {TRACKER_LOG}")
        return False


def main():
    port = DEFAULT_PORT
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        port = int(sys.argv[1])

    if is_tracker_running(port):
        print(f"[Tracker] Application tracker is already running on http://{HOST}:{port}/. Doing nothing (no duplicate started).")
        sync_running_tracker(port)
        return 0
    else:
        success = launch_tracker(port)
        return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
