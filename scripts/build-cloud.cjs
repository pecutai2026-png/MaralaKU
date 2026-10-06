const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist','public');
fs.mkdirSync(out,{recursive:true});
const publicFiles=['index.html','admin.html','platform.js','platform.css','workspace.js','workspace.css','workspace-menu.js','contact.js','contact.css','packages.js','packages.css'];
const businessFiles=['integrated.js','pos-ui.js','bulk-edit.js','attendance-ui.js','styles.css','integrated.css','icon.svg'];
const expected=new Set([...publicFiles,...businessFiles,'workspace.html','sw.js','assets']);
for(const name of fs.readdirSync(out))if(!expected.has(name))throw Error('Unexpected public asset: '+name);
for(const name of publicFiles)fs.copyFileSync(path.join(root,'public',name),path.join(out,name));
for(const name of ['index.html','admin.html']){const file=path.join(out,name);fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('Versi lokal · data disimpan di komputer ini.','Data usaha tersimpan aman di layanan MaralaKu.'));}
for(const name of businessFiles)fs.copyFileSync(path.join(root,'business',name),path.join(out,name));
fs.copyFileSync(path.join(root,'business','index.html'),path.join(out,'workspace.html'));
fs.cpSync(path.join(root,'public','assets'),path.join(out,'assets'),{recursive:true});
fs.writeFileSync(path.join(out,'sw.js'),"self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.registration.unregister()));");
console.log('Aset publik MaralaKu siap; database, kode server, dan backup tidak disertakan.');
