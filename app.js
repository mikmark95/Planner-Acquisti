const KEY = 'planner_acquisti_uomo_v1';
const CATS = ['giacche','pantaloni','camicie','maglieria','t-shirt','denim','capispalla','abiti','scarpe','accessori','altro'];
const state = load() || demo();
let charts = {};

function demo(){
  return {settings:{season:'FW 2026',totalBudget:50000,targetMargin:60,revenueGoal:120000,startDate:'2026-06-01',endDate:'2026-07-31',categoryBudgets:{}},brands:[{id:id(),name:'Alfa Sartoria',priority:'alta',status:'continuativo',expectedGrowth:12,category:'abiti',budget:12000,testBudget:0,notes:'Ottima vestibilità',items:[{id:id(),name:'Blazer lana',code:'A100',category:'abiti',season:'FW',unitCost:150,sellPrice:360,qty:28,sizes:'46-54',color:'Blu',description:'Blazer slim',depth:'completa',notes:'Core',status:'confermato'}],history:[{id:id(),category:'abiti',orderedValue:10000,purchasedQty:60,purchasedValue:9800,soldValue:17000,soldQty:50,remaining:10,effectiveMargin:62,notes:'Buon sell-out'}]}],theme:'light'};
}
function id(){return Math.random().toString(36).slice(2,9)}
function load(){try{return JSON.parse(localStorage.getItem(KEY));}catch{return null;}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));}
const euro=n=>`€ ${Number(n||0).toLocaleString('it-IT',{maximumFractionDigits:2})}`;
const pct=n=>`${Number(n||0).toFixed(1)}%`;

function sellOutClass(v){if(v>75)return ['alto','b-good']; if(v>=60)return ['buono','b-good']; if(v>=40)return ['medio','b-mid']; return ['basso','b-bad'];}
function itemMetrics(item,brandTotal,totalBudget){const cost=item.unitCost*item.qty, rev=item.sellPrice*item.qty, margin=rev?((rev-cost)/rev*100):0, markup=item.unitCost?((item.sellPrice-item.unitCost)/item.unitCost*100):0; return {cost,rev,margin,markup,incBrand:brandTotal?cost/brandTotal*100:0,incBudget:totalBudget?cost/totalBudget*100:0};}
function brandTotals(brand){return brand.items.reduce((a,i)=>a+i.unitCost*i.qty,0)}
function allItems(){return state.brands.flatMap(b=>b.items.map(i=>({...i,brandId:b.id,brandName:b.name})));}
function historyRows(){return state.brands.flatMap(b=>b.history.map(h=>({...h,brandId:b.id,brandName:b.name,sellOut:h.purchasedQty? h.soldQty/h.purchasedQty*100:0})));}

function calcSuggested(brand){
  const prev=brand.history.reduce((a,h)=>a+h.purchasedValue,0);
  const avgSell=brand.history.length?brand.history.reduce((a,h)=>a+(h.purchasedQty? h.soldQty/h.purchasedQty*100:0),0)/brand.history.length:0;
  const rem=brand.history.reduce((a,h)=>a+h.remaining,0);
  let f=1;
  if(avgSell>75)f=1.18; else if(avgSell>=60)f=1.05; else if(avgSell>=40)f=0.85; else f=0.6;
  f*=1+((brand.expectedGrowth||0)/100);
  if(brand.priority==='alta')f*=1.08; if(brand.priority==='bassa')f*=0.92;
  if(brand.status==='da ridurre')f*=0.75;
  let s=brand.status==='nuovo'?(brand.testBudget||brand.budget||0):(prev*f);
  if(rem>20)s*=0.9;
  return Math.max(0,s);
}

function render(){renderDashboard();renderSettings();renderBrands();renderItems();renderHistory();renderPlan();renderSuggestions();renderBackup();bindTabs();save();}

