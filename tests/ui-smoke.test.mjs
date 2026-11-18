import test from "node:test";
import assert from "node:assert/strict";

test("player can start a run, cast a formula, win a fight and choose a reward",async()=>{
  const listeners={};
  let inputValue="";
  const root={innerHTML:"",addEventListener(name,handler){listeners[name]=handler;}};
  const values=new Map();
  globalThis.localStorage={
    getItem(key){return values.get(key)||null;},
    setItem(key,value){values.set(key,value);}
  };
  globalThis.document={
    getElementById(id){assert.equal(id,"app");return root;},
    querySelector(selector){
      if(selector==="#equation-answer")return {value:inputValue};
      return null;
    },
    addEventListener(){}
  };
  await import("../src/main.js?smoke="+Date.now());
  const save=()=>JSON.parse(values.get("gematch-save-v1"));
  const click=(action,data={})=>{
    const node={dataset:{action,...data},disabled:false};
    listeners.click({target:{closest(){return node;}}});
  };

  assert.match(root.innerHTML,/Formula/);
  click("new-run");
  assert.equal(save().screen,"map");
  assert.match(root.innerHTML,/route-map/);

  click("node",{id:"0-1"});
  assert.equal(save().screen,"battle");
  assert.match(root.innerHTML,/Алхимическое сражение/);

  for(const i of [0,1,2,3])click("select-card",{index:String(i)});
  assert.equal(save().combat.selected.length,4);
  click("cast");
  const before=save();
  assert.ok(before.combat.puzzle);
  inputValue=String(before.combat.puzzle.answer);
  listeners.submit({target:{id:"puzzle-form"},preventDefault(){}});
  assert.equal(save().meta.formulas,1);
  assert.equal(save().combat.puzzle,null);
  assert.ok(save().combat.energy<before.combat.energy);
  assert.ok(save().combat.log.length>before.combat.log.length);

  let safety=0;
  while(save().screen==="battle"&&safety++<25){
    const combat=save().combat;
    if(combat.energy>0)click("strike");
    else click("end-turn");
  }
  assert.equal(save().screen,"reward","battle should be winnable by basic attacks");
  click("reward-take",{index:"0"});
  assert.equal(save().screen,"map");
  assert.equal(save().run.completed,1);
  assert.equal(save().run.position.col,0);
  assert.ok(save().run.deck.length>13);
  assert.match(root.innerHTML,/Выбери маршрут/);
});
