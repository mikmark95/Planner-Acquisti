/* ────────────────────────────────────────
   Buyer Planner — app.js  (redesigned)
   ──────────────────────────────────────── */

const KEY = 'planner_acquisti_uomo_v2';
const CATS = ['giacche','pantaloni','camicie','maglieria','t-shirt','denim','capispalla','abiti','scarpe','accessori','altro'];
const state = load() || demo();
let charts = {};

/* ── Demo data ── */
function demo(){
  return {
    settings:{
      season:'FW 2026', totalBudget:50000, targetMargin:60,
      revenueGoal:120000, startDate:'2026-06-01', endDate:'2026-07-31',
      categoryBudgets:{}
    },
    brands:[
      {
        id:id(), name:'Alfa Sartoria', priority:'alta', status:'continuativo',
        expectedGrowth:12, category:'abiti', budget:12000, testBudget:0,
        notes:'Ottima vestibilità, core del reparto formalwear',
        items:[
          {id:id(),name:'Blazer lana',code:'A100',category:'abiti',season:'FW',
           unitCost:150,sellPrice:360,qty:28,sizes:'46-54',color:'Blu Navy',
           description:'Blazer slim fit in lana vergine',depth:'completa',
           notes:'Core piece',status:'confermato'},
          {id:id(),name:'Pantaloni flanella',code:'A101',category:'pantaloni',season:'FW',
           unitCost:90,sellPrice:215,qty:22,sizes:'44-56',color:'Grigio',
           description:'Pantaloni classic fit flanella',depth:'completa',
           notes:'Best seller',status:'confermato'},
        ],
        history:[
          {id:id(),category:'abiti',orderedValue:10000,purchasedQty:60,
           purchasedValue:9800,soldValue:17000,soldQty:50,remaining:10,
           effectiveMargin:62,notes:'Buon sell-out stagione passata'}
        ]
      },
      {
        id:id(), name:'Casanova Knitwear', priority:'media', status:'continuativo',
        expectedGrowth:5, category:'maglieria', budget:8000, testBudget:0,
        notes:'Maglieria premium, clientela fidelizzata',
        items:[
          {id:id(),name:'Maglione cashmere',code:'C200',category:'maglieria',season:'FW',
           unitCost:120,sellPrice:295,qty:18,sizes:'S-XXL',color:'Camel',
           description:'Girocollo cashmere 2 fili',depth:'parziale',
           notes:'Riordino previsto',status:'confermato'},
        ],
        history:[
          {id:id(),category:'maglieria',orderedValue:7500,purchasedQty:45,
           purchasedValue:7200,soldValue:12800,soldQty:38,remaining:7,
           effectiveMargin:58,notes:'Sell-out soddisfacente'}
        ]
      },
      {
        id:id(), name:'Nord Denim Co.', priority:'bassa', status:'da ridurre',
        expectedGrowth:-10, category:'denim', budget:4000, testBudget:0,
        notes:'Performance calante, valutare uscita',
        items:[
          {id:id(),name:'Jeans slim',code:'N300',category:'denim',season:'FW',
           unitCost:55,sellPrice:120,qty:30,sizes:'29-36',color:'Indigo',
           description:'5 tasche slim fit',depth:'completa',
           notes:'Da monitorare',status:'da valutare'},
        ],
        history:[
          {id:id(),category:'denim',orderedValue:5000,purchasedQty:80,
           purchasedValue:4800,soldValue:6500,soldQty:40,remaining:40,
           effectiveMargin:45,notes:'Rimanenze elevate'}
        ]
      }
    ],
    theme:'light'
  };
}

