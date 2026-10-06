const crypto=require('node:crypto');
const {passwordOK,fail}=require('../business/server/domain.cjs');
const normalizePhone=require('../business/server/contacts.cjs').phone;
const {RegistryDatabase}=require('./registry-db.cjs');
const {LoginAttempts}=require('../business/cloudflare/sqlite.cjs');
function whatsapp(value){const result=normalizePhone(value);if(!result)fail('Nomor WhatsApp tidak valid. Gunakan 08…, 628…, atau +kode negara.');return result;}
const TYPES=['toko','kafe','jasa'];
const hashToken=t=>crypto.createHash('sha256').update(t).digest('hex');
const localDate=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'});
function passwordHash(p){if(typeof p!=='string'||p.length<10||p.length>200)fail('Password harus 10–200 karakter.');const salt=crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(p,salt,64).toString('hex');}
const text=(s,max=100)=>String(s??'').trim().slice(0,max);
const slugify=s=>s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,45)||'usaha';

function createCloudPlatform(storage,remote,authorizeSetup){
 const db=new RegistryDatabase(storage);
 db.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS admins(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS tenants(id TEXT PRIMARY KEY,name TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,type TEXT NOT NULL,email TEXT UNIQUE NOT NULL,owner_id TEXT NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'trial',storage TEXT NOT NULL DEFAULT 'trial',last_active INTEGER,sample INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,role TEXT NOT NULL,tenant_id TEXT REFERENCES tenants(id),user_id TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,tenant_id TEXT REFERENCES tenants(id),user_id TEXT,feature TEXT NOT NULL,action TEXT NOT NULL,at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS event_tenant_date ON events(tenant_id,at);
 CREATE TABLE IF NOT EXISTS admin_audit(id INTEGER PRIMARY KEY,admin_id TEXT,action TEXT,target TEXT,details TEXT,at INTEGER NOT NULL);`);
 if(!db.prepare('PRAGMA table_info(tenants)').all().some(c=>c.name==='phone'))db.exec('ALTER TABLE tenants ADD COLUMN phone TEXT');
 db.exec('CREATE UNIQUE INDEX IF NOT EXISTS tenant_phone_unique ON tenants(phone) WHERE phone IS NOT NULL');

 const attempts=new LoginAttempts(db);
 const secureCookies=true;
 const config=()=>JSON.parse(db.prepare("SELECT value FROM settings WHERE key='trial'").get()?.value||'{"duration":2,"promo":false,"promoDays":5,"promoStart":"","promoEnd":"","contact":"","retentionDays":30}');
 const tenant=id=>db.prepare('SELECT * FROM tenants WHERE id=?').get(id);

 const call=(t,action,data={})=>remote(t.id,action,data);
 function publicTenant(t){return {id:t.id,name:t.name,slug:t.slug,type:t.type==='all'?'toko':t.type,email:t.email.endsWith('@marala.invalid')?'':t.email,phone:t.phone||'',createdAt:t.created_at,expiresAt:t.expires_at,status:t.status,expired:t.status==='trial'&&Date.now()>=t.expires_at,blocked:t.status==='blocked',remainingMs:Math.max(0,t.expires_at-Date.now()),lastActive:t.last_active,sample:!!t.sample};}
 function publicConfig(){const c=config();return {...c,offerDays:c.promo&&localDate()>=c.promoStart&&localDate()<=c.promoEnd?c.promoDays:c.duration};}
 function json(res,data,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
 async function body(req){let chunks=[],size=0;for await(const part of req){size+=part.length;if(size>1000000)fail('Permintaan terlalu besar.',413);chunks.push(part);}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{fail('Format permintaan tidak valid.');}}
 async function session(req){const token=(req.headers.cookie||'').match(/(?:^|;\s*)marala_access=([a-f0-9]{64})/)?.[1];if(!token)return null;const s=db.prepare('SELECT * FROM sessions WHERE token=? AND expires>?').get(hashToken(token),Date.now());if(!s)return null;if(s.role==='admin'){if(!db.prepare('SELECT id FROM admins WHERE id=?').get(s.user_id))return null;}else{const t=tenant(s.tenant_id);if(!t)return null;const user=await call(t,'user',{id:s.user_id});if(!user?.active)return null;}return {...s,rawToken:token};}
 function cookies(res,token,businessToken=token){const secure=secureCookies?'; Secure':'';res.setHeader('Set-Cookie',[`marala_access=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure}`,`marala_session=${businessToken}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure}`]);}
 async function login(res,role,userId,t){const token=crypto.randomBytes(32).toString('hex'),expiry=Date.now()+43200000;db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(hashToken(token),role,t?.id||null,userId,expiry);if(t)await call(t,'addSession',{token:hashToken(token),userId,expiry});cookies(res,token,role==='admin'?'':token);return token;}
 function gate(s,role){if(!s||s.role!==role)fail('Silakan masuk dengan akun '+(role==='admin'?'Admin BUMM':'usaha')+'.',401);}
 function owner(s,t){if(s.user_id!==t.owner_id)fail('Hanya pemilik usaha dapat melakukan tindakan ini.',403);}
 function log(s,feature,action){db.prepare('INSERT INTO events(tenant_id,user_id,feature,action,at) VALUES(?,?,?,?,?)').run(s.tenant_id,s.user_id,feature,action,Date.now());db.prepare('UPDATE tenants SET last_active=? WHERE id=?').run(Date.now(),s.tenant_id);}
 function audit(s,action,target,details={}){db.prepare('INSERT INTO admin_audit(admin_id,action,target,details,at) VALUES(?,?,?,?,?)').run(s?.user_id||'setup',action,target,JSON.stringify(details),Date.now());}
 function attempt(req,key){const ip=req.socket.remoteAddress,entry=attempts.get(ip+':'+key);if(entry?.until>Date.now())fail('Terlalu banyak percobaan. Coba lagi dalam 15 menit.',429);return ip+':'+key;}
 function failed(key){const item=attempts.get(key)||{count:0,until:0};item.count++;if(item.count>=8)item.until=Date.now()+900000;attempts.set(key,item);}
 async function clearSession(req,res,s){if(s){db.prepare('DELETE FROM sessions WHERE token=?').run(s.token);if(s.tenant_id)await call(tenant(s.tenant_id),'deleteSession',{token:s.token});}cookies(res,'','');}
 const allowedFeatures=new Set(['dashboard','attendance','attendanceadmin','posdashboard','poscashier','posqueue','poshistory','posdebt','posproducts','posapproval','posmonthly','units','products','customers','contacts','referrals','invoices','payments','sales','stockitems','warehouse','teko','allstock','movements','transfers','opnames','shopping','expenses','procurements','requests','petty','profit','revenue','opnamereport','reportapproval','identity','banks','invoiceSettings','appearance','users','application','activity']);
 async function platform(req,res,url){const p=url.pathname,method=req.method,s=await session(req);
  if(p==='/platform/public'&&method==='GET')return json(res,{config:publicConfig(),requiresSetupToken:true,setup:db.prepare('SELECT count(*) n FROM admins').get().n===0});
  if(p==='/platform/session'&&method==='GET'){if(!s)return json(res,{user:null});if(s.role==='admin')return json(res,{user:{role:'admin',...db.prepare('SELECT id,name,email FROM admins WHERE id=?').get(s.user_id)}});const t=tenant(s.tenant_id);return json(res,{user:{...(await call(t,'user',{id:s.user_id})),businessRole:(await call(t,'user',{id:s.user_id})).role,role:'tenant'},tenant:publicTenant(t),config:publicConfig()});}
  if(p==='/platform/admin/setup'&&method==='POST'){
   
   if(db.prepare('SELECT count(*) n FROM admins').get().n)fail('Admin BUMM sudah tersedia.',409);
   const d=await body(req);authorizeSetup(d.setupToken);const name=text(d.name),email=text(d.email,254).toLowerCase();if(!name||!/^\S+@\S+\.\S+$/.test(email))fail('Nama dan email valid wajib diisi.');const encoded=passwordHash(d.password),id=crypto.randomUUID();db.prepare('INSERT INTO admins VALUES(?,?,?,?)').run(id,name,email,encoded);await login(res,'admin',id);audit({user_id:id},'setup','platform');return json(res,{ok:true},201);
  }
  if(p==='/platform/register'&&method==='POST'){
   const key=attempt(req,'register'),d=await body(req);if(!TYPES.includes(d.type))fail('Pilih jenis usaha.');const name=text(d.business),ownerName=text(d.owner),phone=whatsapp(d.phone),username=text(d.username,80).toLowerCase();if(!name||!ownerName||!/^[a-z0-9._-]{3,80}$/.test(username))fail('Lengkapi nama usaha, pemilik, nomor WhatsApp, dan username minimal 3 karakter.');passwordHash(d.password);if(db.prepare('SELECT id FROM tenants WHERE phone=?').get(phone))fail('Nomor WhatsApp sudah terdaftar. Silakan masuk.',409);
   const id=crypto.randomUUID(),email=id+'@marala.invalid',created=Date.now(),c=publicConfig();let slug=slugify(name);if(db.prepare('SELECT id FROM tenants WHERE slug=?').get(slug))slug+='-'+crypto.randomBytes(3).toString('hex');
   const t={id,name,slug,type:d.type,email,phone,storage:'trial'};let u;try{u=await call(t,'create',{tenant:t,ownerName,username,password:d.password,samples:d.samples!==false});db.prepare('INSERT INTO tenants(id,name,slug,type,email,owner_id,created_at,expires_at,sample,last_active,phone) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,name,slug,d.type,email,u.id,created,created+c.offerDays*86400000,Number(d.samples!==false),created,phone);await login(res,'tenant',u.id,tenant(id));log({tenant_id:id,user_id:u.id},'registration','register');failed(key);return json(res,{ok:true,tenant:publicTenant(tenant(id)),redirect:'/workspace'},201);}catch(e){if(!tenant(id))await call(t,'reset');throw e;}
  }
  if(p==='/platform/login'&&method==='POST'){
   const d=await body(req),key=attempt(req,'login');let user,t;const email=text(d.email,254).toLowerCase();
   if(d.role==='admin'){user=db.prepare('SELECT * FROM admins WHERE email=?').get(email);}
   else{t=d.slug?db.prepare('SELECT * FROM tenants WHERE slug=?').get(text(d.slug).toLowerCase()):d.phone?db.prepare('SELECT * FROM tenants WHERE phone=?').get(whatsapp(d.phone)):db.prepare('SELECT * FROM tenants WHERE email=?').get(email);if(t)user=d.username?await call(t,'credential',{username:text(d.username).toLowerCase()}):await call(t,'credential',{id:t.owner_id});}
   if(!user||!passwordOK(d.password,user.password)){failed(key);fail('Akun atau password tidak sesuai.',401);}if(t?.status==='blocked')fail('Akses usaha dinonaktifkan. Hubungi BUMM.',403);attempts.delete(key);await login(res,d.role==='admin'?'admin':'tenant',user.id,t);if(t)log({tenant_id:t.id,user_id:user.id},'login','login');return json(res,{ok:true,redirect:d.role==='admin'?'/admin':'/workspace'});
  }
  if(p==='/platform/logout'&&method==='POST'){await clearSession(req,res,s);return json(res,{ok:true});}
  if(p==='/platform/event'&&method==='POST'){gate(s,'tenant');const d=await body(req);if(!allowedFeatures.has(d.feature)||d.action!=='view')fail('Aktivitas tidak valid.');log(s,d.feature,'view');return json(res,{ok:true});}
  if(p==='/platform/profile'&&method==='PUT'){gate(s,'tenant');const t=tenant(s.tenant_id);owner(s,t);const d=await body(req);if(!TYPES.includes(d.type))fail('Jenis usaha tidak valid.');const phone=d.phone===undefined?t.phone:whatsapp(d.phone);if(phone&&db.prepare('SELECT id FROM tenants WHERE phone=? AND id<>?').get(phone,t.id))fail('Nomor WhatsApp sudah digunakan usaha lain.',409);db.prepare('UPDATE tenants SET type=?,phone=? WHERE id=?').run(d.type,phone,t.id);return json(res,{ok:true});}
  if(p.startsWith('/platform/admin/')){gate(s,'admin');
   if(p==='/platform/admin/overview'&&method==='GET'){
    const rows=db.prepare('SELECT * FROM tenants ORDER BY created_at DESC').all();const items=await Promise.all(rows.map(async t=>({...publicTenant(t),owner:(await call(t,'user',{id:t.owner_id}))?.name||'',sessions:db.prepare("SELECT count(*) n FROM events WHERE tenant_id=? AND action='login'").get(t.id).n+1,features:db.prepare('SELECT feature,action,count(*) count FROM events WHERE tenant_id=? GROUP BY feature,action ORDER BY count DESC').all(t.id)})));
    const featureRows=db.prepare("SELECT feature,action,count(*) count,count(DISTINCT tenant_id) businesses FROM events WHERE action IN ('view','write') GROUP BY feature,action ORDER BY count DESC").all();
    const counts={registered:items.length,visited:db.prepare("SELECT count(DISTINCT tenant_id) n FROM events WHERE action='view'").get().n,transacted:db.prepare("SELECT count(DISTINCT tenant_id) n FROM events WHERE action='write' AND feature IN ('postickets','pospayments','invoices','payments','sales')").get().n,reports:db.prepare("SELECT count(DISTINCT tenant_id) n FROM events WHERE feature IN ('profit','revenue','posmonthly','reportapproval') AND action='view'").get().n,paid:items.filter(t=>t.status==='paid').length};
    return json(res,{tenants:items,features:featureRows,funnel:counts,config:publicConfig(),audit:db.prepare('SELECT action,target,details,at FROM admin_audit ORDER BY id DESC LIMIT 30').all()});
   }
   if(p==='/platform/admin/settings'&&method==='PUT'){const d=await body(req),days=Number(d.duration),promoDays=Number(d.promoDays);if(!Number.isInteger(days)||days<1||days>365||!Number.isInteger(promoDays)||promoDays<1||promoDays>365)fail('Durasi harus 1–365 hari.');if(d.promo&&(!/^\d{4}-\d{2}-\d{2}$/.test(d.promoStart||'')||!/^\d{4}-\d{2}-\d{2}$/.test(d.promoEnd||'')||d.promoStart>d.promoEnd))fail('Periode promo tidak valid.');const contact=String(d.contact||'').replace(/[^0-9]/g,'');if(contact&&!/^\d{8,16}$/.test(contact))fail('Nomor WhatsApp harus 8–16 digit, dengan kode negara.');const c={duration:days,promo:!!d.promo,promoDays,promoStart:text(d.promoStart,10),promoEnd:text(d.promoEnd,10),contact,retentionDays:30};return db.transactionSync(()=>{db.prepare("INSERT INTO settings VALUES('trial',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(c));let affected=0;if(d.applyExisting){const update=db.prepare("UPDATE tenants SET expires_at=max(expires_at,?) WHERE status='trial'").run(Date.now()+days*86400000);affected=update.changes;}audit(s,'trial-settings','platform',{...c,affected});return json(res,{ok:true,affected,config:publicConfig()});});}
   const match=p.match(/^\/platform\/admin\/tenants\/([a-f0-9-]{36})\/(extend|expire|activate|block|unblock|export)$/);
   if(match){const t=tenant(match[1]);if(!t)fail('Usaha tidak ditemukan.',404);const action=match[2];
    if(action==='export'&&method==='GET'){const snapshot=await call(t,'export');audit(s,'export-private-backup',t.id);res.writeHead(200,{'Content-Type':'application/json','Content-Disposition':`attachment; filename="marala-${t.slug}-private.json"`,'Cache-Control':'no-store'});return res.end(JSON.stringify(snapshot));}
    if(method!=='POST')fail('Gunakan POST.',405);const d=await body(req);
    if(action==='extend'){if(t.status!=='trial')fail('Perpanjangan hanya untuk usaha trial.');const days=Number(d.days);if(!Number.isInteger(days)||days<1||days>365)fail('Tambahan harus 1–365 hari.');db.prepare('UPDATE tenants SET expires_at=? WHERE id=?').run(Math.max(Date.now(),t.expires_at)+days*86400000,t.id);}
    if(action==='expire'){if(t.status!=='trial')fail('Hanya trial yang dapat diakhiri.');db.prepare('UPDATE tenants SET expires_at=? WHERE id=?').run(Date.now()-1000,t.id);}
    if(action==='block')db.prepare("UPDATE tenants SET status='blocked' WHERE id=?").run(t.id);
    if(action==='unblock')db.prepare('UPDATE tenants SET status=? WHERE id=?').run(t.storage==='paid'?'paid':'trial',t.id);
    if(action==='activate'){
     if(t.status==='paid')return json(res,{ok:true,tenant:publicTenant(t)});if(t.status==='blocked')fail('Buka blokir terlebih dahulu.');
     db.prepare("UPDATE tenants SET status='paid',storage='paid' WHERE id=?").run(t.id);
    }
    audit(s,action,t.id,{days:d.days||null});return json(res,{ok:true,tenant:publicTenant(tenant(t.id))});
   }
  }
  fail('Halaman API tidak ditemukan.',404);
 }

 return {platform,session,tenant,gate,clearSession,log,json};
}
module.exports={createCloudPlatform};
