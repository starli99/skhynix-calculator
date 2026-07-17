// Cloudflare Worker 通用行情接口示例。
// 请把此逻辑合并到你当前 Worker；保留原有 /api/quotes 逻辑也可以。
const MAP={
 "000660.KS":"000660.KS","07709.HK":"7709.HK","09868.HK":"9868.HK",
 "QQQ":"QQQ","MU":"MU","SNDK":"SNDK","XPEV":"XPEV"
};
const cors={"Access-Control-Allow-Origin":"*","Content-Type":"application/json;charset=UTF-8"};
const out=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
async function yahoo(symbol,range="1d",interval="1m"){
 const y=MAP[symbol]||symbol;
 const u=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(y)}?range=${range}&interval=${interval}&includePrePost=true&events=div%2Csplits`;
 const r=await fetch(u,{headers:{"User-Agent":"Mozilla/5.0"}});
 if(!r.ok)throw new Error(`上游行情 HTTP ${r.status}`);
 const j=await r.json(),x=j.chart?.result?.[0];if(!x)throw new Error(j.chart?.error?.description||"无行情");
 return x;
}
function quoteFrom(x,symbol){
 const m=x.meta||{},ts=x.timestamp||[],q=x.indicators?.quote?.[0]||{},last=ts.length-1;
 const price=m.regularMarketPrice??q.close?.[last],prev=m.chartPreviousClose??m.previousClose;
 return {symbol,name:m.longName||m.shortName||symbol,price,previousClose:prev,changePercent:prev&&price?(price/prev-1)*100:null,currency:m.currency,marketTime:m.regularMarketTime?new Date(m.regularMarketTime*1000).toISOString():null,source:"Yahoo Finance 非官方接口"};
}
function candlesFrom(x){
 const q=x.indicators?.quote?.[0]||{};
 return (x.timestamp||[]).map((t,i)=>({date:new Date(t*1000).toISOString().slice(0,10),open:q.open?.[i],high:q.high?.[i],low:q.low?.[i],close:q.close?.[i],volume:q.volume?.[i]})).filter(x=>[x.open,x.high,x.low,x.close].every(Number.isFinite));
}
export default{async fetch(req){
 const u=new URL(req.url);if(req.method==="OPTIONS")return new Response(null,{headers:cors});
 try{
  if(u.pathname==="/api/quote"){const s=u.searchParams.get("symbol");return out({ok:true,quote:quoteFrom(await yahoo(s),s),updatedAt:new Date().toISOString()})}
  if(u.pathname==="/api/quotes"){
   const ss=(u.searchParams.get("symbols")||"000660.KS,07709.HK").split(",").slice(0,20);
   const quotes=[];for(const s of ss){try{quotes.push(quoteFrom(await yahoo(s),s))}catch(e){quotes.push({symbol:s,error:e.message})}}
   return out({ok:true,quotes,updatedAt:new Date().toISOString()});
  }
  if(u.pathname==="/api/history"){
   const s=u.searchParams.get("symbol"),range=u.searchParams.get("range")||"1y",interval=u.searchParams.get("interval")||"1d";
   const x=await yahoo(s,range,interval);return out({ok:true,symbol:s,candles:candlesFrom(x),updatedAt:new Date().toISOString(),dataStatus:"延迟/收盘数据",source:"Yahoo Finance 非官方接口"});
  }
  return out({ok:false,error:"接口不存在"},404);
 }catch(e){return out({ok:false,error:e.message},502)}
}};