function renderDashboard(){
  const target = q('#dashboard'); const totalBought = state.brands.reduce((a,b)=>a+brandTotals(b),0);
  const totalRev = state.brands.reduce((a,b)=>a+b.items.reduce((s,i)=>s+i.sellPrice*i.qty,0),0);
  const margin = totalRev?((totalRev-totalBought)/totalRev*100):0;
  const hist=historyRows(); const avgSell=hist.length?hist.reduce((a,h)=>a+h.sellOut,0)/hist.length:0;
  const resid=(state.settings.totalBudget||0)-totalBought;
  target.innerHTML=`<div class='grid cards'>${card('Budget totale',euro(state.settings.totalBudget),'Campagna')} ${card('Totale acquistato',euro(totalBought),'Nuova stagione')} ${card('Budget residuo',euro(resid),pct(totalBought/(state.settings.totalBudget||1)*100))} ${card('Vendita prevista',euro(totalRev),'Valore retail')} ${card('Margine medio',pct(margin),'Vs target '+pct(state.settings.targetMargin))} ${card('Sell-out medio prev',pct(avgSell),'Storico')}</div>
  <div class='panel'><h3>Uso budget</h3><div class='progress'><div class='bar' style='width:${Math.min(100,totalBought/(state.settings.totalBudget||1)*100)}%'></div></div></div>
  <div class='panel'><canvas id='chartBrand'></canvas></div><div class='panel'><canvas id='chartCat'></canvas></div>`;
  drawCharts();
}
function card(t,v,s){return `<article class='card'><h3>${t}</h3><p class='value'>${v}</p><small>${s}</small></article>`}
function drawCharts(){
  const bctx = q('#chartBrand'); const cctx=q('#chartCat'); if(!bctx||!cctx)return;
  Object.values(charts).forEach(c=>c.destroy());
  charts.brand = new Chart(bctx,{type:'doughnut',data:{labels:state.brands.map(b=>b.name),datasets:[{data:state.brands.map(brandTotals)}]}});
  const catMap={}; allItems().forEach(i=>catMap[i.category]=(catMap[i.category]||0)+(i.unitCost*i.qty));
  charts.cat = new Chart(cctx,{type:'bar',data:{labels:Object.keys(catMap),datasets:[{label:'Acquisto per categoria',data:Object.values(catMap),backgroundColor:'#1f3b57'}]}});
}

function renderSettings(){q('#settings').innerHTML=`<div class='panel'><h2>Budget & Campagna</h2><div class='form-grid'>
<label>Stagione<input id='season' value='${state.settings.season||''}'></label>
<label>Budget totale<input id='totalBudget' type='number' value='${state.settings.totalBudget||0}'></label>
<label>Margine target %<input id='targetMargin' type='number' value='${state.settings.targetMargin||0}'></label>
<label>Obiettivo fatturato<input id='revenueGoal' type='number' value='${state.settings.revenueGoal||0}'></label>
<label>Inizio<input id='startDate' type='date' value='${state.settings.startDate||''}'></label>
<label>Fine<input id='endDate' type='date' value='${state.settings.endDate||''}'></label>
</div><button class='btn' id='saveSettings'>Aggiorna impostazioni</button></div>`;
  q('#saveSettings').onclick=()=>{['season','startDate','endDate'].forEach(k=>state.settings[k]=q('#'+k).value);['totalBudget','targetMargin','revenueGoal'].forEach(k=>state.settings[k]=Number(q('#'+k).value||0));render();};
}

function renderBrands(){const rows=state.brands.map(b=>`<tr><td>${b.name}</td><td>${b.priority}</td><td>${b.status}</td><td>${b.category}</td><td>${pct((brandTotals(b)/(state.settings.totalBudget||1))*100)}</td><td>${euro(brandTotals(b))}</td><td><button onclick="dupBrand('${b.id}')">Duplica</button><button onclick="delBrand('${b.id}')">Elimina</button></td></tr>`).join('');
q('#brands').innerHTML=`<div class='panel'><h2>Gestione Brand</h2><div class='form-grid'>
<input id='bName' placeholder='Nome brand'><select id='bPriority'><option>alta</option><option selected>media</option><option>bassa</option></select>
<select id='bStatus'><option>continuativo</option><option>nuovo</option><option>da ridurre</option></select><input id='bGrowth' type='number' placeholder='Crescita %'>
<input id='bCategory' placeholder='Categoria principale'><input id='bBudget' type='number' placeholder='Budget brand'><input id='bTest' type='number' placeholder='Budget test (nuovo)'>
<input id='bNotes' placeholder='Note qualitative'></div><button class='btn' id='addBrand'>Aggiungi brand</button></div>
<div class='panel'><table><thead><tr><th>Brand</th><th>Priorità</th><th>Stato</th><th>Categoria</th><th>% budget</th><th>Acquisto</th><th>Azioni</th></tr></thead><tbody>${rows}</tbody></table></div>`;
q('#addBrand').onclick=()=>{state.brands.push({id:id(),name:q('#bName').value,priority:q('#bPriority').value,status:q('#bStatus').value,expectedGrowth:Number(q('#bGrowth').value||0),category:q('#bCategory').value,budget:Number(q('#bBudget').value||0),testBudget:Number(q('#bTest').value||0),notes:q('#bNotes').value,items:[],history:[]});render();};}
window.delBrand=(bid)=>{state.brands=state.brands.filter(b=>b.id!==bid);render();}; window.dupBrand=(bid)=>{const b=state.brands.find(x=>x.id===bid); if(!b) return; const c=structuredClone(b); c.id=id(); c.name+=' (copy)'; state.brands.push(c); render();}

