"use strict";(()=>{var e={};e.id=499,e.ids=[499],e.modules={517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},9020:(e,t,n)=>{n.r(t),n.d(t,{headerHooks:()=>m,originalPathname:()=>g,patchFetch:()=>f,requestAsyncStorage:()=>u,routeModule:()=>p,serverHooks:()=>l,staticGenerationAsyncStorage:()=>d,staticGenerationBailout:()=>x});var r={};n.r(r),n.d(r,{POST:()=>h});var i=n(5419),o=n(9108),a=n(9678),c=n(8070);async function s(e){let t=process.env.AI_API_KEY,n=process.env.AI_API_URL||"https://api.openai.com/v1/chat/completions",r=process.env.AI_MODEL||"gpt-4o-mini";if(!t)throw Error("AI_API_KEY chưa được cấu h\xecnh.");let i=await fetch(n,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({model:r,temperature:.1,messages:[{role:"system",content:"Bạn l\xe0 bộ ph\xe2n t\xedch tin nhắn kh\xe1ch h\xe0ng cho shop."},{role:"user",content:e}],response_format:{type:"json_object"}})});if(!i.ok)throw Error(await i.text()||"AI request failed");let o=await i.json();return String(o?.choices?.[0]?.message?.content||"")}async function h(e){try{let t=await e.json(),n=String(t?.customerMessage||"").trim();if(!n)return c.Z.json({intent:"unknown",trackingCode:"",receiverName:"",phone:"",province:"",district:"",dateFrom:"",dateTo:"",confidence:0});let r=`Bạn l\xe0 bộ ph\xe2n t\xedch tin nhắn kh\xe1ch h\xe0ng cho shop.
H\xe3y đọc tin nhắn v\xe0 tr\xedch xuất th\xf4ng tin li\xean quan đến đơn h\xe0ng.
Chỉ trả về JSON hợp lệ, kh\xf4ng giải th\xedch.

TIN NHẮN KH\xc1CH:
${n}

Trả về:
{
  "intent": "",
  "trackingCode": "",
  "receiverName": "",
  "phone": "",
  "province": "",
  "district": "",
  "dateFrom": "",
  "dateTo": "",
  "confidence": 0
}

Kh\xf4ng bịa dữ liệu.
Nếu thiếu th\xf4ng tin th\xec để chuỗi rỗng.`,i=await s(r),o=function(e){let t=e.indexOf("{"),n=e.lastIndexOf("}");return -1===t||-1===n||n<=t?null:e.slice(t,n+1)}(i)||"{}",a=JSON.parse(o);return c.Z.json(a)}catch(e){return c.Z.json({intent:"unknown",trackingCode:"",receiverName:"",phone:"",province:"",district:"",dateFrom:"",dateTo:"",confidence:0,error:e.message},{status:200})}}let p=new i.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/ai/intent/route",pathname:"/api/ai/intent",filename:"route",bundlePath:"app/api/ai/intent/route"},resolvedPagePath:"/home/nho/Documents/Spxmanager/spx-order-tracker/app/api/ai/intent/route.ts",nextConfigOutput:"",userland:r}),{requestAsyncStorage:u,staticGenerationAsyncStorage:d,serverHooks:l,headerHooks:m,staticGenerationBailout:x}=p,g="/api/ai/intent/route";function f(){return(0,a.patchFetch)({serverHooks:l,staticGenerationAsyncStorage:d})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var n=e=>t(t.s=e),r=t.X(0,[638,206],()=>n(9020));module.exports=r})();