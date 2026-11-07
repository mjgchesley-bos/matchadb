const dns=require("dns").promises, fs=require("fs");
const hosts=JSON.parse(fs.readFileSync("C:/temp/cafes/retry_hosts_all.json","utf8"));
const live=[]; let i=0, done=0;
async function w(){ while(i<hosts.length){ const h=hosts[i++]; let ok=false;
  for(let t=0;t<2&&!ok;t++){ try{ const a=await dns.resolve4(h); ok=a.length>0; }catch(e){ if(e.code==="ENOTFOUND"||e.code==="ENODATA"){ try{ const b=await dns.resolve6(h); ok=b.length>0;}catch{} break; } } }
  if(ok) live.push(h); if(++done%20000===0) console.log(done, live.length); } }
(async()=>{ await Promise.all(Array.from({length:150},w)); fs.writeFileSync("C:/temp/cafes/retry_hosts_live.json",JSON.stringify(live)); console.log("DONE", hosts.length, "live", live.length); })();
