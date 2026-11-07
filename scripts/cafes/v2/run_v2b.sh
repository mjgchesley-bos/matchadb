#!/bin/bash
cd /c/temp/cafes
export UV_THREADPOOL_SIZE=96
node crawl2.cjs hosts_v2_a2.json v2_a2.jsonl 100 > v2_a2.log 2>&1 &
P=$!; 
# the crawler can hang on its last sockets after printing DONE: wait for DONE then stop it
until grep -q "^DONE" v2_a2.log; do sleep 10; done; kill $P 2>/dev/null; touch v2_a2.flag
node crawl2.cjs hosts_v2_b.json v2_b.jsonl 100 > v2_b.log 2>&1 &
P=$!
until grep -q "^DONE" v2_b.log; do sleep 10; done; kill $P 2>/dev/null; touch v2_b.flag
