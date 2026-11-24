#!/usr/bin/env node
// FISHBONE-003: local human-approved browser operator. No hosted agent, API credits,
// remote browser relay, secret harvesting, browser extension or hidden execution.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import {
  allowedHosts, safeTarget, validatePlan, planFingerprint,
  profileName, approvedActionStep
} from "./policy.mjs";

const HELP = [
  "FISHBONE-003 · Local browser operator (signed-in profiles stay on this computer)",
  "",
  "  node tools/fishbone/operator/cli.mjs open --site static-id --profile static-id",
  "  node tools/fishbone/operator/cli.mjs run tools/fishbone/operator/plans/static-id.json --profile static-id",
  "",
  "First install Playwright locally: npm install --no-save playwright && npx playwright install chromium",
  "Browser actions require human approval. Passwords, codes, and API secrets are entered in the visible browser only."
].join("\n");

function opt(args,key,fallback) {
  const pos=args.indexOf(key);
  if (pos===-1) return fallback;
  if (!args[pos+1] || args[pos+1].startsWith("--")) throw Error("Missing value after " + key);
  return args[pos+1];
}
function detail(step) {
  switch(step.type) {
    case "open": return "OPEN " + step.url;
    case "observe": return "OBSERVE page title and short heading list locally";
    case "click": return "CLICK exact " + step.role + ' named "' + step.name + '"';
    case "manual": return "MANUAL: " + step.note;
    default: throw Error("Unsupported step");
  }
}
function redactedLocation(page) {
  try {
    const url=new URL(page.url());
    return {host:url.host}; // No path/query/fragment or OAuth authorization codes in receipts.
  } catch { return {host:"not-on-a-website"}; }
}
async function observe(page,hosts) {
  approvedActionStep({type:"observe"},page.url(),hosts);
  const url=new URL(page.url());
  const title=await page.title();
  const headings=(await page.getByRole("heading").allTextContents()).slice(0,10)
    .map(x=>x.replace(/\s+/g," ").trim().slice(0,100)).filter(Boolean);
  stdout.write(JSON.stringify({
    status:"LOCAL_ONLY_NOT_ARCHIVED",origin:url.origin,path:url.pathname,
    title:title.slice(0,180),headings
  },null,2)+"\n");
}
async function enterApproval(rl,label) {
  while (true) {
    const answer=(await rl.question(label + "   [a]pply / [s]kip / [q]uit: ")).trim().toLowerCase();
    if (["a","s","q"].includes(answer)) return answer;
    stdout.write("Type a, s, or q. No action was taken.\n");
  }
}
async function browserContext(profileDir) {
  let chromium;
  try { ({chromium}=await import("playwright")); }
  catch { throw Error("Playwright is not installed. Run SETUP-WINDOWS.cmd or install Playwright locally."); }
  await mkdir(profileDir,{recursive:true,mode:0o700});
  const options={headless:false,acceptDownloads:false,viewport:{width:1280,height:800},
    serviceWorkers:"allow"};
  // Prefer already installed Microsoft Edge on Windows. Fall back to bundled Chromium.
  if (process.platform==="win32") {
    try { return await chromium.launchPersistentContext(profileDir,{...options,channel:"msedge"}); }
    catch { /* Falls back to locally installed Playwright Chromium. */ }
  }
  return chromium.launchPersistentContext(profileDir,options);
}
async function executeStep(page,step,hosts) {
  if (step.type==="open") {
    const url=safeTarget(step.url,hosts);
    await page.goto(url.href,{waitUntil:"domcontentloaded",timeout:30000});
    return;
  }
  approvedActionStep(step,page.url(),hosts);
  if (step.type==="observe") return observe(page,hosts);
  if (step.type==="click") {
    const locator=page.getByRole(step.role,{name:step.name,exact:true});
    const count=await locator.count();
    if (count!==1) throw Error("Expected exactly one matching visible control, found "+count);
    if (!await locator.isVisible()) throw Error("Control is not visible");
    await locator.click({timeout:12000});
    return;
  }
  throw Error("Unsupported automatic action");
}
async function writeReceipt(records,identity) {
  const path=resolve(".fishbone/operator-receipts");
  await mkdir(path,{recursive:true,mode:0o700});
  const file=join(path,Date.now()+"-"+randomUUID()+".json");
  // Only step type, success/hold, human approval, host; never browser content, URLs, codes, tokens.
  const receipt={schema:"fishbone/operator-receipt/v1",
    createdAt:new Date().toISOString(),operator:identity.operator,
    profile:identity.profile,site:identity.site,planSha256:identity.planSha256||null,
    results:records};
  await writeFile(file,JSON.stringify(receipt,null,2)+"\n",{mode:0o600,flag:"wx"});
  stdout.write("Local private receipt: "+file+"\n");
}
async function main() {
  const argv=process.argv.slice(2),command=argv[0];
  if (!["open","run"].includes(command)) { stdout.write(HELP+"\n");process.exitCode=command?1:0;return; }
  if (!stdin.isTTY) throw Error("Operator HOLD: interactive terminal required; unattended execution is disabled");
  const profile=profileName(opt(argv,"--profile","static-id"));
  let site, plan=null, sha=null;
  if (command==="open") {
    site=opt(argv,"--site","static-id");
    allowedHosts(site);
  } else {
    const filename=argv[1];
    if (!filename || filename.startsWith("--")) throw Error("Run needs a local JSON plan path");
    const data=await readFile(resolve(filename),"utf8");
    sha=planFingerprint(data);
    plan=validatePlan(JSON.parse(data));
    site=plan.site;
  }
  const hosts=allowedHosts(site);
  const profileDir=resolve(".fishbone/operator-profiles",profile);
  stdout.write("\nFISHBONE LOCAL OPERATOR\n");
  stdout.write("Profile stays on THIS COMPUTER: "+profileDir+"\n");
  stdout.write("Approved scripted hosts: "+hosts.join(", ")+"\n");
  stdout.write("Never type a password, Proton code or API key into this terminal or a plan file.\n");
  stdout.write("Use the actual browser window for sign-in and sensitive form fields.\n\n");
  const rl=createInterface({input:stdin,output:stdout});
  const records=[];
  let context=null;
  try {
    const answer=(await rl.question("Open your private browser profile? [y/N]: ")).trim().toLowerCase();
    if (answer!=="y") {stdout.write("HOLD: no browser opened.\n");return;}
    context=await browserContext(profileDir);
    const page=context.pages()[0] || await context.newPage();
    if (command==="open") {
      const landing=site==="cloudflare"?"https://dash.cloudflare.com/":
        "https://supabase.com/dashboard/project/kbhqacsdvjsstzyplqij/auth";
      await page.goto(landing,{waitUntil:"domcontentloaded",timeout:30000});
      stdout.write("Sign in in the browser. Only the LOCAL browser stores its cookies.\n");
      await rl.question("When finished, press Enter here to close the browser (profile remains saved). ");
      records.push({step:0,kind:"manual-signin",result:"LOCAL_BROWSER_OPENED",...redactedLocation(page)});
      return;
    }
    stdout.write("\nPlan: "+plan.title+" ("+plan.steps.length+" steps)\n");
    stdout.write("SHA-256 "+sha+"\n");
    for (const [i,step] of plan.steps.entries()) {
      stdout.write("\nSTEP "+(i+1)+"/"+plan.steps.length+" · "+detail(step)+"\n");
      if (step.type==="manual") {
        stdout.write("Perform the step in the visible browser. Don't record secrets.\n");
        const answer=(await rl.question("Press Enter when finished, or type q to stop: ")).trim().toLowerCase();
        if (answer==="q") {records.push({step:i+1,kind:step.type,result:"STOPPED"});break;}
        records.push({step:i+1,kind:step.type,result:"HUMAN_COMPLETED_UNVERIFIED",...redactedLocation(page)});
        continue;
      }
      const approved=await enterApproval(rl,"Step "+(i+1));
      if (approved==="q") {records.push({step:i+1,kind:step.type,result:"STOPPED"});break;}
      if (approved==="s") {records.push({step:i+1,kind:step.type,result:"SKIPPED"});continue;}
      try {
        await executeStep(page,step,hosts);
        records.push({step:i+1,kind:step.type,result:"EXECUTED",...redactedLocation(page)});
        stdout.write("Executed. Confirm the result in the visible browser.\n");
      } catch {
        records.push({step:i+1,kind:step.type,result:"HOLD_ACTION_FAILED",...redactedLocation(page)});
        stdout.write("HOLD: action failed or location/selector was not approved. No retry.\n");
        break;
      }
    }
    await rl.question("\nPress Enter to close the browser and save an evidence-minimal receipt. ");
  } finally {
    if (context) await context.close();
    rl.close();
    await writeReceipt(records,{operator:"explicit-human-approval",profile,site,planSha256:sha});
  }
}
main().catch(e=>{console.error("FISHBONE HOLD: "+e.message);process.exitCode=1;});
