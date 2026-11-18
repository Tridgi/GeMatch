import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import assert from "node:assert/strict";

mkdirSync("screenshots",{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[];
page.on("pageerror",err=>errors.push(err.message));
page.on("console",msg=>{if(msg.type()==="error")errors.push("console: "+msg.text());});
await page.goto("http://127.0.0.1:8765/",{waitUntil:"networkidle"});
assert.match(await page.title(),/GeMatch/);
await page.locator(".menu-screen").waitFor();
await page.screenshot({path:"screenshots/01-menu-desktop.png",fullPage:true});
assert.equal(await page.locator(".menu-logo").count(),1);
const res=await page.evaluate(async ()=>{
  const sources=["bg-menu.avif","bg-map.avif","bg-battle.avif","hero-idle.avif","enemy-mushroom.avif","item-sheet.avif","icon-sheet.avif","logo.avif"];
  return await Promise.all(sources.map(async name=>{
    const img=new Image();
    img.src="./assets/v2/"+name;
    try{await img.decode();return {name,ok:true,width:img.naturalWidth};}catch{return {name,ok:false};}
  }));
});
for(const img of res)assert.ok(img.ok,"Browser could not decode "+img.name);
await page.getByRole("button",{name:/Начать новый забег/}).click();
await page.locator(".route-map").waitFor();
await page.screenshot({path:"screenshots/02-route-desktop.png",fullPage:true});
await page.locator(".map-node.available").first().click();
await page.locator(".battle-stage").waitFor();
await page.screenshot({path:"screenshots/03-battle-desktop.png",fullPage:true});
for(let i=0;i<4;i++)await page.locator(".math-card[data-action='select-card']").nth(i).click();
await page.getByRole("button",{name:/Огненная|Ледяной|Живая|Кристальный/}).first().click();
await page.locator("#puzzle-form").waitFor();
await page.screenshot({path:"screenshots/04-equation-desktop.png",fullPage:true});
await page.getByRole("button",{name:"Пропустить"}).click();
await page.getByRole("button",{name:/Завершить ход/}).click();
await page.screenshot({path:"screenshots/05-battle-after-turn.png",fullPage:true});
const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
mobile.on("pageerror",err=>errors.push("mobile: "+err.message));
await mobile.goto("http://127.0.0.1:8765/",{waitUntil:"networkidle"});
await mobile.screenshot({path:"screenshots/06-menu-mobile.png",fullPage:true});
const hasOverflow=await mobile.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+5);
assert.equal(hasOverflow,false,"Mobile screen has horizontal overflow");
await mobile.getByRole("button",{name:/Начать новый забег/}).click();
await mobile.screenshot({path:"screenshots/07-map-mobile.png",fullPage:true});
if(errors.length)throw new Error(errors.join("\n"));
console.log("PASS: browser scene rendering, image decode, formula modal, turn, mobile layout");
await browser.close();
