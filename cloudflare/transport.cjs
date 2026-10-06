const {readBody}=require('../business/cloudflare/transport.cjs');
async function dispatch(handler,request,bytes){
 const url=new URL(request.url),headers=Object.fromEntries(request.headers);headers.host=url.host;
 const req={url:url.pathname+url.search,method:request.method,headers,socket:{remoteAddress:headers['cf-connecting-ip']||'unknown'},async *[Symbol.asyncIterator](){if(bytes.length)yield bytes;}};
 const responseHeaders=new Headers();let status=200,content=null;const callbacks=[];
 const res={headersSent:false,statusCode:200,setHeader(k,v){responseHeaders.delete(k);for(const item of Array.isArray(v)?v:[v])responseHeaders.append(k,item);},writeHead(code,values={}){status=code;this.statusCode=code;for(const [k,v]of Object.entries(values))this.setHeader(k,v);this.headersSent=true;},once(event,cb){if(event==='finish')callbacks.push(cb);},end(value){content=value??null;}};
 await handler(req,res);for(const cb of callbacks)cb();
 return new Response(request.method==='HEAD'?null:content,{status,headers:responseHeaders});
}
module.exports={readBody,dispatch};
