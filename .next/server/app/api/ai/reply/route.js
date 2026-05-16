"use strict";(()=>{var e={};e.id=991,e.ids=[991],e.modules={517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},9954:(e,n,t)=>{t.r(n),t.d(n,{headerHooks:()=>m,originalPathname:()=>d,patchFetch:()=>f,requestAsyncStorage:()=>u,routeModule:()=>s,serverHooks:()=>p,staticGenerationAsyncStorage:()=>g,staticGenerationBailout:()=>l});var a={};t.r(a),t.d(a,{POST:()=>x});var r=t(5419),h=t(9108),i=t(9678),o=t(8070);async function c(e){let n=process.env.AI_API_KEY,t=process.env.AI_API_URL||"https://api.openai.com/v1/chat/completions",a=process.env.AI_MODEL||"gpt-4o-mini";if(!n)throw Error("AI_API_KEY chưa được cấu h\xecnh.");let r=await fetch(t,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({model:a,temperature:.2,messages:[{role:"system",content:"Bạn l\xe0 nh\xe2n vi\xean chăm s\xf3c kh\xe1ch h\xe0ng của shop."},{role:"user",content:e}]})});if(!r.ok)throw Error(await r.text()||"AI request failed");let h=await r.json();return String(h?.choices?.[0]?.message?.content||"")}async function x(e){try{let n=await e.json(),t=String(n?.customerMessage||"").trim(),a=Array.isArray(n?.matchedOrders)?n.matchedOrders:[],r=`Bạn l\xe0 nh\xe2n vi\xean chăm s\xf3c kh\xe1ch h\xe0ng của shop.
Bạn chỉ được trả lời dựa tr\xean dữ liệu đơn h\xe0ng được cung cấp.
Kh\xf4ng bịa m\xe3 vận đơn, trạng th\xe1i, COD, ng\xe0y giao.
Kh\xf4ng n\xf3i "t\xf4i l\xe0 AI".
Kh\xf4ng n\xf3i "theo dữ liệu hệ thống".
Giọng văn th\xe2n thiện, ngắn gọn.

TIN NHẮN KH\xc1CH:
${t}

DỮ LIỆU ĐƠN T\xccM ĐƯỢC:
${JSON.stringify(a,null,2)}

Nếu c\xf3 1 đơn:
Trả lời theo mẫu:
Dạ shop kiểm tra thấy đơn của m\xecnh m\xe3 {{trackingCode}} hiện đang ở trạng th\xe1i: {{status}}.

Người nhận: {{receiverName}}
Khu vực: {{province}}
COD: {{cod}}

Nếu đang giao h\xe0ng th\xec nhắc kh\xe1ch ch\xfa \xfd điện thoại.
Nếu đang vận chuyển th\xec b\xe1o đơn đang tr\xean đường vận chuyển.
Nếu đ\xe3 giao th\xec b\xe1o đơn đ\xe3 giao th\xe0nh c\xf4ng.
Nếu đ\xe3 hủy th\xec b\xe1o đơn đ\xe3 hủy.
Nếu đang trả h\xe0ng hoặc đ\xe3 trả h\xe0ng th\xec b\xe1o đơn đang/đ\xe3 ho\xe0n về shop.

Nếu c\xf3 nhiều đơn:
Liệt k\xea tối đa 5 đơn:
1. {{trackingCode}} - {{receiverName}} - {{province}} - {{status}}

Sau đ\xf3 hỏi kh\xe1ch gửi th\xeam số điện thoại hoặc tỉnh/th\xe0nh để kiểm tra đ\xfang đơn.

Nếu kh\xf4ng c\xf3 đơn:
Dạ shop chưa t\xecm thấy đơn theo th\xf4ng tin n\xe0y.
M\xecnh gửi th\xeam gi\xfap shop m\xe3 vận đơn, t\xean người nhận hoặc số điện thoại đặt h\xe0ng nha.`,h=await c(r);return o.Z.json({reply:h})}catch(e){return o.Z.json({reply:"",error:e.message},{status:200})}}let s=new r.AppRouteRouteModule({definition:{kind:h.x.APP_ROUTE,page:"/api/ai/reply/route",pathname:"/api/ai/reply",filename:"route",bundlePath:"app/api/ai/reply/route"},resolvedPagePath:"/home/nho/Documents/Spxmanager/spx-order-tracker/app/api/ai/reply/route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:u,staticGenerationAsyncStorage:g,serverHooks:p,headerHooks:m,staticGenerationBailout:l}=s,d="/api/ai/reply/route";function f(){return(0,i.patchFetch)({serverHooks:p,staticGenerationAsyncStorage:g})}}};var n=require("../../../../webpack-runtime.js");n.C(e);var t=e=>n(n.s=e),a=n.X(0,[638,206],()=>t(9954));module.exports=a})();