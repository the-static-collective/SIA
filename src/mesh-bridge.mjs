// SIA Linkbank × HUMKIN MESH: owner-reviewed import of permanent media doorways.
// Adds or revises public REFERENCES only; never imports local files or media rights.
import {validateRegistry,safePublicUrl} from "./linkbank.mjs";
const SLUG=/^[a-z0-9](?:[a-z0-9-]{2,38}[a-z0-9])$/;
const STAMP=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
export function mergeMeshLinks(input,exported,since,reason){
 validateRegistry(input);
 if(!exported||exported.schema!=="humkin.mesh/sia-export/v1"||
  !Array.isArray(exported.links)||exported.links.length>10000)throw Error("Bad HUMKIN MESH export");
 if(!STAMP.test(since)||new Date(since).toISOString()!==since||
   typeof reason!=="string"||!reason.trim()||reason.length>240)
  throw Error("A precise timestamp and a reviewed reason are required");
 const out=structuredClone(input);
 const ids=new Set();
 for(const link of exported.links){
  if(!link||typeof link.id!=="string"||!SLUG.test(link.id)||
     ids.has(link.id)||typeof link.title!=="string"||
     !link.title.trim()||link.title.length>240||
     !["active","held"].includes(link.status))throw Error("Invalid or duplicate MESH reference");
  ids.add(link.id);
  const expected="https://humkin.abundent.org/m/?id="+link.id;
  safePublicUrl(link.url);
  if(link.url!==expected)throw Error("MESH references must use exact operator-controlled permanent URL");
  let asset=out.assets.find(x=>x.id===link.id);
  if(!asset){
   out.assets.push({id:link.id,type:"music",title:link.title,status:link.status,
     locations:[{url:expected,since,reason}]});
   continue;
  }
  if(asset.type!=="music")throw Error("Cannot replace a non-music asset identity");
  const previous=asset.locations.at(-1);
  if(previous.url!==expected){
   if(since<=previous.since)throw Error("Cannot backdate a repointed reference");
   asset.locations.push({url:expected,since,reason});
  }
  asset.title=link.title;
  asset.status=link.status;
 }
 return validateRegistry(out);
}
