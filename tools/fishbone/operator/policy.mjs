// FISHBONE-003 · Local signed-in browser operator policy.
// Plans are deliberately tiny, declarative, and never contain credentials, JS or CSS selectors.
import { isIP } from "node:net";
import { createHash } from "node:crypto";

export const PLAN_SCHEMA = "fishbone/operator-plan/v1";
const ROLES = new Set(["button","link","tab","menuitem","switch","checkbox","radio"]);
const SITES = Object.freeze({
  supabase: ["supabase.com","app.supabase.com"],
  cloudflare: ["dash.cloudflare.com"],
  "static-id": ["supabase.com","app.supabase.com","dash.cloudflare.com","fileport.abundent.org"]
});
const MAX_STEPS = 25;
const MAX_PLAN_BYTES = 32768;

export function allowedHosts(site) {
  if (!Object.hasOwn(SITES,site)) throw Error("Unsupported operator site. Choose supabase, cloudflare or static-id");
  return [...SITES[site]];
}
export function safeTarget(value,hosts,{allowParameters=false}={}) {
  let u;
  try { u = new URL(value); } catch { throw Error("Operator HOLD: invalid URL"); }
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443") ||
      isIP(u.hostname) || !hosts.includes(u.hostname.toLowerCase()) ||
      (!allowParameters && (u.search || u.hash))) {
    throw Error("Operator HOLD: only approved exact HTTPS origins, no embedded credentials or URL tokens");
  }
  return u;
}
function exactKeys(obj,permitted) {
  return Object.keys(obj).every(k=>permitted.includes(k));
}
export function validatePlan(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      input.schema !== PLAN_SCHEMA || !exactKeys(input,["schema","title","site","steps"])) {
    throw Error("Operator HOLD: unsupported plan shape");
  }
  if (typeof input.title !== "string" || !input.title.trim() || input.title.length > 120 ||
      /[\r\n<>]/.test(input.title)) throw Error("Operator HOLD: invalid plan title");
  const hosts = allowedHosts(input.site);
  if (!Array.isArray(input.steps) || input.steps.length < 1 || input.steps.length > MAX_STEPS) {
    throw Error("Operator HOLD: plan must have 1–25 steps");
  }
  const steps = input.steps.map((s,i)=>{
    if (!s || typeof s !== "object" || Array.isArray(s)) throw Error("Operator HOLD: invalid step " + (i+1));
    if (s.type === "open") {
      if (!exactKeys(s,["type","url"]) || typeof s.url !== "string") throw Error("Operator HOLD: invalid open action");
      return {type:"open",url:safeTarget(s.url,hosts).href};
    }
    if (s.type === "observe") {
      if (!exactKeys(s,["type"])) throw Error("Operator HOLD: observe accepts no parameters");
      return {type:"observe"};
    }
    if (s.type === "click") {
      if (!exactKeys(s,["type","role","name"]) || !ROLES.has(s.role) ||
          typeof s.name !== "string" || !s.name.trim() || s.name.length > 120 ||
          /[\r\n<>]/.test(s.name)) throw Error("Operator HOLD: invalid click descriptor");
      return {type:"click",role:s.role,name:s.name};
    }
    if (s.type === "manual") {
      if (!exactKeys(s,["type","note"]) || typeof s.note !== "string" ||
          !s.note.trim() || s.note.length > 480 || /[\r\n<>]/.test(s.note))
        throw Error("Operator HOLD: invalid manual step");
      return {type:"manual",note:s.note};
    }
    throw Error("Operator HOLD: no arbitrary browser commands, scripts, form values or downloads");
  });
  return {schema:PLAN_SCHEMA,title:input.title,site:input.site,hosts,steps};
}
export function planFingerprint(rawText) {
  if (typeof rawText !== "string" || Buffer.byteLength(rawText,"utf8") > MAX_PLAN_BYTES)
    throw Error("Operator HOLD: plan too large");
  return createHash("sha256").update(rawText).digest("hex");
}
export function profileName(value) {
  if (typeof value !== "string" || !/^[a-z][a-z0-9_-]{1,39}$/i.test(value))
    throw Error("Operator HOLD: profile names are simple local identifiers only");
  return value.toLowerCase();
}
export function approvedActionStep(step, currentUrl, hosts) {
  // Check before scripted clicks; manual sign-in may temporarily navigate elsewhere.
  if (step.type === "click" || step.type === "observe") safeTarget(currentUrl,hosts,{allowParameters:true});
  return true;
}
