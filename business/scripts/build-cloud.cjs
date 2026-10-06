const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const dir = path.join(root,'dist','public');
// Explicit allowlist: database, private backups and server code are never assets.
const files = ['index.html','styles.css','integrated.css','integrated.js','pos-ui.js','bulk-edit.js','attendance-ui.js','sw.js','icon.svg','manifest.webmanifest'];
fs.mkdirSync(dir,{recursive:true});
for (const name of fs.readdirSync(dir)) if (!files.includes(name)) {
  throw new Error('Berkas di luar daftar publik ditemukan di dist/public: '+name+'. Bersihkan sebelum build.');
}
for (const name of files) fs.copyFileSync(path.join(root,name),path.join(dir,name));
console.log('Aset publik siap: '+files.length+' berkas. Database tidak disertakan.');
