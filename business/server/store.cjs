const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs');
const path=require('node:path');
const domain=require('./domain.cjs');
class Store extends domain.Store {
 constructor(file){
  if(file!==':memory:')fs.mkdirSync(path.dirname(file),{recursive:true});
  const db=new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
  super(db);
 }
}
module.exports={...domain,Store};
