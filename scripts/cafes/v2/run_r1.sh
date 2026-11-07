#!/bin/bash
cd /c/temp/cafes
UV_THREADPOOL_SIZE=64 node crawl2.cjs hosts_v2_r1.json v2_r1.jsonl 60 > v2_r1.log 2>&1 &
NP=$!
until grep -q "^DONE" v2_r1.log; do sleep 20; done
kill $NP 2>/dev/null
touch v2_r1.flag