function renderItems(){
  const brandOpts=state.brands.map(b=>`<option value='${b.id}'>${b.name}</option>`).join(''); const selected=state.brands[0]?.id;
  const rows=allItems().map(i=>{const b=state.brands.find(x=>x.id===i.brandId); const m=itemMetrics(i,brandTotals(b),state.settings.totalBudget);return `<tr><td>${i.brandName}</td><td>${i.name}</td><td>${i.category}</td><td>${i.status}</td><td>${i.qty}</td><td>${euro(m.cost)}</td><td>${pct(m.margin)}</td><td><button onclick="delItem('${i.brandId}','${i.id}')">X</button></td></tr>`}).join('');
  q('#items').innerHTML=`<div class='panel'><h2>Inserimento articoli</h2><div class='form-grid'>
<select id='iBrand'>${brandOpts}</select><input id='iName' placeholder='Nome articolo'><input id='iCode' placeholder='Codice'>
<select id='iCategory'>${CATS.map(c=>`<option>${c}</option>`).join('')}</select><select id='iSeason'><option>SS</option><option selected>FW</option></select>
<input id='iCost' type='number' placeholder='Costo unitario'><input id='iPrice' type='number' placeholder='Prezzo vendita'><input id='iQty' type='number' placeholder='Quantità'>
<input id='iSizes' placeholder='Taglie'><input id='iColor' placeholder='Colore'><input id='iDepth' placeholder='Profondità taglie'>
<input id='iDesc' placeholder='Descrizione'><input id='iNotes' placeholder='Note'><select id='iStatus'><option>confermato</option><option>da valutare</option><option>eliminato</option></select></div>
<button class='btn' id='addItem'>Aggiungi articolo</button></div>
<div class='panel'><table><thead><tr><th>Brand</th><th>Articolo</th><th>Categoria</th><th>Stato</th><th>Qta</th><th>Totale costo</th><th>Margine</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
  q('#addItem').onclick=()=>{const b=state.brands.find(x=>x.id===q('#iBrand').value||selected); if(!b)return; b.items.push({id:id(),name:q('#iName').value,code:q('#iCode').value,category:q('#iCategory').value,season:q('#iSeason').value,unitCost:Number(q('#iCost').value||0),sellPrice:Number(q('#iPrice').value||0),qty:Number(q('#iQty').value||0),sizes:q('#iSizes').value,color:q('#iColor').value,depth:q('#iDepth').value,description:q('#iDesc').value,notes:q('#iNotes').value,status:q('#iStatus').value}); render();}
}
window.delItem=(bid,iid)=>{const b=state.brands.find(x=>x.id===bid); if(!b)return; b.items=b.items.filter(i=>i.id!==iid); render();};

function renderHistory(){
  const rows=historyRows().map(h=>{const [label,cls]=sellOutClass(h.sellOut);return `<tr><td>${h.brandName}</td><td>${h.category}</td><td>${euro(h.purchasedValue)}</td><td>${h.purchasedQty}</td><td>${h.soldQty}</td><td><span class='badge ${cls}'>${label} ${pct(h.sellOut)}</span></td><td>${h.remaining}</td></tr>`}).join('');
  q('#history').innerHTML=`<div class='panel'><h2>Storico stagione precedente</h2><div class='form-grid'>
<select id='hBrand'>${state.brands.map(b=>`<option value='${b.id}'>${b.name}</option>`).join('')}</select><select id='hCategory'>${CATS.map(c=>`<option>${c}</option>`).join('')}</select>
<input id='hOrdered' type='number' placeholder='Ordinato precedente'><input id='hPurchasedQty' type='number' placeholder='Qtà acquistata'>
<input id='hPurchasedVal' type='number' placeholder='Valore acquistato costo'><input id='hSoldVal' type='number' placeholder='Valore venduto'>
<input id='hSoldQty' type='number' placeholder='Qtà venduta'><input id='hRem' type='number' placeholder='Rimanenza'>
<input id='hMargin' type='number' placeholder='Margine effettivo %'><input id='hNote' placeholder='Note qualitative'></div>
<button class='btn' id='addHist'>Aggiungi storico</button></div><div class='panel'><table><thead><tr><th>Brand</th><th>Categoria</th><th>Acq. costo</th><th>Qta acq.</th><th>Qta vend.</th><th>Sell-out</th><th>Rimanenza</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  q('#addHist').onclick=()=>{const b=state.brands.find(x=>x.id===q('#hBrand').value); if(!b)return; b.history.push({id:id(),category:q('#hCategory').value,orderedValue:Number(q('#hOrdered').value||0),purchasedQty:Number(q('#hPurchasedQty').value||0),purchasedValue:Number(q('#hPurchasedVal').value||0),soldValue:Number(q('#hSoldVal').value||0),soldQty:Number(q('#hSoldQty').value||0),remaining:Number(q('#hRem').value||0),effectiveMargin:Number(q('#hMargin').value||0),notes:q('#hNote').value}); render();};
}

