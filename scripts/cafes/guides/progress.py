"""Tiny progress reporter. Every long job writes one JSON file here; the progress page (server.py) shows one bar per file.

As a library:
    sys.path.insert(0, "C:/temp/cafes/progress"); from progress import Task
    t = Task("guide-verify", "Checking guide cafés on their own sites", total=111, unit="cafés")
    t.update(done=5, detail="Palomino: matcha on menu")      # throttled, safe to call in a loop
    t.finish("12 verified, 99 left as leads")                # or t.fail("why")

From the shell (for steps I do by hand):
    python -I progress.py ID --title "..." --steps "Read guides|Check sites|Publish" --step 2 [--detail "..."] [--state waiting|running|done|failed]
    --step N marks steps 1..N-1 done and step N as the one in progress (N beyond the last = everything done).
"""
import json, os, sys, time

DIR = "C:/temp/cafes/progress/tasks"
os.makedirs(DIR, exist_ok=True)


def _write(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False)
    for _ in range(5):                       # the page may be reading the file at this moment
        try:
            os.replace(tmp, path)
            return
        except PermissionError:
            time.sleep(0.05)


class Task:
    def __init__(self, id, title, total=0, unit="items", steps=None, detail=""):
        self.path = f"{DIR}/{id}.json"
        self.d = {"id": id, "title": title, "state": "running", "done": 0, "total": total, "unit": unit, "detail": detail,
                  "started": time.time(), "updated": time.time(), "pid": os.getpid(), "steps": [{"t": s, "s": "todo"} for s in (steps or [])]}
        self._last = 0
        self.save()

    def save(self):
        self.d["updated"] = time.time()
        _write(self.path, self.d)
        self._last = time.time()

    def update(self, done=None, detail=None, total=None, force=False):
        if done is not None:
            self.d["done"] = done
        if total is not None:
            self.d["total"] = total
        if detail is not None:
            self.d["detail"] = detail
        if force or time.time() - self._last >= 2:
            self.save()

    def finish(self, detail=None):
        self.d["state"] = "done"
        if self.d["total"]:
            self.d["done"] = self.d["total"]
        if detail is not None:
            self.d["detail"] = detail
        self.save()

    def fail(self, detail):
        self.d["state"], self.d["detail"] = "failed", detail
        self.save()


def set_steps(id, title, steps, step, detail=None, state=None):
    """Hand-driven checklist: steps before `step` are done, `step` is in progress, the rest wait."""
    path = f"{DIR}/{id}.json"
    try:
        d = json.load(open(path, encoding="utf-8"))
    except Exception:
        d = {"id": id, "started": time.time(), "done": 0, "total": 0, "unit": "", "detail": ""}
    d["title"], d["pid"], d["updated"] = title, 0, time.time()
    d["steps"] = [{"t": t, "s": "done" if i + 1 < step else ("now" if i + 1 == step else "todo")} for i, t in enumerate(steps)]
    finished = step > len(steps)
    d["state"] = state or ("done" if finished else "running")
    if state == "waiting" and 1 <= step <= len(steps):
        d["steps"][step - 1]["s"] = "wait"
    if state == "failed" and 1 <= step <= len(steps):
        d["steps"][step - 1]["s"] = "bad"
    if detail is not None:
        d["detail"] = detail
    _write(path, d)


if __name__ == "__main__":
    import argparse
    a = argparse.ArgumentParser()
    a.add_argument("id"); a.add_argument("--title", required=True); a.add_argument("--steps", required=True)
    a.add_argument("--step", type=int, required=True); a.add_argument("--detail"); a.add_argument("--state")
    x = a.parse_args()
    set_steps(x.id, x.title, x.steps.split("|"), x.step, x.detail, x.state)
