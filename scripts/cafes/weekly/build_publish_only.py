import sys, json
sys.argv = ["weekly_refresh.py"]
sys.path.insert(0, "C:/temp/weekly")
import weekly_refresh as w
report = {"date": str(w.TODAY), "ok": False, "note": "build+publish only, source refresh skipped (Hugging Face 429)"}
tmp_d, tmp_p, new, old, problems, missing = w.build_and_verify(None)
print("before", old, "after", new, "problems", problems, "gold_missing", missing)
if problems:
    print("NOT PUBLISHING:", problems)
else:
    w.publish(tmp_d, tmp_p, new, old)
    print("published")