/* ── Utils ── */
function id(){ return Math.random().toString(36).slice(2,9); }
function load(){ try{ return JSON.parse(localStorage.getItem(KEY)); }catch{ return null; } }
function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
const euro = n => `€\u202f${Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:0,maximumFractionDigits:0})}`;
const eurod = n => `€\u202f${Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const pct = n => `${Number(n||0).toFixed(1)}\u202f%`;
const q = s => document.querySelector(s);
const qa = s => document.querySelectorAll(s);
const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function sellOutClass(v){
  if(v>75) return ['Alto','b-good'];
  if(v>=60) return ['Buono','b-good'];
  if(v>=40) return ['Medio','b-mid'];
  return ['Basso','b-bad'];
}

function itemMetrics(item, brandTotal, totalBudget){
  const cost = item.unitCost * item.qty;
  const rev  = item.sellPrice * item.qty;
  const margin = rev ? ((rev-cost)/rev*100) : 0;
  const markup = item.unitCost ? ((item.sellPrice-item.unitCost)/item.unitCost*100) : 0;
  return { cost, rev, margin, markup,
    incBrand:  brandTotal  ? cost/brandTotal*100  : 0,
    incBudget: totalBudget ? cost/totalBudget*100 : 0
  };
}

function brandTotals(brand){ return brand.items.reduce((a,i)=>a+i.unitCost*i.qty, 0); }
function brandRev(brand){ return brand.items.reduce((a,i)=>a+i.sellPrice*i.qty, 0); }
function allItems(){ return state.brands.flatMap(b=>b.items.map(i=>({...i,brandId:b.id,brandName:b.name}))); }
function historyRows(){ return state.brands.flatMap(b=>b.history.map(h=>({...h,brandId:b.id,brandName:b.name,sellOut:h.purchasedQty?h.soldQty/h.purchasedQty*100:0}))); }

function calcSuggested(brand){
  const prev = brand.history.reduce((a,h)=>a+h.purchasedValue, 0);
  const avgSell = brand.history.length ? brand.history.reduce((a,h)=>a+(h.purchasedQty?h.soldQty/h.purchasedQty*100:0),0)/brand.history.length : 0;
  const rem = brand.history.reduce((a,h)=>a+h.remaining, 0);
  let f = 1;
  if(avgSell>75) f=1.18; else if(avgSell>=60) f=1.05; else if(avgSell>=40) f=0.85; else f=0.6;
  f *= 1+((brand.expectedGrowth||0)/100);
  if(brand.priority==='alta') f*=1.08;
  if(brand.priority==='bassa') f*=0.92;
  if(brand.status==='da ridurre') f*=0.75;
  let s = brand.status==='nuovo' ? (brand.testBudget||brand.budget||0) : (prev*f);
  if(rem>20) s*=0.9;
  return Math.max(0,s);
}

/* ── Master render ── */
function render(){
  renderDashboard();
  renderSettings();
  renderBrands();
  renderItems();
  renderHistory();
  renderPlan();
  renderSuggestions();
  renderBackup();
  bindTabs();
  updateSidebarSeason();
  save();
}

function updateSidebarSeason(){
  const el = q('#sidebarSeason');
  if(el) el.textContent = state.settings.season || '— Campagna';
}

/* ── DASHBOARD ── */
function renderDashboard(){
  const target = q('#dashboard');
  const totalBought = state.brands.reduce((a,b)=>a+brandTotals(b), 0);
  const totalRev    = state.brands.reduce((a,b)=>a+brandRev(b), 0);
  const margin      = totalRev ? ((totalRev-totalBought)/totalRev*100) : 0;
  const hist        = historyRows();
  const avgSell     = hist.length ? hist.reduce((a,h)=>a+h.sellOut,0)/hist.length : 0;
  const resid       = (state.settings.totalBudget||0) - totalBought;
  const budgetPct   = totalBought / (state.settings.totalBudget||1) * 100;
  const isOver      = totalBought > state.settings.totalBudget;

  target.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Dashboard</div>
        <div class="page-sub">${esc(state.settings.season)} · Sintesi campagna</div>
      </div>
    </div>

    <div class="cards-grid">
      ${statCard('Budget Campagna', euro(state.settings.totalBudget), 'Disponibile stagione', false)}
      ${statCard('Acquistato', euro(totalBought), pct(budgetPct)+' del budget', isOver)}
      ${statCard('Budget Residuo', euro(resid), resid<0?'⚠ Sforamento budget':'Ancora disponibile', resid<0)}
      ${statCard('Vendita Prevista', euro(totalRev), 'Valore retail stagione', false)}
      ${statCard('Margine Medio', pct(margin), 'Target: '+pct(state.settings.targetMargin), margin<state.settings.targetMargin && margin>0)}
      ${statCard('Sell-out Storico', pct(avgSell), hist.length+' record analizzati', false)}
    </div>

    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Utilizzo budget</span>
        <span class="text-mono text-muted" style="font-size:.75rem">${euro(totalBought)} / ${euro(state.settings.totalBudget||0)}</span>
      </div>
      <div class="panel-body">
        <div class="budget-bar-labels">
          <span>${pct(Math.min(100,budgetPct))} utilizzato</span>
          <span>${pct(Math.max(0,100-budgetPct))} residuo</span>
        </div>
        <div class="progress">
          <div class="bar ${isOver?'over':''}" style="width:${Math.min(100,budgetPct)}%"></div>
        </div>
        ${isOver ? `<p style="color:var(--bad);font-size:.78rem;margin-top:.5rem;font-family:var(--font-mono)">⚠ Sforamento: ${euro(totalBought - state.settings.totalBudget)}</p>` : ''}
      </div>
    </div>

    <div class="charts-row">
      <div class="chart-box">
        <div class="chart-title">Allocazione per brand</div>
        <canvas id="chartBrand" height="220"></canvas>
      </div>
      <div class="chart-box">
        <div class="chart-title">Acquisto per categoria</div>
        <canvas id="chartCat" height="220"></canvas>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header"><span class="panel-title">Brand — Riepilogo rapido</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Brand</th><th>Priorità</th><th>Stato</th>
            <th>Costo acq.</th><th>Rev. prevista</th><th>Margine</th><th>% Budget</th>
          </tr></thead>
          <tbody>
            ${state.brands.map(b=>{
              const bt=brandTotals(b), br=brandRev(b);
              const mg=br?((br-bt)/br*100):0;
              const pctB=totalBought?bt/totalBought*100:0;
              return `<tr>
                <td class="td-name">${esc(b.name)}</td>
                <td><span class="priority-${b.priority}">${b.priority}</span></td>
                <td><span class="text-mono text-muted" style="font-size:.75rem">${esc(b.status)}</span></td>
                <td class="td-mono">${euro(bt)}</td>
                <td class="td-mono">${euro(br)}</td>
                <td class="td-mono">${pct(mg)}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:.5rem">
                    <div class="progress" style="width:80px;height:4px">
                      <div class="bar" style="width:${Math.min(100,pctB)}%"></div>
                    </div>
                    <span class="td-mono">${pct(pctB)}</span>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
  drawCharts();
}

