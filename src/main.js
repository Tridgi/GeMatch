import {VERSION,SPELLS,NODE_TYPES,clamp,createRun,canTravel,drawHand,chooseReward,enemyFor,evaluateFormula,spellPower,makePuzzle,resolvePotion,safeParseSaved} from "./engine.js";

const KEY="gematch-save-v1";
const root=document.getElementById("app");
const initial={version:VERSION,screen:"menu",returnScreen:"map",run:null,combat:null,meta:{best:0,wins:0,formulas:0,deaths:0},selected:[],rewards:[],alchemy:{recipe:"heal",herbs:1,catalyst:1},obstacle:{base:4,mult:3},notice:""};
let state=safeParseSaved(localStorage.getItem(KEY))||initial;
state={...initial,...state,meta:{...initial.meta,...state.meta}};
const $=(selector)=>document.querySelector(selector);
const percent=(a,b)=>Math.round(100*a/Math.max(1,b));
const btn=(action,text,extra="",attrs="")=>'<button class="btn '+extra+'" data-action="'+action+'" '+attrs+'>'+text+'</button>';
const icon=(name,cls="")=>'<span class="ico '+cls+'">'+name+'</span>';
const sprite=(kind,cls="")=>'<span class="sprite sprite-'+kind+' '+cls+'" aria-hidden="true"></span>';
const title=(eyebrow,name,description="")=>'<div class="section-heading"><p class="overline">'+eyebrow+'</p><h1>'+name+'</h1><p>'+description+'</p></div>';
const progress=(current,max,kind="hp")=>'<div class="progress '+kind+'"><span style="width:'+percent(current,max)+'%"></span></div>';
const run=()=>state.run;
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
function say(message){state.notice=message;render();}
function cardName(card){if(card.kind==="number")return "Число "+card.value;if(card.kind==="operator")return card.value==="×"?"Умножение":card.value==="+"?"Сложение":"Вычитание";return SPELLS[card.value]?.name||"Неизвестно";}
function cardIcon(card){return card.kind==="number"?String(card.value):card.kind==="operator"?card.value:SPELLS[card.value]?.icon||"?";}
function cardKind(card){return card.kind==="spell"?"spell-"+card.value:card.kind;}
function cardMarkup(card,index=-1,selected=false,action="select-card"){
  return '<button class="math-card '+cardKind(card)+(selected?' selected':'')+'" data-action="'+action+'" data-index="'+index+'" '+(index<0?'disabled':'')+'><span class="card-symbol">'+cardIcon(card)+'</span><strong>'+cardName(card)+'</strong><small>'+ (card.kind==="spell"?SPELLS[card.value].description:card.kind==="operator"?"Операция":"Сила реакции")+'</small></button>';
}
function frame(content,side=""){
  const r=run();
  const showRun=r&&state.screen!=="menu";
  return '<div class="world-glow"></div><header class="topbar">'+
    '<button class="brand" data-action="home"><span class="brand-icon">⚗</span><span><strong>GeMatch</strong><small>FORMULA QUEST</small></span></button>'+
    '<div class="breadcrumb">✧ &nbsp; '+(showRun?'Лесные руины · Забег '+(r.completed+1):"АЛХИМИЯ ФОРМУЛ")+'</div>'+
    (showRun?'<div class="stats"><span>❤️ '+r.hp+'/'+r.maxHp+'</span><span>◈ '+r.gold+'</span><span>⚡ '+r.energyMax+'</span><span>🃏 '+r.deck.length+'</span></div>':'')+
    '<div class="header-actions">'+btn("book","📖 <span>Книга</span>","btn-subtle")+(showRun&&["map","book","shop","camp","lab","event","reward"].includes(state.screen)?btn("map","◈ <span>Карта</span>","btn-subtle"):"")+'</div></header>'+
    '<main class="layout '+(side?"with-side":"")+'">'+content+(side?'<aside class="sidebar">'+side+'</aside>':"")+'</main>'+
    (state.notice?'<div class="toast" role="status">'+state.notice+' <button data-action="dismiss" aria-label="Закрыть">×</button></div>':"")+
    '<footer class="footer"><span>✦ Уравнения становятся заклинаниями</span><span>Локальное сохранение · Версия 0.1</span></footer>';
}
function menu(){
  return '<section class="menu-screen"><div class="menu-copy"><span class="ribbon">РОГАЛИК · АЛХИМИЯ · МАТЕМАТИКА</span><h1>Formula <em>Quest</em></h1><h2>Алхимия формул</h2><p>Создавай заклинания из чисел и операций. Вари зелья, обойди древние ловушки и победи Стража руин. Каждая удачная формула меняет ход приключения.</p><div class="menu-buttons">'+
  btn("new-run","⚗ Начать новый забег","btn-primary btn-large")+
  (run()?btn("resume","↗ Продолжить забег","btn-outline btn-large"):"")+
  btn("book","📖 Книга открытий","btn-outline btn-large")+
  '</div><div class="menu-metrics"><div><strong>'+state.meta.best+'</strong><small>Лучший забег</small></div><div><strong>'+state.meta.wins+'</strong><small>Побед над стражем</small></div><div><strong>'+state.meta.formulas+'</strong><small>Решено формул</small></div></div></div>'+
  '<div class="menu-illustration"><div class="magic-orbit orbit-one"></div><div class="magic-orbit orbit-two"></div><div class="menu-character">'+sprite("hero")+'</div><div class="menu-flasks">⚗ &nbsp; ◈ &nbsp; ✧</div><span class="star s1">✦</span><span class="star s2">✧</span><span class="star s3">✦</span></div></section>';
}
function sidePanel(){
  const r=run();
  if(!r)return "";
  return '<div class="panel small-panel"><h3>◈ Путешественник</h3><div class="portrait-row">'+sprite("hero")+'<span><strong>Ученик алхимии</strong><small>Лесные руины</small></span></div>'+
  '<div class="label-pair"><span>Здоровье</span><b>'+r.hp+'/'+r.maxHp+'</b></div>'+progress(r.hp,r.maxHp)+
  '<div class="label-pair"><span>Золото</span><b>◈ '+r.gold+'</b></div><div class="label-pair"><span>Колода</span><b>'+r.deck.length+' карт</b></div><div class="label-pair"><span>Пройдено узлов</span><b>'+r.completed+'</b></div></div>'+
  '<div class="panel small-panel"><h3>⚗ Запасы</h3><div class="inventory-line">'+sprite("potion-heal")+' Лечение <b>×'+r.potions.heal+'</b></div><div class="inventory-line">'+sprite("potion-fire")+' Огонь <b>×'+r.potions.fire+'</b></div><div class="inventory-line">'+sprite("potion-ice")+' Защита <b>×'+r.potions.guard+'</b></div><div class="inventory-line">'+sprite("herb")+' Травы <b>×'+r.ingredients+'</b></div></div>'+
  '<div class="panel small-panel tip"><h3>✧ Подсказка</h3><p>Ты можешь выбрать следующий узел, если он соединён с предыдущим. Маршрут влияет на риск и награды.</p></div>';
}
function mapScreen(){
  const r=run(),last=r.position;
  let paths="";
  const coords=n=>({x:10+n.col*16.1,y:20+n.lane*30});
  for(const a of r.map)for(const b of r.map){
    if(b.col===a.col+1&&Math.abs(a.lane-b.lane)<=1){
      const pa=coords(a),pb=coords(b);
      paths+='<path d="M '+pa.x+' '+pa.y+' L '+pb.x+' '+pb.y+'" />';
    }
  }
  const nodeMarkup=r.map.map(n=>{
    const p=coords(n),available=canTravel(n,last);
    return '<button style="left:'+p.x+'%;top:'+p.y+'%" class="map-node '+n.type+(available?' available':'')+(n.completed?' done':'')+'" data-action="node" data-id="'+n.id+'" '+(!available?'disabled':'')+' aria-label="'+NODE_TYPES[n.type].name+'"><span>'+NODE_TYPES[n.type].icon+'</span></button>';
  }).join("");
  return '<section class="panel map-panel">'+title("АКТ I · ЛЕСНЫЕ РУИНЫ","Выбери маршрут","Каждый забег создаёт новую сеть событий. Путь к Стражу ведёт через пять переходов.")+
  '<div class="route-map"><div class="map-decor map-forest">🌿</div><div class="map-decor map-ruins">⌘</div><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'+paths+'</svg>'+
  '<div class="route-start">⛺</div>'+nodeMarkup+'</div>'+
  '<div class="node-legend">'+Object.entries(NODE_TYPES).map(([key,n])=>'<span>'+n.icon+' '+n.name+'</span>').join("")+'</div>'+
  '<div class="map-hint">✦ Подсвеченные узлы доступны для перехода. Победи босса, чтобы завершить забег.</div></section>';
}
function beginNode(id){
  const r=run(),node=r.map.find(n=>n.id===id);
  if(!canTravel(node,r.position))return;
  r.currentNode=id;
  state.notice="";
  if(["battle","elite","boss"].includes(node.type)){
    state.combat={enemy:enemyFor(node.type,r.floor),energy:r.energyMax,turn:1,shield:0,hand:drawHand(r.deck),selected:[],puzzle:null,potionUsed:false,log:["Враг появился. Используй карты или обычный удар."]};
    state.screen="battle";
  }else if(node.type==="lab"){state.screen="lab";}
  else if(node.type==="event"){state.screen="event";}
  else if(node.type==="rest"){state.screen="camp";}
  else if(node.type==="shop"){state.screen="shop";}
  else{state.rewards=chooseReward();state.screen="reward";}
}
function finishNode(){
  const r=run(),node=r.map.find(n=>n.id===r.currentNode);
  if(!node)return;
  node.completed=true;r.position={col:node.col,lane:node.lane};r.currentNode=null;r.completed++;r.floor++;
  state.meta.best=Math.max(state.meta.best,r.completed);
  state.combat=null;state.rewards=[];state.selected=[];
  if(node.type==="boss"){state.meta.wins++;state.screen="win";}
  else state.screen="map";
}
function battlePreview(){
  const c=state.combat;
  const cards=c.selected.map(i=>c.hand[i]).filter(Boolean);
  const numbers=cards.filter(v=>v.kind==="number");
  const op=cards.find(v=>v.kind==="operator");
  const spell=cards.find(v=>v.kind==="spell");
  if(numbers.length!==2||!op||!spell)return {complete:false,cards};
  return {complete:true,a:numbers[0].value,b:numbers[1].value,op:op.value,spell:spell.value,value:evaluateFormula(numbers[0].value,op.value,numbers[1].value)};
}
function battleScreen(){
  const r=run(),c=state.combat,e=c.enemy,p=battlePreview();
  const formula=p.complete?String(p.a)+' '+p.op+' '+p.b+' = '+p.value:'Выбери 2 числа + операцию + эффект';
  const actionText=p.complete?'⚗ '+SPELLS[p.spell].name:'✧ Собери формулу';
  return '<section class="battle-screen"><div class="battle-stage"><div class="battle-title"><span class="ribbon">ХОД '+c.turn+'</span><h2>⚔ Алхимическое сражение</h2><p>Противник готовится нанести '+Math.max(0,e.attack-(e.slow?3:0))+' урона</p></div>'+
    '<div class="fighters"><div class="fighter hero-fighter">'+sprite("hero")+'<h3>Алхимик</h3>'+progress(r.hp,r.maxHp)+'<span>❤️ '+r.hp+'/'+r.maxHp+' · 🛡 '+c.shield+'</span></div>'+
    '<div class="versus">VS <span>✦</span></div>'+
    '<div class="fighter enemy-fighter">'+sprite(e.art)+'<h3>'+e.name+'</h3>'+progress(e.hp,e.maxHp,'enemy')+'<span>❤️ '+e.hp+'/'+e.maxHp+(e.burn?' · 🔥 '+e.burn:'')+(e.slow?' · ❄️':'')+'</span></div></div></div>'+
    '<div class="battle-controls"><div class="battle-primary"><div class="formula-display"><div><small>ТЕКУЩАЯ ФОРМУЛА</small><strong>'+formula+'</strong></div><span class="pill">⚡ '+c.energy+'/'+r.energyMax+'</span></div><div class="battle-buttons">'+
    btn("cast",actionText,"btn-primary",(!p.complete||c.energy<2?'disabled':''))+
    btn("strike","⚔ Удар · 1 ⚡","btn-outline",(c.energy<1?'disabled':''))+
    btn("end-turn","Завершить ход ↗","btn-outline")+'</div>'+
    '<div class="card-hand">'+c.hand.map((card,i)=>cardMarkup(card,i,c.selected.includes(i))).join("")+'</div><p class="game-note">Выбери две карты чисел, одну операцию и одну стихию. Уравнение усиливает созданное заклинание.</p></div>'+
    '<aside class="combat-aside"><div class="panel"><h3>⚗ Быстрые зелья</h3><div class="potion-actions">'+
    btn("potion","💚 Лечение ×"+r.potions.heal,"btn-potion",'data-kind="heal" '+(!r.potions.heal||c.potionUsed?'disabled':''))+
    btn("potion","🔥 Огонь ×"+r.potions.fire,"btn-potion",'data-kind="fire" '+(!r.potions.fire||c.potionUsed?'disabled':''))+
    btn("potion","🛡 Щит ×"+r.potions.guard,"btn-potion",'data-kind="guard" '+(!r.potions.guard||c.potionUsed?'disabled':''))+
    '</div></div><div class="panel"><h3>▤ Журнал боя</h3><div class="combat-log">'+c.log.slice(-4).map(v=>'<p>'+v+'</p>').join("")+'</div></div></aside></div>'+
    (c.puzzle?'<div class="modal-backdrop"><form class="puzzle-modal" id="puzzle-form"><span class="overline">УСИЛЕНИЕ ЗАКЛИНАНИЯ</span><h2>Реши уравнение</h2><p>Правильный ответ даёт ×1,4 к эффекту. Ошибка или пропуск — ×0,7. Заклинание сработает в любом случае.</p><div class="equation">'+c.puzzle.prompt+'</div><label for="equation-answer">Значение x</label><input id="equation-answer" inputmode="numeric" autocomplete="off" placeholder="x = ?" required type="number" autofocus /><div class="puzzle-actions"><button class="btn btn-primary" type="submit">Подтвердить</button>'+btn("puzzle-skip","Пропустить","btn-outline",'type="button"')+'</div></form></div>':'')+
    '</section>';
}
function winCheck(){
  const c=state.combat;
  if(c.enemy.hp<=0){
    c.enemy.hp=0;c.puzzle=null;state.rewards=chooseReward();state.screen="reward";
    state.notice="Победа! Получено 12 золота. Выбери награду.";
    run().gold+=12;
  }
}
function applyCast(correct){
  const c=state.combat,r=run(),p=battlePreview();
  if(!p.complete||c.energy<2||!c.puzzle)return;
  const strength=spellPower(p.a,p.op,p.b,p.spell,correct);
  if(p.spell==="fire"){c.enemy.hp-=strength;c.enemy.burn=Math.max(c.enemy.burn,2);c.log.push("🔥 Огонь: "+strength+" урона, горение.");}
  if(p.spell==="ice"){c.enemy.hp-=strength;c.enemy.slow=2;c.log.push("❄️ Лёд: "+strength+" урона, ослабление.");}
  if(p.spell==="heal"){const heal=Math.min(r.maxHp-r.hp,strength);r.hp+=heal;c.log.push("💚 Исцелено "+heal+" здоровья.");}
  if(p.spell==="guard"){c.shield+=strength;c.log.push("🛡 Получено "+strength+" защиты.");}
  c.energy-=2;
  c.hand=c.hand.filter((_,i)=>!c.selected.includes(i));
  c.selected=[];c.puzzle=null;
  if(correct){state.meta.formulas++;state.notice="Формула решена верно! Эффект усилен.";}
  else state.notice="Реакция нестабильна: эффект уменьшен.";
  winCheck();
}
function strike(){
  const c=state.combat;
  if(c.energy<1)return;
  c.energy--;c.enemy.hp-=7;c.log.push("⚔ Обычный удар: 7 урона.");
  winCheck();
}
function endTurn(){
  const c=state.combat,r=run();
  if(c.enemy.burn>0){c.enemy.hp-=4;c.enemy.burn--;c.log.push("🔥 Горение: 4 урона.");}
  if(c.enemy.hp<=0){winCheck();return;}
  const raw=Math.max(0,c.enemy.attack-(c.enemy.slow>0?3:0));
  if(c.enemy.slow>0)c.enemy.slow--;
  const actual=Math.max(0,raw-c.shield);
  r.hp=Math.max(0,r.hp-actual);
  c.log.push("☠ Враг атакует: "+actual+" урона.");
  c.shield=0;c.turn++;c.energy=r.energyMax;c.potionUsed=false;c.hand=drawHand(r.deck);c.selected=[];
  if(r.hp<=0){state.meta.deaths++;state.screen="lost";}
}
function rewardScreen(){
  const r=run(),node=r.map.find(n=>n.id===r.currentNode);
  return '<section class="panel reward-panel">'+title("НАГРАДА ЗА СОБЫТИЕ",node?.type==="treasure"?"Найден тайник":"Победа в бою","Выбери одну карту — она войдёт в твою колоду до конца забега.")+
  '<div class="reward-cards">'+state.rewards.map((c,i)=>'<div class="reward-wrap">'+cardMarkup(c,-1,false)+"<button class='btn btn-primary' data-action='reward-take' data-index='"+i+"'>Выбрать</button></div>").join("")+'</div>'+
  '<div class="reward-bottom">'+sprite("chest")+btn("reward-heal","💚 Вместо карты: +14 HP","btn-outline")+btn("reward-skip","Пропустить · +8 ◈","btn-subtle")+'</div></section>';
}
function labScreen(){
  const a=state.alchemy,r=run(),result=resolvePotion(a.recipe,a.herbs,a.catalyst);
  const enough=r.ingredients>=result.needed;
  return '<section class="panel lab-screen">'+title("ПЕРЕДВИЖНАЯ ЛАБОРАТОРИЯ","Алхимический котёл","Комбинируй ингредиенты, соблюдай предел стабильности и пополняй запас зелий.")+
  '<div class="lab-grid"><div class="cauldron-scene"><div class="cauldron-glow">✧</div><div class="cauldron">⚗</div><div class="cauldron-label">МАГИЯ СОЕДИНЕНИЙ</div></div>'+
  '<div class="lab-controls"><h3>1. Выбери зелье</h3><div class="recipe-switch">'+
  ["heal","fire","guard"].map(k=>'<button class="recipe-choice '+(a.recipe===k?'active':'')+'" data-action="recipe" data-kind="'+k+'">'+(k==="heal"?"💚 Лечение":k==="fire"?"🔥 Огненная смесь":"🛡 Защитный экстракт")+'</button>').join("")+'</div>'+
  '<h3>2. Подбери пропорции</h3><label class="range-label">🌿 Травы <strong>'+a.herbs+'</strong></label><input data-field="herbs" type="range" min="1" max="3" value="'+a.herbs+'" />'+
  '<label class="range-label">◈ Катализатор <strong>'+a.catalyst+'</strong></label><input data-field="catalyst" type="range" min="1" max="3" value="'+a.catalyst+'" />'+
  '<div class="brew-equation"><small>Формула силы</small><strong>'+a.herbs+' × 4 + '+a.catalyst+' × 3 = '+result.strength+'</strong><span class="'+(result.stable?'good':'bad')+'">'+(result.stable?"✓ Стабильная смесь":"⚠ Нестабильная смесь")+'</span></div>'+
  '<p class="game-note">Доступно ингредиентов: '+r.ingredients+'. Понадобится: '+result.needed+'. Предел стабильности: 18.</p>'+
  btn("brew","⚗ Сварить зелье","btn-primary",(!enough||!result.stable?'disabled':''))+btn("finish-node","Покинуть лабораторию","btn-outline")+'</div></div></section>';
}
function eventScreen(){
  const r=run(),o=state.obstacle,target=12+Math.min(8,r.floor*2),power=o.base*o.mult;
  return '<section class="panel event-screen">'+title("ИССЛЕДОВАНИЕ", "Токсичная завеса","Магическая пелена перекрыла путь. Вычисли силу нейтрализующей реакции.")+
  '<div class="event-grid"><div class="fog-art"><div>☣</div><p>Ядовитые заросли</p></div><div class="event-controls"><h3>Построй формулу</h3><p>Для очистки требуется не менее <strong>'+target+'</strong> единиц силы.</p>'+
  '<label class="range-label">Основа <strong>'+o.base+'</strong></label><input type="range" data-field="base" min="2" max="10" value="'+o.base+'"/>'+
  '<label class="range-label">Усилитель <strong>×'+o.mult+'</strong></label><input type="range" data-field="mult" min="1" max="5" value="'+o.mult+'"/>'+
  '<div class="brew-equation"><small>Вычисленная сила</small><strong>'+o.base+' × '+o.mult+' = '+power+'</strong><span class="'+(power>=target?"good":"bad")+'">'+(power>=target?"✓ Преграда поддастся":"Не хватает энергии")+'</span></div>'+
  btn("event-clear","✧ Рассеять завесу","btn-primary",(power<target?'disabled':''))+
  btn("event-force","Прорваться силой · −10 HP","btn-outline")+'</div></div></section>';
}
function campScreen(){
  return '<section class="panel choice-panel">'+title("ПРИВАЛ","Тихий костёр","Пламя успокаивает. Можно восстановить силы или подготовить новые формулы.")+
  '<div class="choice-grid"><button class="choice" data-action="camp-heal"><span class="choice-emoji">♨</span><h3>Отдохнуть</h3><p>Восстановить 20 здоровья</p></button>'+
  '<button class="choice" data-action="camp-energy"><span class="choice-emoji">⚡</span><h3>Сосредоточиться</h3><p>+1 максимальная энергия в этом забеге (до 5)</p></button></div></section>';
}
function shopScreen(){
  return '<section class="panel choice-panel">'+title("ЛЕСНАЯ ЛАВКА","Странствующий торговец","Меняй золото на полезные алхимические припасы.")+
  '<div class="choice-grid">'+
  '<button class="choice" data-action="shop-buy" data-kind="heal"><span class="choice-emoji">💚</span><h3>Лечебный настой</h3><p>Стоимость: 15 ◈</p></button>'+
  '<button class="choice" data-action="shop-buy" data-kind="fire"><span class="choice-emoji">🔥</span><h3>Огненная смесь</h3><p>Стоимость: 18 ◈</p></button>'+
  '<button class="choice" data-action="shop-buy" data-kind="herbs"><span class="choice-emoji">🌿</span><h3>Сбор трав ×3</h3><p>Стоимость: 12 ◈</p></button></div>'+
  '<div class="center-actions">'+btn("finish-node","Вернуться на маршрут","btn-outline")+'</div></section>';
}
function bookScreen(){
  const r=run(),cards=r?.deck||[],unique=[...new Set(cards.map(c=>c.kind+":"+c.value))];
  return '<section class="panel book-screen">'+title("ГРИМУАР","Книга формул","Твои открытия, операции и сведения о забегах.")+
  '<div class="codex-stats"><div><strong>'+state.meta.formulas+'</strong><span>Удачных решений</span></div><div><strong>'+state.meta.best+'</strong><span>Лучший маршрут</span></div><div><strong>'+state.meta.wins+'</strong><span>Побед над стражем</span></div></div>'+
  '<h3>📖 Основные математические операции</h3><div class="codex-list"><article><strong>Сложение (+)</strong><p>Объединяет силу двух чисел. Стабильный результат.</p></article><article><strong>Умножение (×)</strong><p>Даёт сильную реакцию, но итог ограничен балансом заклинания.</p></article><article><strong>Вычитание (−)</strong><p>Ослабляет реакцию; полезно для точного контроля и задач.</p></article></div>'+
  '<h3>🃏 Карты текущего забега ('+cards.length+')</h3><div class="card-collection">'+unique.map(k=>{const c=cards.find(x=>x.kind+":"+x.value===k);return '<div>'+cardIcon(c)+' <span>'+cardName(c)+'</span></div>';}).join("")+'</div><div class="center-actions">'+btn("back","← Вернуться","btn-outline")+'</div></section>';
}
function ending(victory){
  const r=run();
  return '<section class="panel ending"><div class="ending-emblem">'+(victory?'✦':'☽')+'</div>'+title(victory?"ПОБЕДА":"ЗАБЕГ ЗАВЕРШЁН",victory?"Великая формула восстановлена":"Алхимия не прощает ошибок",victory?"Страж руин повержен. Твои формулы изменили этот мир.":"Даже неудачный опыт пополняет знания настоящего алхимика.")+
  '<div class="end-metrics"><div><strong>'+r.completed+'</strong><small>Пройдено узлов</small></div><div><strong>'+r.deck.length+'</strong><small>Карт в колоде</small></div><div><strong>'+state.meta.formulas+'</strong><small>Верных решений всего</small></div></div>'+
  btn("new-run","⚗ Новый забег","btn-primary btn-large")+btn("home","Главное меню","btn-outline")+'</section>';
}
function render(){
  let body="";
  switch(state.screen){
    case "menu":body=menu();break;
    case "map":body=mapScreen();break;
    case "battle":body=battleScreen();break;
    case "reward":body=rewardScreen();break;
    case "lab":body=labScreen();break;
    case "event":body=eventScreen();break;
    case "camp":body=campScreen();break;
    case "shop":body=shopScreen();break;
    case "book":body=bookScreen();break;
    case "win":body=ending(true);break;
    case "lost":body=ending(false);break;
    default:state.screen="menu";body=menu();
  }
  root.innerHTML=frame(body,["map"].includes(state.screen)?sidePanel():"");
  persist();
}
function handleAction(action,element){
  const r=run(),c=state.combat;
  switch(action){
    case "dismiss":state.notice="";break;
    case "home":state.screen="menu";state.notice="";break;
    case "new-run":state.run=createRun();state.combat=null;state.screen="map";state.notice="Забег начался. Выбери первый узел.";break;
    case "resume":state.screen=r?(c?"battle":"map"):"menu";break;
    case "map":if(r&&state.screen!=="battle"){state.screen="map";state.notice="";}break;
    case "book":state.returnScreen=state.screen;state.screen="book";break;
    case "back":state.screen=state.returnScreen||"menu";break;
    case "node":beginNode(element.dataset.id);break;
    case "select-card":{
      if(!c||c.puzzle)break;
      const i=Number(element.dataset.index),card=c.hand[i];
      if(!card)break;
      if(c.selected.includes(i))c.selected=c.selected.filter(n=>n!==i);
      else{
        const chosen=c.selected.map(j=>c.hand[j]).filter(v=>v.kind===card.kind);
        const limit=card.kind==="number"?2:1;
        if(chosen.length>=limit){state.notice="Для этой формулы достаточно "+limit+" карт данного типа.";break;}
        c.selected.push(i);
      }
      state.notice="";break;
    }
    case "cast":{
      if(!c||c.energy<2||!battlePreview().complete)break;
      c.puzzle=makePuzzle(r.floor);state.notice="";break;
    }
    case "strike":strike();break;
    case "end-turn":endTurn();break;
    case "puzzle-skip":applyCast(false);break;
    case "potion":{
      const kind=element.dataset.kind;
      if(!c||c.potionUsed||!["heal","fire","guard"].includes(kind)||!r.potions[kind])break;
      r.potions[kind]--;c.potionUsed=true;
      if(kind==="heal"){r.hp=Math.min(r.maxHp,r.hp+18);c.log.push("💚 Выпито лечебное зелье.");}
      if(kind==="guard"){c.shield+=16;c.log.push("🛡 Защитное зелье: +16 щита.");}
      if(kind==="fire"){c.enemy.hp-=16;c.log.push("🔥 Огненная смесь: 16 урона.");winCheck();}
      break;
    }
    case "reward-take":{
      const card=state.rewards[Number(element.dataset.index)];
      if(!card)break;r.deck.push({...card});finishNode();state.notice="Добавлена карта «"+cardName(card)+"».";break;
    }
    case "reward-heal":r.hp=Math.min(r.maxHp,r.hp+14);finishNode();state.notice="Восстановлено до 14 HP.";break;
    case "reward-skip":r.gold+=8;finishNode();state.notice="Получено 8 золота.";break;
    case "recipe":state.alchemy.recipe=element.dataset.kind;break;
    case "brew":{
      const a=state.alchemy,p=resolvePotion(a.recipe,a.herbs,a.catalyst);
      if(!p.stable||r.ingredients<p.needed)break;
      r.ingredients-=p.needed;r.potions[a.recipe]=(r.potions[a.recipe]||0)+1;state.meta.formulas++;
      state.notice="Успешно сварено зелье. Можно варить дальше или уйти.";break;
    }
    case "event-clear":{
      const o=state.obstacle;
      if(o.base*o.mult>=12+Math.min(8,r.floor*2)){r.gold+=10;finishNode();state.meta.formulas++;state.notice="Завеса рассеяна! +10 золота.";}break;
    }
    case "event-force":r.hp=Math.max(0,r.hp-10);finishNode();if(!r.hp){state.meta.deaths++;state.screen="lost";}else state.notice="Ты прорвался, но потерял 10 здоровья.";break;
    case "camp-heal":r.hp=Math.min(r.maxHp,r.hp+20);finishNode();state.notice="Отдых восстановил здоровье.";break;
    case "camp-energy":r.energyMax=Math.min(5,r.energyMax+1);finishNode();state.notice="Усилена концентрация алхимика.";break;
    case "shop-buy":{
      const kind=element.dataset.kind,price=kind==="heal"?15:kind==="fire"?18:12;
      if(r.gold<price){state.notice="Недостаточно золота.";break;}
      r.gold-=price;if(kind==="herbs")r.ingredients+=3;else r.potions[kind]++;
      state.notice="Покупка совершена.";break;
    }
    case "finish-node":finishNode();break;
  }
  render();
}
root.addEventListener("click",e=>{
  const node=e.target.closest("[data-action]");
  if(!node||node.disabled)return;
  handleAction(node.dataset.action,node);
});
root.addEventListener("input",e=>{
  const field=e.target.dataset.field;
  if(!field)return;
  const amount=Number(e.target.value);
  if(["herbs","catalyst"].includes(field))state.alchemy[field]=amount;
  if(["base","mult"].includes(field))state.obstacle[field]=amount;
  render();
});
root.addEventListener("submit",e=>{
  if(e.target.id!=="puzzle-form")return;
  e.preventDefault();
  const answer=Number($("#equation-answer").value);
  const correct=$("#equation-answer").value.trim()!==""&&answer===state.combat?.puzzle?.answer;
  applyCast(correct);render();
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&state.screen==="book"){state.screen=state.returnScreen;render();}
  if(state.screen==="battle"&&!state.combat.puzzle&&/^[1-7]$/.test(e.key)){
    const item=root.querySelector('[data-action="select-card"][data-index="'+(Number(e.key)-1)+'"]');
    if(item)handleAction("select-card",item);
  }
});
render();
