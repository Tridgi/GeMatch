import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync,statSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve,dirname} from "node:path";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const assets=[
  "bg-battle.avif","bg-lab.avif","bg-map.avif","bg-menu.avif",
  "hero-sheet.avif","enemy-sheet.avif","hero-idle.avif","hero-cast.avif","hero-victory.avif",
  "enemy-slime.avif","enemy-mushroom.avif","enemy-golem.avif","enemy-boss.avif",
  "icon-sheet.avif","item-sheet.avif","ui-sheet.avif","logo.avif"
];
test("all generated visual assets are real non-empty AVIF images",()=>{
  for(const asset of assets){
    const path=resolve(root,"assets/v2",asset);
    assert.ok(existsSync(path),"Missing "+asset);
    const bytes=readFileSync(path);
    assert.ok(statSync(path).size>1000,"Suspicious image size: "+asset);
    assert.equal(bytes.subarray(4,8).toString(),"ftyp","Incorrect AVIF signature: "+asset);
  }
});
test("every v2 image referenced from CSS or HTML exists",()=>{
  const css=readFileSync(resolve(root,"src/visual-v2.css"),"utf8");
  const html=readFileSync(resolve(root,"index.html"),"utf8");
  assert.match(html,/visual-v2\.css/);
  const sources=[...css.matchAll(/url\(["']?(\.\.\/assets\/v2\/[A-Za-z0-9.-]+)["']?\)/g)].map(m=>m[1]);
  assert.ok(sources.length>=12,"Expected image-rich design");
  for(const path of sources) assert.ok(existsSync(resolve(root,"src",path)), "Broken CSS source "+path);
  for(const m of html.matchAll(/\.\/assets\/v2\/([a-z0-9.-]+\.avif)/g))
    assert.ok(existsSync(resolve(root,"assets/v2",m[1])),"Broken HTML asset "+m[1]);
});
