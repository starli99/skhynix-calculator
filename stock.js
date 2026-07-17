const $=id=>document.getElementById(id),p=new URLSearchParams(location.search);
const symbol=p.get("symbol"),currency=p.get("currency")||"USD";
$("name").textContent=p.get("name")||symbol;$("ticker").textContent=`${symbol} · ${p.get("market")||""}`;
const decimals=currency==="KRW"?0:2,fmt=x=>x==null?"—":Number(x).toLocaleString("zh-CN",{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
function ma(a,n){if(a.length<n)return null;return a.slice(-n).reduce((s,x)=>s+x.close,0)/n}
function levels(a){
 const lows=[],highs=[];
 for(let i=3;i<a.length-3;i++){const w=a.slice(i-3,i+4);if(w.every(x=>a[i].low<=x.low))lows.push(a[i].low);if(w.every(x=>a[i].high>=x.high))highs.push(a[i].high)}
 const last=a.at(-1)?.close||0;
 return {support:lows.filter(x=>x<last).sort((a,b)=>b-a)[0],resistance:highs.filter(x=>x>last).sort((a,b)=>a-b)[0]};
}
async function load(){
 try{
  const base=window.STOCK_CONFIG?.API_BASE;
  const r=await fetch(`${base}/api/history?symbol=${encodeURIComponent(symbol)}&range=1y&interval=1d`,{cache:"no-store"});
  const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||`HTTP ${r.status}`);
  const a=j.candles||j.data||[];if(!a.length)throw new Error("接口没有返回K线");
  const last=a.at(-1),prev=a.at(-2),cp=prev?(last.close/prev.close-1)*100:null;
  $("price").textContent=fmt(last.close);$("change").textContent=cp==null?"—":`${cp>0?"+":""}${cp.toFixed(2)}%`;$("change").className=`change ${cp>0?"up":cp<0?"down":""}`;
  const h=Math.max(...a.map(x=>x.high)),l=Math.min(...a.map(x=>x.low));$("high52").textContent=fmt(h);$("low52").textContent=fmt(l);$("drawdown").textContent=`${((last.close/h-1)*100).toFixed(2)}%`;
  $("ma5").textContent=fmt(ma(a,5));$("ma20").textContent=fmt(ma(a,20));$("ma60").textContent=fmt(ma(a,60));
  const lv=levels(a);$("support").textContent=fmt(lv.support);$("resistance").textContent=fmt(lv.resistance);$("time").textContent=j.updatedAt?new Date(j.updatedAt).toLocaleString("zh-CN",{hour12:false}):last.date;
  $("status").textContent=j.dataStatus||"真实K线";
  const chart=LightweightCharts.createChart($("chart"),{width:$("chart").clientWidth,height:$("chart").clientHeight,layout:{background:{color:"transparent"},textColor:getComputedStyle(document.documentElement).getPropertyValue("--text")},timeScale:{borderVisible:false},rightPriceScale:{borderVisible:false}});
  const cs=chart.addCandlestickSeries({upColor:"#d92d20",downColor:"#039855",borderVisible:false,wickUpColor:"#d92d20",wickDownColor:"#039855"});
  cs.setData(a.map(x=>({time:x.date,open:x.open,high:x.high,low:x.low,close:x.close})));chart.timeScale().fitContent();
  addEventListener("resize",()=>chart.applyOptions({width:$("chart").clientWidth}));
 }catch(e){$("status").textContent="暂无数据";$("note").textContent=`获取失败：${e.message}。页面没有补写任何价格。`}
}
$("theme").onclick=()=>{const n=document.documentElement.dataset.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=n;localStorage.setItem("theme",n);location.reload()};
document.documentElement.dataset.theme=localStorage.getItem("theme")||"light";$("theme").textContent=document.documentElement.dataset.theme==="dark"?"☀️":"🌙";load();