function statCard(label, value, sub, warn=false){
  return `<div class="stat-card${warn?' accent-card':''}">
    <div class="stat-label">${label}</div>
    <div class="stat-value">${value}</div>
    <div class="stat-sub">${sub}</div>
  </div>`;
}

function drawCharts(){
  const bctx = q('#chartBrand'); const cctx = q('#chartCat');
  if(!bctx || !cctx) return;
  Object.values(charts).forEach(c=>c.destroy());

  const isDark = document.body.classList.contains('dark');
  const labelColor = isDark ? '#9a9288' : '#5a5550';
  const gridColor  = isDark ? '#2e2a24' : '#e5e2da';

  const brandColors = ['#2c1810','#8b6914','#c4a882','#4a3020','#a0854e','#6b4c2a','#d4c0a0'];

  charts.brand = new Chart(bctx, {
    type: 'doughnut',
    data: {
      labels: state.brands.map(b=>b.name),
      datasets: [{
        data: state.brands.map(brandTotals),
        backgroundColor: brandColors,
        borderWidth: 0,
        hoverOffset: 6,
      }]
    },
    options: {
      plugins: {
        legend: { position:'bottom', labels:{ color:labelColor, font:{size:11}, padding:12, boxWidth:12 } },
        tooltip: { callbacks:{ label: ctx=>' '+euro(ctx.raw) } }
      },
      cutout: '62%',
    }
  });

  const catMap = {};
  allItems().forEach(i => catMap[i.category] = (catMap[i.category]||0) + (i.unitCost*i.qty));
  charts.cat = new Chart(cctx, {
    type: 'bar',
    data: {
      labels: Object.keys(catMap),
      datasets: [{
        label: 'Acquisto costo',
        data: Object.values(catMap),
        backgroundColor: brandColors[1],
        borderRadius: 4,
        hoverBackgroundColor: brandColors[2],
      }]
    },
    options: {
      plugins: { legend:{ display:false } },
      scales: {
        x: { grid:{ color:gridColor }, ticks:{ color:labelColor, font:{size:10} } },
        y: { grid:{ color:gridColor }, ticks:{ color:labelColor, font:{size:10}, callback: v=>'€'+Number(v).toLocaleString('it-IT') } }
      }
    }
  });
}

