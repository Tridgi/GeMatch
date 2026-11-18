// Pure game rules. No DOM, timers or persistence here.
export const VERSION = 1;
export const STARTING_DECK = [
  {kind:"number",value:2},{kind:"number",value:3},{kind:"number",value:4},
  {kind:"number",value:5},{kind:"number",value:6},{kind:"operator",value:"+"},
  {kind:"operator",value:"+"},{kind:"operator",value:"×"},
  {kind:"spell",value:"fire"},{kind:"spell",value:"fire"},
  {kind:"spell",value:"ice"},{kind:"spell",value:"guard"},
  {kind:"spell",value:"heal"}
];
export const SPELLS = {
  fire:{name:"Огненная смесь",icon:"🔥",color:"fire",description:"Урон и горение"},
  ice:{name:"Ледяной состав",icon:"❄️",color:"ice",description:"Урон и ослабление"},
  guard:{name:"Кристальный щит",icon:"🛡️",color:"guard",description:"Создаёт защиту"},
  heal:{name:"Живая формула",icon:"💚",color:"heal",description:"Восстанавливает здоровье"}
};
export const NODE_TYPES={
  battle:{name:"Сражение",icon:"⚔",description:"Обычные противники"},
  elite:{name:"Элитный бой",icon:"☠",description:"Опасный противник и ценная награда"},
  lab:{name:"Лаборатория",icon:"⚗",description:"Приготовить зелья"},
  event:{name:"Препятствие",icon:"✧",description:"Обойти магическую аномалию"},
  treasure:{name:"Сокровище",icon:"⬡",description:"Новая карта или ресурс"},
  rest:{name:"Привал",icon:"♨",description:"Восстановить силы"},
  shop:{name:"Лавка",icon:"◇",description:"Приобрести припасы"},
  boss:{name:"Страж руин",icon:"♛",description:"Финальный бой"}
};
export const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export const randInt=(min,max,rng=Math.random)=>min+Math.floor(clamp(rng(),0,0.999999)*(max-min+1));
export function evaluateFormula(a,operator,b){
  if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>99||b>99)throw new Error("Invalid operands");
  switch(operator){case "+":return a+b;case "−":return Math.max(0,a-b);case "×":return a*b;default:throw new Error("Invalid operator");}
}
export function spellPower(a,operator,b,kind,accurate=true){
  if(!SPELLS[kind])throw new Error("Invalid spell");
  const value=evaluateFormula(a,operator,b);
  const base=clamp(value,0,45);
  const modifier=accurate?1.4:0.7;
  return Math.max(1,Math.round(base*modifier));
}
export function makePuzzle(floor=0,rng=Math.random){
  const a=randInt(2,4+Math.min(4,Math.floor(floor/2)),rng);
  const x=randInt(2,8,rng);
  const b=randInt(1,9,rng);
  return {a,b,rhs:a*x+b,answer:x,prompt:a+"x + "+b+" = "+(a*x+b)};
}
export function createMap(rng=Math.random){
  const columns=6, nodes=[];
  for(let col=0;col<columns;col++){
    const lanes=col===columns-1?[1]:[0,1,2];
    for(const lane of lanes){
      let type;
      if(col===columns-1)type="boss";
      else if(col===0)type="battle";
      else {
        const pool=col===4?["battle","elite","rest","lab","treasure"]:["battle","event","lab","treasure","rest","shop","elite"];
        type=pool[randInt(0,pool.length-1,rng)];
      }
      nodes.push({id:col+"-"+lane,col,lane,type,completed:false});
    }
  }
  return nodes;
}
export function canTravel(node,position){
  if(!node||node.completed)return false;
  const previous=position||{col:-1,lane:1};
  return node.col===previous.col+1&&Math.abs(node.lane-previous.lane)<=1;
}
export function drawHand(deck,rng=Math.random){
  const take=kind=>deck.filter(card=>card.kind===kind);
  const result=[];
  for(const kind of ["number","number","operator","spell","spell"]){
    const pool=take(kind);
    const fallback=STARTING_DECK.filter(card=>card.kind===kind);
    const source=pool.length?pool:fallback;
    result.push({...source[randInt(0,source.length-1,rng)]});
  }
  for(let j=0;j<2;j++)result.push({...deck[randInt(0,deck.length-1,rng)]});
  return result;
}
export function chooseReward(rng=Math.random){
  const pool=[
    {kind:"number",value:7},{kind:"number",value:8},
    {kind:"operator",value:"×"},{kind:"operator",value:"−"},
    {kind:"spell",value:"fire"},{kind:"spell",value:"ice"},
    {kind:"spell",value:"guard"},{kind:"spell",value:"heal"}
  ];
  return [0,1,2].map(()=>({...pool[randInt(0,pool.length-1,rng)]}));
}
export function createRun(rng=Math.random){
  return {hp:52,maxHp:52,energyMax:3,gold:25,crystals:0,
    potions:{heal:2,fire:1,guard:1},ingredients:5,
    deck:STARTING_DECK.map(c=>({...c})),relics:[],map:createMap(rng),
    position:{col:-1,lane:1},currentNode:null,
    floor:0,completed:0,log:[],lastResult:""};
}
export function enemyFor(type,floor=0,rng=Math.random){
  if(type==="boss")return {name:"Страж древней формулы",art:"golem",hp:105,maxHp:105,attack:13,poison:0,slow:0,burn:0,boss:true};
  if(type==="elite")return {name:"Грибной архимаг",art:"mushroom",hp:66,maxHp:66,attack:11,poison:0,slow:0,burn:0,boss:false};
  const variant=randInt(0,1,rng);
  const hp=30+floor*4+(variant?5:0);
  return {name:variant?"Лесной слизень":"Бродячий гриб",art:variant?"slime":"mushroom",hp,maxHp:hp,attack:6+Math.floor(floor/2),poison:0,slow:0,burn:0,boss:false};
}
export function resolvePotion(recipe,herbs,catalyst){
  if(!["heal","fire","guard"].includes(recipe))throw new Error("Unknown potion");
  if(!Number.isInteger(herbs)||herbs<1||herbs>3||!Number.isInteger(catalyst)||catalyst<1||catalyst>3)throw new Error("Invalid recipe quantities");
  const strength=herbs*4+catalyst*3;
  return {strength,stable:strength<=18,needed:herbs+catalyst};
}
export function safeParseSaved(json){
  try{
    const value=JSON.parse(json);
    if(value&&value.version===VERSION&&value.meta&&typeof value.meta==="object"&&(!value.run||Array.isArray(value.run.deck)))return value;
  }catch{}
  return null;
}
