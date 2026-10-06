import {DurableObject} from 'cloudflare:workers';
import crypto from 'node:crypto';
import domain from '../business/server/domain.cjs';
import api from '../business/server/api.cjs';
import sqlite from '../business/cloudflare/sqlite.cjs';
import snapshot from '../business/server/snapshot.cjs';
import seedModule from '../seed.cjs';
import platformModule from './platform.cjs';
import transport from './transport.cjs';

const securityHeaders={
 'X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'same-origin',
 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'self' blob:; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"
};
function authorize(env,token){
 if(!env.SETUP_TOKEN||env.SETUP_TOKEN.length<32)domain.fail('Pengaturan admin terkunci. Tambahkan secret SETUP_TOKEN di Cloudflare terlebih dahulu.',403);
 const digest=v=>crypto.createHash('sha256').update(String(v||'')).digest();
 if(!crypto.timingSafeEqual(digest(token),digest(env.SETUP_TOKEN)))domain.fail('Kode pengaturan admin tidak sesuai.',403);
}
function jsonError(error){if(!error.status)console.error('MaralaKu request failed:',error.stack);return Response.json({error:error.status?error.message:'Pemrosesan gagal. Silakan coba kembali.'},{status:error.status||500,headers:{'Cache-Control':'no-store'}});}
function validate(request){const url=new URL(request.url);if(!['GET','HEAD'].includes(request.method)){
 if(request.headers.get('sec-fetch-site')==='cross-site'||(request.headers.get('origin')&&request.headers.get('origin')!==url.origin))domain.fail('Permintaan lintas situs ditolak.',403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))domain.fail('Gunakan JSON.',415);
}}

// Each tenant UUID maps to an independent SQLite-backed Durable Object.
export class MaralaTenant extends DurableObject {
 init(){if(this.store)return;this.db=new sqlite.CloudDatabase(this.ctx.storage);this.store=new domain.Store(this.db);this.store.setSetting('posImmediatePayments',{enabled:true});this.handler=api.createHandler({store:this.store,secureCookies:true,authorizeSetup(){domain.fail('Gunakan pendaftaran MaralaKu.',403);},legacySeed(){return {};}});}
 async fetch(request){const bytes=await transport.readBody(request,1_000_000);return this.ctx.blockConcurrencyWhile(async()=>{try{
  this.init();this.db.beginRequest();const url=new URL(request.url);
  if(url.pathname==='/internal'){
   const {action,data}=JSON.parse(bytes.toString());let result;
   if(action==='create')result=this.store.tx(()=>{if(this.db.prepare('SELECT count(*) n FROM users').get().n)domain.fail('Usaha sudah tersedia.',409);const user=this.store.saveUser({name:data.ownerName,username:data.username,password:data.password,role:'SUPER ADMIN'},undefined,'setup');seedModule.seed(this.store,data.tenant,user,data.samples);return user;});
   else if(action==='user')result=this.store.user(data.id)||null;
   else if(action==='credential')result=data.username?this.db.prepare('SELECT * FROM users WHERE username=? AND active=1 AND deleted=0').get(data.username):this.db.prepare('SELECT * FROM users WHERE id=? AND active=1 AND deleted=0').get(data.id);
   else if(action==='addSession'){this.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(data.token,data.userId,data.expiry);result={ok:true};}
   else if(action==='deleteSession'){this.db.prepare('DELETE FROM sessions WHERE token=?').run(data.token);result={ok:true};}
   else if(action==='export')result=snapshot.exportSnapshot(this.db);
   else if(action==='reset'){await this.ctx.storage.deleteAll();this.store=null;result={ok:true};}
   else domain.fail('Tindakan internal tidak tersedia.',404);
   return Response.json(result??null);
  }
  return await transport.dispatch(this.handler,request,bytes);
 }catch(e){return jsonError(e);}finally{this.db?.endRequest();}});}
}