/* ── SETTINGS ── */
function renderSettings(){
  q('#settings').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Budget & Campagna</div>
        <div class="page-sub">Parametri stagione corrente</div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-header"><span class="panel-title">Impostazioni generali</span></div>
      <div class="panel-body">
        <div class="form-grid">
          ${field('Stagione', `<input id="season" value="${esc(state.settings.season||'')}" placeholder="es. FW 2026">`)}
          ${field('Budget totale (€)', `<input id="totalBudget" type="number" value="${state.settings.totalBudget||0}">`)}
          ${field('Margine target (%)', `<input id="targetMargin" type="number" value="${state.settings.targetMargin||0}">`)}
          ${field('Obiettivo fatturato (€)', `<input id="revenueGoal" type="number" value="${state.settings.revenueGoal||0}">`)}
          ${field('Data inizio', `<input id="startDate" type="date" value="${esc(state.settings.startDate||'')}">`)}
          ${field('Data fine', `<input id="endDate" type="date" value="${esc(state.settings.endDate||'')}">`)}
        </div>
        <button class="btn btn-primary" id="saveSettings">Aggiorna impostazioni</button>
      </div>
    </div>
  `;
  q('#saveSettings').onclick = ()=>{
    ['season','startDate','endDate'].forEach(k=>state.settings[k]=q('#'+k).value);
    ['totalBudget','targetMargin','revenueGoal'].forEach(k=>state.settings[k]=Number(q('#'+k).value||0));
    render();
    showToast('Impostazioni aggiornate');
  };
}

/* ── BRANDS ── */
function renderBrands(){
  const total = state.brands.reduce((a,b)=>a+brandTotals(b),0);
  const rows = state.brands.map(b=>{
    const bt=brandTotals(b), br=brandRev(b), mg=br?((br-bt)/br*100):0;
    return `<tr>
      <td>
        <div class="td-name">${esc(b.name)}</div>
        <div class="brand-row-extra">${esc(b.category||'')} · ${b.items.length} articoli</div>
      </td>
      <td><span class="priority-${b.priority}">${b.priority}</span></td>
      <td><span class="text-mono text-muted" style="font-size:.75rem">${esc(b.status)}</span></td>
      <td class="td-mono">${euro(bt)}</td>
      <td class="td-mono">${pct(total?bt/total*100:0)}</td>
      <td class="td-mono">${pct(mg)}</td>
      <td>
        <div class="flex-row gap-1">
          <button class="btn btn-secondary" style="padding:.3rem .6rem;font-size:.75rem" onclick="dupBrand('${b.id}')">Duplica</button>
          <button class="btn" style="padding:.3rem .6rem;font-size:.75rem;color:var(--bad);border-color:var(--bad)" onclick="delBrand('${b.id}')">Elimina</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  q('#brands').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Brand</div>
        <div class="page-sub">${state.brands.length} brand in portafoglio</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header"><span class="panel-title">Aggiungi nuovo brand</span></div>
      <div class="panel-body">
        <div class="form-grid">
          ${field('Nome brand', `<input id="bName" placeholder="Nome brand">`)}
          ${field('Priorità', `<select id="bPriority"><option>alta</option><option selected>media</option><option>bassa</option></select>`)}
          ${field('Stato', `<select id="bStatus"><option>continuativo</option><option>nuovo</option><option>da ridurre</option></select>`)}
          ${field('Crescita attesa (%)', `<input id="bGrowth" type="number" placeholder="0">`)}
          ${field('Categoria principale', `<select id="bCategory">${CATS.map(c=>`<option>${c}</option>`).join('')}</select>`)}
          ${field('Budget brand (€)', `<input id="bBudget" type="number" placeholder="0">`)}
          ${field('Budget test (€)', `<input id="bTest" type="number" placeholder="Solo per nuovi">`)}
          ${field('Note', `<input id="bNotes" placeholder="Note qualitative">`)}
        </div>
        <button class="btn btn-primary" id="addBrand">+ Aggiungi brand</button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header"><span class="panel-title">Portafoglio brand</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Brand</th><th>Priorità</th><th>Stato</th>
            <th>Costo acq.</th><th>% Budget</th><th>Margine</th><th>Azioni</th>
          </tr></thead>
          <tbody>${rows || emptyRow(7,'Nessun brand aggiunto')}</tbody>
        </table>
      </div>
    </div>
  `;

  q('#addBrand').onclick = ()=>{
    const name = q('#bName').value.trim();
    if(!name){ showToast('Inserisci il nome del brand', 'warn'); return; }
    state.brands.push({
      id:id(), name, priority:q('#bPriority').value, status:q('#bStatus').value,
      expectedGrowth:Number(q('#bGrowth').value||0), category:q('#bCategory').value,
      budget:Number(q('#bBudget').value||0), testBudget:Number(q('#bTest').value||0),
      notes:q('#bNotes').value, items:[], history:[]
    });
    render();
    showToast('Brand aggiunto');
  };
}

window.delBrand = (bid)=>{
  if(!confirm('Elimina brand e tutti i suoi articoli?')) return;
  state.brands = state.brands.filter(b=>b.id!==bid);
  render();
};

window.dupBrand = (bid)=>{
  const b = state.brands.find(x=>x.id===bid);
  if(!b) return;
  const c = structuredClone(b);
  c.id = id(); c.name += ' (copia)';
  state.brands.push(c);
  render();
  showToast('Brand duplicato');
};

/* ── ITEMS ── */
function renderItems(){
  const brandOpts = state.brands.map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join('');
  const rows = allItems().map(i=>{
    const b = state.brands.find(x=>x.id===i.brandId);
    const m = itemMetrics(i, brandTotals(b), state.settings.totalBudget);
    return `<tr>
      <td>${esc(i.brandName)}</td>
      <td>
        <div class="td-name">${esc(i.name)}</div>
        <div class="brand-row-extra td-mono">${esc(i.code)}</div>
      </td>
      <td class="td-mono">${esc(i.category)}</td>
      <td><span class="status-badge status-${i.status==='confermato'?'confermato':i.status==='eliminato'?'eliminato':'valutare'}">${esc(i.status)}</span></td>
      <td class="td-mono">${i.qty}</td>
      <td class="td-mono">${eurod(i.unitCost)}</td>
      <td class="td-mono">${euro(m.cost)}</td>
      <td class="td-mono">${pct(m.margin)}</td>
      <td class="td-mono">${pct(m.markup)}</td>
      <td>
        <button class="btn" style="padding:.28rem .55rem;font-size:.72rem;color:var(--bad);border-color:var(--bad)" onclick="delItem('${i.brandId}','${i.id}')">✕</button>
      </td>
    </tr>`;
  }).join('');

  q('#items').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Articoli</div>
        <div class="page-sub">${allItems().length} articoli totali</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header"><span class="panel-title">Inserimento articolo</span></div>
      <div class="panel-body">
        <div class="form-grid">
          ${field('Brand', `<select id="iBrand">${brandOpts}</select>`)}
          ${field('Nome articolo', `<input id="iName" placeholder="Nome">`)}
          ${field('Codice', `<input id="iCode" placeholder="SKU / Codice">`)}
          ${field('Categoria', `<select id="iCategory">${CATS.map(c=>`<option>${c}</option>`).join('')}</select>`)}
          ${field('Stagione', `<select id="iSeason"><option>SS</option><option selected>FW</option></select>`)}
          ${field('Costo unitario (€)', `<input id="iCost" type="number" placeholder="0.00">`)}
          ${field('Prezzo vendita (€)', `<input id="iPrice" type="number" placeholder="0.00">`)}
          ${field('Quantità', `<input id="iQty" type="number" placeholder="0">`)}
          ${field('Taglie', `<input id="iSizes" placeholder="es. 46-54">`)}
          ${field('Colore', `<input id="iColor" placeholder="Colore">`)}
          ${field('Profondità taglie', `<input id="iDepth" placeholder="completa / parziale">`)}
          ${field('Stato', `<select id="iStatus"><option>confermato</option><option>da valutare</option><option>eliminato</option></select>`)}
          ${field('Note', `<input id="iNotes" placeholder="Note">`)}
        </div>
        <button class="btn btn-primary" id="addItem">+ Aggiungi articolo</button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header"><span class="panel-title">Tutti gli articoli</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Brand</th><th>Articolo</th><th>Categoria</th><th>Stato</th>
            <th>Qtà</th><th>Costo unit.</th><th>Totale</th><th>Margine</th><th>Markup</th><th></th>
          </tr></thead>
          <tbody>${rows || emptyRow(10,'Nessun articolo inserito')}</tbody>
        </table>
      </div>
    </div>
  `;

  q('#addItem').onclick = ()=>{
    const bid = q('#iBrand').value;
    const b = state.brands.find(x=>x.id===bid);
    if(!b){ showToast('Seleziona un brand', 'warn'); return; }
    const name = q('#iName').value.trim();
    if(!name){ showToast('Inserisci il nome articolo', 'warn'); return; }
    b.items.push({
      id:id(), name, code:q('#iCode').value, category:q('#iCategory').value,
      season:q('#iSeason').value, unitCost:Number(q('#iCost').value||0),
      sellPrice:Number(q('#iPrice').value||0), qty:Number(q('#iQty').value||0),
      sizes:q('#iSizes').value, color:q('#iColor').value, depth:q('#iDepth').value,
      description:'', notes:q('#iNotes').value, status:q('#iStatus').value
    });
    render();
    showToast('Articolo aggiunto');
  };
}

