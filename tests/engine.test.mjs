import test from "node:test";
import assert from "node:assert/strict";
import {VERSION,STARTING_DECK,evaluateFormula,spellPower,makePuzzle,createMap,canTravel,drawHand,createRun,enemyFor,resolvePotion,safeParseSaved} from "../src/engine.js";
test("arithmetic cards respect operator precedence inside a composed expression",()=>{
  assert.equal(evaluateFormula(4,"+",3),7);
  assert.equal(evaluateFormula(4,"×",3),12);
  assert.equal(evaluateFormula(4,"−",7),0);
});
test("invalid operations and corrupted operands are rejected",()=>{
  assert.throws(()=>evaluateFormula(4,"/",2));
  assert.throws(()=>evaluateFormula(-1,"+",2));
  assert.throws(()=>evaluateFormula(NaN,"+",2));
});
test("accurate spell beats inaccurate spell",()=>{
  assert.ok(spellPower(4,"+",3,"fire",true)>spellPower(4,"+",3,"fire",false));
  assert.throws(()=>spellPower(4,"+",3,"unknown"));
});
test("puzzles have exact integer solution",()=>{
  for(let i=0;i<50;i++){
    const p=makePuzzle(i,()=>0.4);
    assert.equal(p.a*p.answer+p.b,p.rhs);
  }
});
test("map has three paths for five steps and one boss",()=>{
  const map=createMap(()=>0.3);
  assert.equal(map.length,16);
  assert.equal(map.filter(n=>n.type==="boss").length,1);
  assert.equal(map.filter(n=>n.col===0).length,3);
});
test("route rules only permit advancing one step to an adjacent lane",()=>{
  const map=createMap(()=>0.2);
  assert.ok(canTravel(map.find(n=>n.id==="0-1"),{col:-1,lane:1}));
  assert.ok(!canTravel(map.find(n=>n.id==="2-1"),{col:-1,lane:1}));
  assert.ok(!canTravel(map.find(n=>n.id==="2-2"),{col:1,lane:0}));
  assert.ok(canTravel(map.find(n=>n.id==="2-1"),{col:1,lane:0}));
});
test("every battle hand has resources to assemble a formula",()=>{
  const hand=drawHand(STARTING_DECK,()=>0);
  assert.ok(hand.filter(c=>c.kind==="number").length>=2);
  assert.ok(hand.some(c=>c.kind==="operator"));
  assert.ok(hand.some(c=>c.kind==="spell"));
});
test("runs and enemies have sensible non-negative resources",()=>{
  const run=createRun(()=>0.2);
  assert.equal(run.hp,run.maxHp);
  assert.equal(run.deck.length,STARTING_DECK.length);
  assert.ok(enemyFor("boss").hp>enemyFor("elite").hp);
});
test("alchemy rejects unstable or invalid parameters",()=>{
  assert.deepEqual(resolvePotion("heal",1,1),{strength:7,stable:true,needed:2});
  assert.equal(resolvePotion("fire",3,3).stable,false);
  assert.throws(()=>resolvePotion("fire",0,3));
});
test("stored saves require matching version and a valid deck",()=>{
  assert.equal(safeParseSaved("invalid"),null);
  assert.equal(safeParseSaved('{"version":999}'),null);
  assert.deepEqual(safeParseSaved(JSON.stringify({version:VERSION,meta:{},run:null})),{version:VERSION,meta:{},run:null});
});
