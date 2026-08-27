// ── Rendering ──
const P = window.PKG;
const main=document.getElementById("main"),detail=document.getElementById("detail"),grid=document.getElementById("grid");
const sideName=document.getElementById("sideName"),sideDeps=document.getElementById("sideDeps"),sideNav=document.getElementById("sideNav"),inner=document.getElementById("inner"),sideSearch=document.getElementById("sideSearch");

let curPkg=null,curExp=null;

// ── Main screen ──
function renderMain(){
  let h="";
  for(const p of P){
    const tm=p.exports.reduce((s,e)=>s+e.methods.length,0);
    h+=`<div class="card" onclick="openPkg('${p.id}')">
      <div class="card-top"><div class="card-icon">${p.icon}</div><h3>${p.name}<span>${p.tag}</span></h3></div>
      <p>${p.desc}</p>
      <div class="card-foot">${p.exports.length} exports · ${tm} methods</div>
    </div>`;
  }
  grid.innerHTML=h;
}

// ── Open package ──
function openPkg(id){
  const p=P.find(x=>x.id===id);if(!p)return;
  curPkg=p;curExp=null;
  main.classList.add("hide");detail.classList.remove("hide");
  sideName.textContent=p.name;
  sideDeps.innerHTML=p.deps.length?p.deps.map(d=>`<span class="dep">@vinhnt-sdk/${d}</span>`).join(""):"";
  sideSearch.value="";
  renderNav(p);renderOverview(p);
}

function back(){
  detail.classList.add("hide");main.classList.remove("hide");
  curPkg=null;curExp=null;
}

// ── Sidebar nav ──
function renderNav(pkg,filter=""){
  const lf=filter.toLowerCase();
  let h="";
  for(const e of pkg.exports){
    if(lf&&!e.name.toLowerCase().includes(lf))continue;
    const bc=e.type==="class"?"b-c":e.type==="function"?"b-f":e.type==="type"?"b-i":"b-t";
    const on=curExp===e.name?" on":"";
    h+=`<div class="nav-i${on}" onclick="selectExp('${e.name}')"><span class="b ${bc}">${e.type[0].toUpperCase()}</span>${e.name}</div>`;
  }
  sideNav.innerHTML=h;
}

// ── Select export ──
function selectExp(name){
  const e=curPkg.exports.find(x=>x.name===name);if(!e)return;
  curExp=name;renderNav(curPkg);
  let h=`<div style="margin-bottom:14px"><button onclick="renderOverview(curPkg)" style="background:0 0;border:0;color:#60a5fa;cursor:pointer;font-size:12px;padding:0">← All exports</button></div>`;
  h+=renderCard(e,true);
  inner.innerHTML=h;inner.parentElement.scrollTop=0;
}

// ── Overview ──
function renderOverview(pkg){
  let h=`<div class="sec"><div class="sec-h"><h2>${pkg.name}</h2></div><p class="desc">${pkg.desc}</p></div>`;
  for(const e of pkg.exports) h+=renderCard(e,false);
  inner.innerHTML=h;inner.parentElement.scrollTop=0;
}

// ── Render card ──
function renderCard(exp,full){
  const bc=exp.type==="class"?"b-c":exp.type==="function"?"b-f":exp.type==="type"?"b-i":"b-t";
  let h=`<div class="sec"><div class="sec-h"><span class="badge ${bc}" style="font-size:11px">${exp.type}</span><h2>${exp.name}</h2></div>`;
  if(exp.desc)h+=`<p class="desc">${exp.desc}</p>`;
  
  // Render properties if present
  if(exp.props&&exp.props.length){
    h+=renderPropsTable(exp.props,"Properties");
  }
  
  // Render methods
  const ms=full?exp.methods:exp.methods.slice(0,2);
  for(const m of ms) h+=renderMethod(m);
  if(!full&&exp.methods.length>2){
    h+=`<details><summary class="ex-t">Show all ${exp.methods.length} methods →</summary>`;
    for(const m of exp.methods.slice(2)) h+=renderMethod(m);
    h+=`</details>`;
  }
  if(exp.example){
    h+=`<div style="margin-top:6px"><span class="ex-t" onclick="this.nextElementSibling.classList.toggle('show')">▸ Example</span><div class="ex-c">${esc(exp.example)}</div></div>`;
  }
  h+=`</div>`;return h;
}

// ── Render method ──
function renderMethod(m){
  let h=`<div class="mc">`;
  if(m.sig) h+=`<div class="mc-sig">${hl(m.sig)}</div>`;
  if(m.desc) h+=`<p class="desc" style="margin-bottom:6px">${m.desc}</p>`;
  // params from methods array (for type interfaces)
  const params=m.params||[];
  if(params.length){
    h+=`<table class="tb"><thead><tr><th>Name</th><th>Type</th><th></th><th>Description</th></tr></thead><tbody>`;
    for(const p of params){
      if(p.n&&p.t){
        h+=`<tr><td class="pn">${esc(p.n)}</td><td class="pt">${esc(p.t)}</td><td>${p.r?'<span class="pr">required</span>':'<span class="po">optional</span>'}</td><td class="pd">${esc(p.d)}</td></tr>`;
      } else if(p.name){
        h+=`<tr><td class="pn">${esc(p.name)}</td><td class="pt">${esc(p.type||"")}</td><td>${p.required?'<span class="pr">required</span>':'<span class="po">optional</span>'}</td><td class="pd">${esc(p.desc||"")}</td></tr>`;
      }
    }
    h+=`</tbody></table>`;
  }
  if(m.ret) h+=`<div style="margin-top:6px"><span style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.3px">Returns</span><br><code style="font-family:monospace;color:#60a5fa;font-size:11px">${esc(m.ret)}</code></div>`;
  h+=`</div>`;return h;
}

// ── Render properties table ──
function renderPropsTable(props, label=""){
  let h=``;
  if(label) h+=`<div style="margin:8px 0 4px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.3px">${label}</div>`;
  h+=`<table class="tb"><thead><tr><th>Name</th><th>Type</th><th></th><th>Description</th></tr></thead><tbody>`;
  for(const p of props){
    const inheritedTag=p.inherited?` <span style="font-size:9px;color:var(--muted);font-style:italic">(from ${esc(p.inherited)})</span>`:'';
    h+=`<tr><td class="pn">${esc(p.name)}${inheritedTag}</td><td class="pt">${esc(p.type||"")}</td><td>${p.required?'<span class="pr">required</span>':'<span class="po">optional</span>'}</td><td class="pd">${esc(p.desc||"")}</td></tr>`;
  }
  h+=`</tbody></table>`;
  return h;
}

// ── Highlight ──
function hl(s){
  return s
    .replace(/\b(class|function|const|new|async|await|return|readonly|type|interface|extends|from|import|if|else|void|Promise|boolean|string|number|undefined|null|true|false)\b/g,'<span class="k">$1</span>')
    .replace(/(["'`])(?:(?!\1).)*\1/g,'<span class="s">$&</span>')
    .replace(/:\s*([A-Z][A-Za-z0-9_<>\[\]|&?\s]*)/g,': <span class="t">$1</span>')
    .replace(/\b(\d+)\b/g,'<span class="n">$1</span>');
}

function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

// ── Search ──
sideSearch.addEventListener("input",e=>{if(curPkg)renderNav(curPkg,e.target.value.trim())});

// ── Keyboard ──
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&curPkg)back()});

// ── Init ──
renderMain();