window.delItem = (bid,iid)=>{
  const b = state.brands.find(x=>x.id===bid);
  if(!b) return;
  b.items = b.items.filter(i=>i.id!==iid);
  render();
};

/* ── HISTORY ── */
function renderHistory(){
  const rows = historyRows().map(h=>{
    const [label,cls] = sellOutClass(h.sellOut);
    return `<tr>
      <td class="td-name">${esc(h.brandName)}</td>
      <td class="td-mono">${esc(h.category)}</td>
      <td class="td-mono">${euro(h.purchasedValue)}</td>
      <td class="td-mono">${h.purchasedQty}</td>
      <td class="td-mono">${h.soldQty}</td>
      <td><span class="badge ${cls}">${label} ${pct(h.sellOut)}</span></td>
      <td class="td-mono">${h.remaining}</td>
      <td class="td-mono">${pct(h.effectiveMargin)}</td>
    </tr>`;
  }).join('');

  const brandOpts = state.brands.map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join('');

  q('#history').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Storico</div>
        <div class="page-sub">Performance stagioni precedenti</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header"><span class="panel-title">Aggiungi record storico</span></div>
      <div class="panel-body">
        <div class="form-grid">
          ${field('Brand', `<select id="hBrand">${brandOpts}</select>`)}
          ${field('Categoria', `<select id="hCategory">${CATS.map(c=>`<option>${c}</option>`).join('')}</select>`)}
          ${field('Ordinato prec. (€)', `<input id="hOrdered" type="number" placeholder="0">`)}
          ${field('Qtà acquistata', `<input id="hPurchasedQty" type="number" placeholder="0">`)}
          ${field('Valore acquistato (€)', `<input id="hPurchasedVal" type="number" placeholder="0">`)}
          ${field('Valore venduto (€)', `<input id="hSoldVal" type="number" placeholder="0">`)}
          ${field('Qtà venduta', `<input id="hSoldQty" type="number" placeholder="0">`)}
          ${field('Rimanenza (pz)', `<input id="hRem" type="number" placeholder="0">`)}
          ${field('Margine effettivo (%)', `<input id="hMargin" type="number" placeholder="0">`)}
          ${field('Note', `<input id="hNote" placeholder="Note">`)}
        </div>
        <button class="btn btn-primary" id="addHist">+ Aggiungi storico</button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header"><span class="panel-title">Dati storici</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Brand</th><th>Categoria</th><th>Acq. costo</th>
            <th>Qtà acq.</th><th>Qtà vend.</th><th>Sell-out</th><th>Rimanenza</th><th>Margine</th>
          </tr></thead>
          <tbody>${rows || emptyRow(8,'Nessun dato storico inserito')}</tbody>
        </table>
      </div>
    </div>
  `;

  q('#addHist').onclick = ()=>{
    const b = state.brands.find(x=>x.id===q('#hBrand').value);
    if(!b){ showToast('Seleziona un brand', 'warn'); return; }
    b.history.push({
      id:id(), category:q('#hCategory').value,
      orderedValue:Number(q('#hOrdered').value||0),
      purchasedQty:Number(q('#hPurchasedQty').value||0),
      purchasedValue:Number(q('#hPurchasedVal').value||0),
      soldValue:Number(q('#hSoldVal').value||0),
      soldQty:Number(q('#hSoldQty').value||0),
      remaining:Number(q('#hRem').value||0),
      effectiveMargin:Number(q('#hMargin').value||0),
      notes:q('#hNote').value
    });
    render();
    showToast('Storico aggiunto');
  };
}

/* ── PLAN ── */
function renderPlan(){
  const totalPlanned = state.brands.reduce((a,b)=>a+brandTotals(b),0);
  const totalSugg    = state.brands.reduce((a,b)=>a+calcSuggested(b),0);

  const rows = state.brands.map(b=>{
    const suggested = calcSuggested(b);
    const planned   = brandTotals(b);
    const delta     = planned - suggested;
    const deltaCls  = Math.abs(delta)<100 ? 'delta-zero' : delta>0 ? 'delta-pos' : 'delta-neg';
    const deltaSign = delta>0 ? '+' : '';
    return `<tr>
      <td>
        <div class="td-name">${esc(b.name)}</div>
        <div class="brand-row-extra"><span class="priority-${b.priority}">${b.priority}</span> · ${esc(b.status)}</div>
      </td>
      <td class="td-mono">${euro(suggested)}</td>
      <td class="td-mono">${euro(planned)}</td>
      <td class="${deltaCls}">${deltaSign}${euro(delta)}</td>
      <td>
        <div class="progress" style="width:120px;height:5px">
          <div class="bar" style="width:${Math.min(100,totalSugg?suggested/totalSugg*100:0)}%"></div>
        </div>
      </td>
    </tr>`;
  }).join('');

  q('#plan').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Piano Acquisti</div>
        <div class="page-sub">Confronto pianificato vs consigliato</div>
      </div>
      <button class="btn btn-gold" id="genAuto">⟳ Genera proposta automatica</button>
    </div>

    <div class="cards-grid" style="grid-template-columns:repeat(3,1fr)">
      ${statCard('Totale pianificato', euro(totalPlanned), 'Acquisti confermati', false)}
      ${statCard('Totale consigliato', euro(totalSugg), 'Basato su storico', false)}
      ${statCard('Scostamento globale', euro(totalPlanned-totalSugg), totalPlanned>totalSugg?'Sopra la proposta':'Sotto la proposta', totalPlanned>state.settings.totalBudget)}
    </div>

    <div class="panel">
      <div class="panel-header"><span class="panel-title">Piano dettagliato per brand</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Brand</th><th>Consigliato</th><th>Pianificato</th>
            <th>Scostamento</th><th>Peso relativo</th>
          </tr></thead>
          <tbody>${rows || emptyRow(5,'Nessun brand inserito')}</tbody>
        </table>
      </div>
    </div>
  `;

  q('#genAuto').onclick = ()=>{
    state.brands.forEach(b=>b.budget=Math.round(calcSuggested(b)));
    render();
    showToast('Proposta automatica applicata ai budget brand');
  };
}

