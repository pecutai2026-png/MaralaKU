const {test}=require('node:test'),assert=require('node:assert/strict');
const {createApp}=require('../server/server.cjs');const vault=require('../server/password-vault.cjs');
test('tombol mata mengambil password saat diklik, sembunyikan dan timeout',async()=>{
 const vm=require('node:vm'),fs=require('node:fs'),source=fs.readFileSync(require.resolve('../integrated.js'),'utf8');
 const attrs={'aria-label':'Tampilkan password Uji','aria-pressed':'false'},span={textContent:'••••••••'},button={dataset:{passwordEye:'test'},isConnected:true,getAttribute:k=>attrs[k],setAttribute:(k,v)=>attrs[k]=v};let calls=0,timeout;
 const context=vm.createContext({$$:()=>[button],$:()=>span,safe:f=>f,api:async()=>{calls++;return {password:'ExamplePassword'};},setTimeout:fn=>{timeout=fn;return 1;},clearTimeout:()=>{}});
 vm.runInContext(source.slice(source.indexOf('function bindPasswordEyes()')),context);vm.runInContext('bindPasswordEyes()',context);assert.equal(calls,0);
 await button.onclick();assert.equal(span.textContent,'ExamplePassword');assert.equal(attrs['aria-pressed'],'true');await button.onclick();assert.equal(span.textContent,'••••••••');assert.equal(calls,1);
 await button.onclick();timeout();assert.equal(span.textContent,'••••••••');assert.equal(attrs['aria-pressed'],'false');
});
test('password reveal terbatas Super Admin, legacy/reset, enkripsi, audit, batch dan arsip',async()=>{
 const {server,store}=createApp({dbFile:':memory:'});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let cookie='';
 const call=(p,method='GET',body)=>fetch(base+p,{method,headers:{'Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});
 const login=async username=>{cookie=(await call('/api/login','POST',{username,password:'Password12345'})).headers.get('set-cookie').split(';')[0];};
 try{
 await call('/api/setup','POST',{name:'Owner',username:'owner',password:'Password12345'});await login('owner');
 let res=await call('/api/users','POST',{name:'Staff',username:'staff',password:'Password12345',role:'STAFF'});const staff=await res.json();assert(!('password' in staff));
 let list=await (await call('/api/users')).json();assert(list.find(u=>u.id===staff.id).passwordAvailable);assert(!JSON.stringify(list).includes('Password12345'));
 const raw=JSON.stringify(store.db.prepare('SELECT * FROM settings').all());assert(!raw.includes('Password12345'));
 assert.equal((await (await call('/api/users/'+staff.id+'/password','POST',{})).json()).password,'Password12345');
 const audit=store.activityEvents();assert(audit.some(e=>e.action==='password-view'));assert(!JSON.stringify(audit).includes('Password12345'));
 vault.remove(store,staff.id);assert.equal((await call('/api/users/'+staff.id+'/password','POST',{})).status,409);
 await call('/api/users/'+staff.id,'PUT',{...staff,password:'NewPassword5678',active:true});assert.equal((await (await call('/api/users/'+staff.id+'/password','POST',{})).json()).password,'NewPassword5678');
 await call('/api/users/'+staff.id,'PUT',{...staff,name:'Renamed',active:true});assert.equal((await (await call('/api/users/'+staff.id+'/password','POST',{})).json()).password,'NewPassword5678');
 const delegated=await (await call('/api/users','POST',{name:'Delegated',username:'delegated',password:'Password12345',role:'ADMIN',permissions:{users:['view','edit','create']}})).json();await login('delegated');
 assert.equal((await call('/api/users/'+staff.id+'/password','POST',{})).status,403);list=await (await call('/api/users')).json();assert(!('passwordAvailable' in list[0]));assert(!JSON.stringify(await (await call('/api/session')).json()).includes('NewPassword5678'));
 await login('owner');await call('/api/users/'+staff.id,'DELETE');assert(!vault.available(store,staff.id));assert.equal((await call('/api/users/'+staff.id+'/password','POST',{})).status,404);
 cookie='';assert.equal((await call('/api/users/'+delegated.id+'/password','POST',{})).status,401);
 }finally{await new Promise(r=>server.close(r));store.db.close();}
});
