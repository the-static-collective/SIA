// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

test('Story DNA Bank offline specimen has parseable JS and source-bound gates visible',()=>{
  const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
  const match=html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match,'inline script is present');
  assert.doesNotThrow(()=>new Script(match[1]));
  assert.match(html,/static-story-dna-bank\/v1/);
  assert.match(html,/STORY CANDIDATE|UNADMITTED/);
  assert.match(html,/localStorage/);
  assert.match(html,/data-mode="echo"/);
  assert.match(html,/data-mode="fork"/);
  assert.match(html,/data-mode="encounter"/);
});

test('Browser app never silently posts private seed data to a service',()=>{
  const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
  assert.doesNotMatch(html,/\bfetch\s*\(/);
  assert.doesNotMatch(html,/XMLHttpRequest/);
  assert.doesNotMatch(html,/sendBeacon/);
  assert.doesNotMatch(html,/<script\s+src\s*=/i);
});