/* ── SUGGESTIONS ── */
function renderSuggestions(){
  const arr = [];
  const total = state.brands.reduce((a,b)=>a+brandTotals(b),0);

  state.brands.forEach(b=>{
    const h = historyRows().filter(x=>x.brandId===b.id);
    const avg = h.length ? h.reduce((a,r)=>a+r.sellOut,0)/h.length : 0;
    const rem = h.reduce((a,r)=>a+r.remaining,0);

    if(avg>75) arr.push(alert_('good','↑ Aumenta acquisto',`<strong>${esc(b.name)}</strong> ha sell-out medio del ${pct(avg)}: performance eccellente, valuta incremento ordini.`));
    if(avg<40 && h.length>0) arr.push(alert_('bad','↓ Riduci acquisto',`<strong>${esc(b.name)}</strong> ha sell-out medio del ${pct(avg)}: riduzione forte consigliata o uscita dal portafoglio.`));
    if(rem>25) arr.push(alert_('warn','⚠ Rimanenze elevate',`<strong>${esc(b.name)}</strong> presenta rimanenze eccessive (${rem} pz): attenzione all'acquisto.`));
    if(total && (brandTotals(b)/total)*100>35) arr.push(alert_('warn','⚠ Concentrazione',`<strong>${esc(b.name)}</strong> assorbe oltre il 35% del budget totale: valuta diversificazione.`));
    if(b.status==='nuovo' && b.testBudget>7000) arr.push(alert_('warn','⚠ Budget test alto',`<strong>${esc(b.name)}</strong> è un brand nuovo con budget test elevato (${euro(b.testBudget)}): monitorare.`));
  });

  if(total>(state.settings.totalBudget||0)) arr.push(alert_('bad','✕ Budget superato',`Il totale acquisti (${euro(total)}) supera il budget campagna di <strong>${euro(total-state.settings.totalBudget)}</strong>.`));

  const rev = state.brands.reduce((a,b)=>a+brandRev(b),0);
  const margin = rev ? ((rev-total)/rev*100) : 0;
  if(margin>0 && margin<state.settings.targetMargin) arr.push(alert_('bad','✕ Margine sotto target',`Margine medio previsto ${pct(margin)} è inferiore al target ${pct(state.settings.targetMargin)}. Rivedi prezzi o mix acquisti.`));
  if(margin>=state.settings.targetMargin && margin>0) arr.push(alert_('good','✓ Margine nel target',`Margine medio previsto ${pct(margin)} è in linea con il target ${pct(state.settings.targetMargin)}.`));

  q('#suggestions').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Analisi & Alert</div>
        <div class="page-sub">${arr.length} segnalazioni automatiche</div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-header"><span class="panel-title">Suggerimenti automatici</span></div>
      <div class="panel-body">
        ${arr.length ? arr.join('') : '<div class="empty-state"><div class="empty-icon">✓</div><p>Nessun alert — piano equilibrato.</p></div>'}
      </div>
    </div>
  `;
}

function alert_(type, title, text){
  const icons = { good:'✓', warn:'⚠', bad:'✕' };
  return `<div class="alert ${type}">
    <span class="alert-icon">${icons[type]||'•'}</span>
    <div><strong>${title}</strong> — ${text}</div>
  </div>`;
}

/* ── BACKUP ── */
function renderBackup(){
  q('#backup').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Import / Export</div>
        <div class="page-sub">Backup e ripristino dati</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header"><span class="panel-title">Esporta</span></div>
      <div class="panel-body" style="display:flex;gap:.7rem;flex-wrap:wrap">
        <button class="btn btn-secondary" id="expJson">↓ Backup JSON</button>
        <button class="btn btn-secondary" id="expCsv">↓ Riepilogo CSV</button>
        <button class="btn btn-secondary" onclick="window.print()">⎙ Stampa</button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header"><span class="panel-title">Importa</span></div>
      <div class="panel-body">
        <label class="import-area" for="impJson">
          <input type="file" id="impJson" accept="application/json" />
          <div style="font-family:var(--font-display);font-style:italic;font-size:1.3rem;margin-bottom:.4rem">Seleziona file JSON</div>
          <div style="font-size:.78rem;font-family:var(--font-mono);color:var(--text2)">Clicca per scegliere un backup precedente</div>
        </label>
      </div>
    </div>
  `;

  q('#expJson').onclick = ()=>download('planner-backup.json', JSON.stringify(state,null,2), 'application/json');
  q('#expCsv').onclick = ()=>{
    const lines = ['Brand,Acquisto pianificato,Consigliato,Scostamento'];
    state.brands.forEach(b=>{
      const p=brandTotals(b), s=calcSuggested(b);
      lines.push(`"${b.name}",${p},${Math.round(s)},${p-Math.round(s)}`);
    });
    download('riepilogo.csv', lines.join('\n'), 'text/csv');
  };
  q('#impJson').onchange = e=>{
    const f = e.target.files[0];
    if(!f) return;
    const fr = new FileReader();
    fr.onload = ()=>{
      try {
        Object.assign(state, JSON.parse(fr.result));
        render();
        showToast('Backup importato correttamente');
      } catch(err){
        showToast('File non valido', 'bad');
      }
    };
    fr.readAsText(f);
  };
}

