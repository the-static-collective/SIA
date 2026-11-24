import test from "node:test";
import assert from "node:assert/strict";
import {
  PLAN_SCHEMA,allowedHosts,safeTarget,validatePlan,planFingerprint,
  profileName,approvedActionStep
} from "../tools/fishbone/operator/policy.mjs";

const plan = () => ({
  schema:PLAN_SCHEMA,title:"STATIC ID · Browser setup",site:"static-id",
  steps:[
    {type:"open",url:"https://supabase.com/dashboard/project/kbhqacsdvjsstzyplqij/auth"},
    {type:"manual",note:"Use the browser to sign in. Never put codes into this plan."},
    {type:"observe"},
    {type:"click",role:"link",name:"OAuth Server"},
    {type:"open",url:"https://dash.cloudflare.com/"}
  ]
});

test("only exact first-party HTTPS origins are authorized for scripted navigation",()=>{
  const hosts=allowedHosts("static-id");
  assert.deepEqual(hosts,["supabase.com","app.supabase.com","dash.cloudflare.com","fileport.abundent.org"]);
  assert.equal(safeTarget("https://dash.cloudflare.com/",hosts).hostname,"dash.cloudflare.com");
  for(const url of [
    "http://dash.cloudflare.com/",
    "https://dash.cloudflare.com.attacker.tld/",
    "https://attacker.tld/",
    "https://127.0.0.1/",
    "https://dash.cloudflare.com:8443/",
    "https://someone:password@dash.cloudflare.com/",
    "file:///etc/passwd",
    "https://dash.cloudflare.com/?token=secret",
    "https://dash.cloudflare.com/#/hidden-secret"
  ]) assert.throws(()=>safeTarget(url,hosts),/HOLD/);
  assert.throws(()=>safeTarget("https://dash.cloudflare.com/",allowedHosts("supabase")),/HOLD/);
  assert.throws(()=>allowedHosts("everything"),/Unsupported/);
});

test("plan is fixed shape with no code execution, CSS selectors, form values or credential fields",()=>{
  const ok=validatePlan(plan());
  assert.equal(ok.steps.length,5);
  assert.equal(ok.steps[3].role,"link");
  const cases=[
    {...plan(),steps:[{type:"evaluate",code:"fetch('https://attacker.tld')"}]},
    {...plan(),steps:[{type:"fill",name:"password",value:"secret"}]},
    {...plan(),steps:[{type:"click",role:"button",name:"Enable",value:"secret"}]},
    {...plan(),steps:[{type:"click",role:"link",name:"OAuth Server",selector:"#app"}]},
    {...plan(),steps:[{type:"open",url:"https://dash.cloudflare.com/?api_key=abc"}]},
    {...plan(),steps:[{type:"observe",javascript:"alert(1)"}]},
    {...plan(),steps:[{type:"manual",note:"bad\nscript"}]},
    {...plan(),site:"cloudflare"},
    {...plan(),steps:new Array(26).fill({type:"observe"})},
    {...plan(),unknown:true}
  ];
  for(const bad of cases) assert.throws(()=>validatePlan(bad),/HOLD/);
});

test("scripted clicks and observations HOLD outside allowed origins even with manually authenticated browser",()=>{
  const hosts=allowedHosts("static-id");
  assert.equal(approvedActionStep({type:"click",role:"button",name:"Save"},
    "https://supabase.com/dashboard?state=private",hosts),true);
  assert.throws(()=>approvedActionStep({type:"click",role:"button",name:"Save"},
    "https://accounts.google.com/signin",hosts),/HOLD/);
  assert.throws(()=>approvedActionStep({type:"observe"},
    "about:blank",hosts),/HOLD/);
});
test("profile names cannot escape the ignored local profile root",()=>{
  assert.equal(profileName("Static-ID"),"static-id");
  for(const name of ["../outside","..","A","/tmp","a/../foo","a\\secret","a b",".env"]) {
    assert.throws(()=>profileName(name),/HOLD/);
  }
});
test("plan fingerprint is stable and huge plan is refused",()=>{
  assert.equal(planFingerprint("test").length,64);
  assert.equal(planFingerprint("test"),planFingerprint("test"));
  assert.notEqual(planFingerprint("test"),planFingerprint("Test"));
  assert.throws(()=>planFingerprint("x".repeat(32769)),/HOLD/);
});