export class MaralaPlatform extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.platform=platformModule.createCloudPlatform(ctx.storage,async(id,action,data)=>{
  const response=await env.TENANTS.get(env.TENANTS.idFromName(id)).fetch('https://tenant.internal/internal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,data})});const result=await response.json();if(!response.ok)domain.fail(result.error,response.status);return result;
 },token=>authorize(env,token));}
 async fetch(request){return this.ctx.blockConcurrencyWhile(async()=>{try{
  validate(request);const bytes=await transport.readBody(request,1_000_000);const p=new URL(request.url).pathname,platform=this.platform;
  return await transport.dispatch(async(req,res)=>{
   const url=new URL(request.url);
   if(p.startsWith('/platform/'))return platform.platform(req,res,url);
   const s=await platform.session(req);
   if(p.startsWith('/api/')||p==='/manifest.webmanifest'){
    platform.gate(s,'tenant');const t=platform.tenant(s.tenant_id);if(t.status==='blocked')domain.fail('Usaha dinonaktifkan. Hubungi BUMM.',403);
    if(p==='/api/logout'){await platform.clearSession(req,res,s);return platform.json(res,{ok:true});}
    if(p==='/api/login'||p==='/api/setup')domain.fail('Gunakan halaman akun MaralaKu.',403);
    if(t.status==='trial'&&Date.now()>=t.expires_at&&!['GET','HEAD'].includes(req.method))return platform.json(res,{error:'Masa coba selesai. Data tetap bisa dilihat dan diekspor. Hubungi BUMM untuk aktivasi.',code:'TRIAL_EXPIRED'},423);
    if(p==='/api/application-brand')return platform.json(res,{name:t.name+' · MaralaKu',icon:'/assets/logo.png'});
    const headers=new Headers(request.headers);headers.set('cookie','marala_session='+s.rawToken);
    const response=await this.env.TENANTS.get(this.env.TENANTS.idFromName(t.id)).fetch(request.url,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:bytes});
    if(response.ok&&!['GET','HEAD'].includes(request.method)){const feature=p.startsWith('/api/records/')?p.split('/')[3]:p.startsWith('/api/pos/tickets')?'postickets':/^\/api\/pos\/orders\/[^/]+\/pay$/.test(p)?'pospayments':p.startsWith('/api/pos/')?'pos'+p.split('/')[3]:p.split('/')[2]||'system';platform.log(s,feature,'write');}
    res.writeHead(response.status,Object.fromEntries(response.headers));return res.end(Buffer.from(await response.arrayBuffer()));
   }
   if(!['GET','HEAD'].includes(req.method))domain.fail('Metode tidak diizinkan.',405);
   let asset=p;
   if(p==='/workspace'||(p==='/'&&url.searchParams.has('workspace'))){if(s?.role!=='tenant'){res.writeHead(302,{Location:'/login'});return res.end();}if(platform.tenant(s.tenant_id).status==='blocked'){res.writeHead(302,{Location:'/account'});return res.end();}asset='/workspace.html';}
   else if(['/','/login','/register','/account','/paket-usaha'].includes(p))asset='/index.html';else if(p==='/admin')asset='/admin.html';
   else if(!/^\/(?:assets\/[a-zA-Z0-9_.-]+|platform\.(?:js|css)|workspace(?:-menu)?\.(?:js|css)|contact\.(?:js|css)|packages\.(?:js|css)|integrated\.(?:js|css)|pos-ui\.js|bulk-edit\.js|attendance-ui\.js|styles\.css|icon\.svg|sw\.js)$/.test(p))domain.fail('Halaman tidak ditemukan.',404);
   const assetURL=new URL(request.url);assetURL.pathname=asset;assetURL.search='';const response=await this.env.ASSETS.fetch(new Request(assetURL,{method:request.method}));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  },request,bytes);
 }catch(e){return jsonError(e);}});}
}

export default {async fetch(request,env){
 try{const response=await env.PLATFORM.get(env.PLATFORM.idFromName('maralaku-registry-v1')).fetch(request);const headers=new Headers(response.headers);for(const [key,value]of Object.entries(securityHeaders))headers.set(key,value);headers.set('Cache-Control',/^\/(platform|api)\//.test(new URL(request.url).pathname)?'no-store':'no-cache');return new Response(response.body,{status:response.status,headers});}catch(e){return jsonError(e);}
}};
