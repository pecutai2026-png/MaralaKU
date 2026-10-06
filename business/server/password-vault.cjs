const crypto=require('node:crypto');
const {fail,passwordOK}=require('./domain.cjs');
const keyName='private-password-vault-key';
const slot=id=>'private-password:'+id;
function save(store,id,password){
 let key=store.setting(keyName);if(!key){key=crypto.randomBytes(32).toString('hex');store.setSetting(keyName,key);}
 const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv);cipher.setAAD(Buffer.from(id));
 const encrypted=Buffer.concat([cipher.update(password,'utf8'),cipher.final()]);
 store.setSetting(slot(id),{iv:iv.toString('hex'),tag:cipher.getAuthTag().toString('hex'),data:encrypted.toString('base64')});
}
function available(store,id){return !!store.setting(slot(id));}
function remove(store,id){store.db.prepare('DELETE FROM settings WHERE key=?').run(slot(id));}
function reveal(store,id,actor){
 const user=store.user(actor);if(!user?.active||user.role!=='SUPER ADMIN')fail('Hanya Super Admin dapat melihat password.',403);
 if(!store.user(id))fail('Pengguna tidak ditemukan.',404);
 const encrypted=store.setting(slot(id)),key=store.setting(keyName);if(!encrypted||!key)fail('Password lama belum dapat ditampilkan. Reset password terlebih dahulu.',409);
 let password;try{const cipher=crypto.createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),Buffer.from(encrypted.iv,'hex'));cipher.setAAD(Buffer.from(id));cipher.setAuthTag(Buffer.from(encrypted.tag,'hex'));password=Buffer.concat([cipher.update(Buffer.from(encrypted.data,'base64')),cipher.final()]).toString('utf8');}catch{fail('Password tidak dapat dibuka. Reset password terlebih dahulu.',409);}
 if(!passwordOK(password,store.db.prepare('SELECT password FROM users WHERE id=?').get(id).password))fail('Password telah berubah. Reset password untuk memperbarui salinannya.',409);
 store.audit(actor,'password-view',id);return {password};
}
module.exports={save,available,remove,reveal};
