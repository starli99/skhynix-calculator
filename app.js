const $=id=>document.getElementById(id);
const KEY="stockWatchlistV1";
const DEFAULTS=[
 {symbol:"000660.KS",name:"SK海力士",market:"KR",currency:"KRW"},
 {symbol:"07709.HK",name:"海力士每日两倍",market:"HK",currency:"HKD"},
 {symbol:"09868.HK",name:"小鹏汽车-W",market:"HK",currency:"HKD"},
 {symbol:"QQQ",name:"Invesco QQQ",market:"US",currency:"USD"}
];
let list=JSON.parse(localStorage.getItem(KEY)||"null")||DEFAULTS;
let quotes={};

function normalize(v){
 v=v.trim().toUpperCase();
 const fixed={
  "000660":{symbol:"000660.KS",name:"SK海力士",market:"KR",currency:"KRW"},
  "000660.KS":{symbol:"000660.KS",name:"SK海力士",market:"KR",currency:"KRW"},
  "07709":{symbol:"07709.HK",name:"海力士每日两倍",market:"HK",currency:"HKD"},
  "7709":{symbol:"07709.HK",name:"海力士每日两倍",market:"HK",currency:"HKD"},
  "07709.HK":{symbol:"07709.HK",name:"海力士每日两倍",market:"HK",currency:"HKD"},
  "9868":{symbol:"09868.HK",name:"小鹏汽车-W",market:"HK",currency:"HKD"},
  "09868":{symbol:"09868.HK",name:"小鹏汽车-W",market:"HK",currency:"HKD"},
  "09868.HK":{symbol:"09868.HK",name:"小鹏汽车-W",market:"HK",currency:"HKD"}
 };
 if(fixed[v])return fixed[v];
 if(/^\d{5}\.HK$/.test(v))return {symbol:v,name:v.replace(".HK",""),market:"HK",currency:"HKD"};
 if(/^[A-Z][A-Z0-9.-]{0,9}$/.test(v))return {symbol:v,name:v,market:"US",currency:"USD"};
 throw new Error("代码格式无法识别");
}
function save(){localStorage.setItem(KEY,JSON.stringify(list))}
function fmt(n,c){if(n==null||!Number.isFinite(Number(n)))return "—";const d=c==="KRW"?0:2;return Number(n).toLocaleString("zh-CN",{minimumFractionDigits:d,maximumFractionDigits:d})}
function render(){
 $("list").innerHTML="";
 list.forEach((s,i)=>{
  const q=quotes[s.symbol]||{};
  const card=document.createElement("article"); card.className="stock-card";
  card.innerHTML=`<div class="stock-main"><div class="stock-name">${q.name||s.name}</div><div class="ticker">${s.symbol} · ${s.market}</div></div>
  <div class="quote"><div class="price">${fmt(q.price,s.currency)}</div><div class="change ${q.changePercent>0?"up":q.changePercent<0?"down":""}">${q.changePercent==null?"等待刷新":`${q.changePercent>0?"+":""}${Number(q.changePercent).toFixed(2)}%`}</div></div>
  <button class="delete" aria-label="删除">✕</button>`;
  card.querySelector(".stock-main").onclick=()=>location.href=`stock.html?symbol=${encodeURIComponent(s.symbol)}&name=${encodeURIComponent(s.name)}&market=${s.market}&currency=${s.currency}`;
  card.querySelector(".delete").onclick=()=>{list.splice(i,1);save();render()};
  $("list").appendChild(card);
 });
}
async function refresh(){
 const base=window.STOCK_CONFIG?.API_BASE; $("refresh").disabled=true;$("message").textContent="正在获取行情…";
 try{
  const symbols=list.map(x=>x.symbol).join(",");
  let r=await fetch(`${base}/api/quotes?symbols=${encodeURIComponent(symbols)}`,{cache:"no-store"});
  let j=await r.json();
  if(!r.ok||!j.ok)throw new Error(j.error||`HTTP ${r.status}`);
  const rows=j.quotes||j.data||[];
  quotes=Object.fromEntries(rows.map(x=>[x.symbol,x]));
  // 兼容旧海力士接口
  if(j.korea)quotes["000660.KS"]={...j.korea,symbol:"000660.KS",name:"SK海力士"};
  if(j.hk)quotes["07709.HK"]={...j.hk,symbol:"07709.HK",name:"海力士每日两倍"};
  $("message").textContent=`刷新成功 · ${new Date(j.updatedAt||Date.now()).toLocaleString("zh-CN",{hour12:false})}`;
 }catch(e){$("message").textContent=`刷新失败：${e.message}。未使用虚构价格。`}
 finally{$("refresh").disabled=false;render()}
}
$("add").onclick=()=>{try{const s=normalize($("symbolInput").value);if(list.some(x=>x.symbol===s.symbol))throw new Error("已在自选中");list.push(s);save();$("symbolInput").value="";$("message").textContent=`已添加 ${s.name}`;render()}catch(e){$("message").textContent=e.message}};
$("refresh").onclick=refresh;
$("theme").onclick=()=>{const next=document.documentElement.dataset.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=next;localStorage.setItem("theme",next);$("theme").textContent=next==="dark"?"☀️":"🌙"};
document.documentElement.dataset.theme=localStorage.getItem("theme")||"light";$("theme").textContent=document.documentElement.dataset.theme==="dark"?"☀️":"🌙";render();refresh();