function download(name, content, type){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content],{type}));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ── Helpers ── */
function field(label, input){
  return `<div class="field-group">
    <label class="field-label">${label}</label>
    ${input}
  </div>`;
}

function emptyRow(cols, text){
  return `<tr><td colspan="${cols}" style="text-align:center;padding:2rem;color:var(--text2);font-style:italic">${text}</td></tr>`;
}

/* ── Toast notifications ── */
function showToast(msg, type='good'){
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position:'fixed', bottom:'1.5rem', right:'1.5rem',
    background: type==='bad'?'var(--bad)':type==='warn'?'var(--warn)':'var(--good)',
    color:'#fff', padding:'.65rem 1.1rem', borderRadius:'6px',
    fontFamily:'var(--font-mono)', fontSize:'.78rem', fontWeight:'500',
    boxShadow:'0 4px 20px rgba(0,0,0,.2)', zIndex:'9999',
    transform:'translateY(10px)', opacity:'0', transition:'all .3s'
  });
  document.body.appendChild(t);
  requestAnimationFrame(()=>{ t.style.transform='translateY(0)'; t.style.opacity='1'; });
  setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateY(10px)'; setTimeout(()=>t.remove(),350); }, 2800);
}

/* ── Tabs ── */
function bindTabs(){
  qa('.tab-btn').forEach(b=>{
    b.onclick = ()=>{
      qa('.tab-btn').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      qa('.tab').forEach(t=>t.classList.remove('active'));
      q('#'+b.dataset.tab).classList.add('active');
    };
  });
}

/* ── Global controls ── */
q('#toggleTheme').onclick = ()=>{
  document.body.classList.toggle('dark');
  state.theme = document.body.classList.contains('dark') ? 'dark' : 'light';
  save();
  drawCharts();
};

q('#saveBtn').onclick = ()=>{ save(); showToast('Dati salvati'); };

q('#resetBtn').onclick = ()=>{
  if(confirm('Confermi il reset completo? Tutti i dati verranno eliminati.')){ localStorage.removeItem(KEY); location.reload(); }
};

if(state.theme==='dark') document.body.classList.add('dark');

render();
