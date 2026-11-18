"""Build and publish without refreshing sources, letting a reviewed, deliberate drop of more than 3% through. Usage: python build_publish_allow.py "reason" """
import sys, json
reason = sys.argv[1] if len(sys.argv) > 1 else None
sys.argv = ["weekly_refresh.py"]
sys.path.insert(0, "C:/temp/weekly")
import weekly_refresh as w
report = {"date": str(w.TODAY), "ok": False, "note": "build+publish only, source refresh skipped", "allow_drop": reason}
tmp_d, tmp_p, new, old, problems, missing = w.build_and_verify(reason)
print("before", old, "after", new, "problems", problems, "gold_missing", missing)
if problems or missing:
    print("NOT PUBLISHING:", problems, missing)
else:
    w.publish(tmp_d, tmp_p, new, old)
    print("published")
