const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const target=path.join(root,'.publish','BUMM-Marala-'+new Date().toISOString().replace(/[:.]/g,'-'));
const files=['PANDUAN-STOK-RIWAYAT.md','.gitignore','README.md','DEPLOY-CLOUDFLARE.md','HASIL-CLOUDFLARE.md','HASIL-PENGEMBANGAN.md','HASIL-PENGADAAN-REFERRAL.md','HASIL-LABA-RUGI.md','PANDUAN-DATABASE-KONTAK.md','PANDUAN-APPROVAL-LAPORAN.md','PANDUAN-TAB-DAN-KOREKSI.md','PANDUAN-ANTRIAN-HUTANG.md','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','wrangler.jsonc','Jalankan-BUMM.ps1','index.html','styles.css','integrated.css','integrated.js','pos-ui.js','bulk-edit.js','attendance-ui.js','sw.js','icon.svg','manifest.webmanifest','app.js'];
for(const folder of ['server','cloudflare','scripts','legacy'])for(const entry of fs.readdirSync(path.join(root,folder),{withFileTypes:true})){
 if(entry.isFile()&&/\.(cjs|mjs|js|html)$/.test(entry.name))files.push(folder+'/'+entry.name);
}
for(const name of fs.readdirSync(path.join(root,'tests')))if(/\.(test\.cjs|cjs)$/.test(name))files.push('tests/'+name);
for(const name of fs.readdirSync(root))if(name.endsWith('.css')&&!files.includes(name))files.push(name);
for(const relative of files){const dest=path.join(target,relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,relative),dest);}
const manifest=files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(target,file))).digest('hex')}));
fs.writeFileSync(path.join(target,'PACKAGE-CONTENTS.json'),JSON.stringify(manifest,null,2));
console.log('Folder kode untuk GitHub:',target);
console.log(files.length+' berkas kode; tanpa database, cadangan privat, token, node_modules, atau hasil pengujian.');