function renderPlan(){
  const rows=state.brands.map(b=>{const suggested=calcSuggested(b),planned=brandTotals(b),delta=planned-suggested; return `<tr><td>${b.name}</td><td>${euro(suggested)}</td><td>${euro(planned)}</td><td>${euro(delta)}</td></tr>`}).join('');
  q('#plan').innerHTML=`<div class='panel'><h2>Piano nuova stagione</h2><button class='btn' id='genAuto'>Genera proposta automatica</button><table><thead><tr><th>Brand</th><th>Acquisto consigliato</th><th>Pianificato</th><th>Scostamento</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  q('#genAuto').onclick=()=>{state.brands.forEach(b=>b.budget=Math.round(calcSuggested(b))); alert('Proposta generata nei budget brand.'); render();};
}

function renderSuggestions(){
  const arr=[]; const total=state.brands.reduce((a,b)=>a+brandTotals(b),0);
  state.brands.forEach(b=>{const h=historyRows().filter(x=>x.brandId===b.id); const avg=h.length?h.reduce((a,r)=>a+r.sellOut,0)/h.length:0; if(avg>75)arr.push(msg('good',`Il brand ${b.name} ha sell-out ${pct(avg)}: valuta aumento acquisto.`)); if(avg<40)arr.push(msg('bad',`Il brand ${b.name} ha sell-out ${pct(avg)}: riduzione forte consigliata.`)); if(h.reduce((a,r)=>a+r.remaining,0)>25)arr.push(msg('warn',`Il brand ${b.name} ha molte rimanenze: attenzione.`)); if((brandTotals(b)/(state.settings.totalBudget||1))*100>35)arr.push(msg('warn',`${b.name} assorbe oltre il 35% del budget.`)); if(b.status==='nuovo'&&b.testBudget>7000)arr.push(msg('warn',`Brand nuovo ${b.name} con budget test elevato.`));});
  if(total>(state.settings.totalBudget||0))arr.push(msg('bad',`Hai superato il budget previsto di ${euro(total-state.settings.totalBudget)}.`));
  const rev=state.brands.reduce((a,b)=>a+b.items.reduce((s,i)=>s+i.sellPrice*i.qty,0),0); const margin=rev?((rev-total)/rev*100):0; if(margin<state.settings.targetMargin)arr.push(msg('bad',`Margine medio previsto ${pct(margin)} sotto target ${pct(state.settings.targetMargin)}.`));
  q('#suggestions').innerHTML=`<div class='panel'><h2>Analisi e suggerimenti automatici</h2>${arr.join('')||"<p>Nessun alert, piano equilibrato.</p>"}</div>`;
}
function msg(type,text){return `<div class='alert ${type}'>${text}</div>`}

function renderBackup(){q('#backup').innerHTML=`<div class='panel'><h2>Import / Export</h2><button class='btn' id='expJson'>Esporta backup JSON</button> <button class='btn' id='expCsv'>Esporta riepilogo CSV</button> <button class='btn' onclick='window.print()'>Stampa dashboard</button>
<input type='file' id='impJson' accept='application/json' /></div>`;
q('#expJson').onclick=()=>download('planner-backup.json',JSON.stringify(state,null,2),'application/json');
q('#expCsv').onclick=()=>{const lines=['Brand,Acquisto,Suggerito,Scostamento']; state.brands.forEach(b=>{const p=brandTotals(b),s=calcSuggested(b); lines.push(`${b.name},${p},${s},${p-s}`)}); download('riepilogo.csv',lines.join('\n'),'text/csv');};
q('#impJson').onchange=e=>{const f=e.target.files[0]; if(!f)return; const fr=new FileReader(); fr.onload=()=>{Object.assign(state,JSON.parse(fr.result)); render();}; fr.readAsText(f);};}
function download(name,content,type){const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type})); a.download=name; a.click(); URL.revokeObjectURL(a.href);}

function bindTabs(){qa('.tab-btn').forEach(b=>b.onclick=()=>{qa('.tab-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); qa('.tab').forEach(t=>t.classList.remove('active')); q('#'+b.dataset.tab).classList.add('active');});}
q('#toggleTheme').onclick=()=>{document.body.classList.toggle('dark'); state.theme=document.body.classList.contains('dark')?'dark':'light'; save();};
q('#saveBtn').onclick=()=>{save(); alert('Dati salvati.');};
q('#resetBtn').onclick=()=>{if(confirm('Confermi reset completo?')){localStorage.removeItem(KEY); location.reload();}};
if(state.theme==='dark')document.body.classList.add('dark');

function q(s){return document.querySelector(s)} function qa(s){return document.querySelectorAll(s)}
render();
