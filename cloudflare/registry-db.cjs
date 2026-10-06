// The registry has its own Durable Object SQLite database.
class RegistryDatabase {
 constructor(storage){this.storage=storage;this.sql=storage.sql;}
 exec(sql){return this.sql.exec(sql);}
 prepare(sql){return {get:(...args)=>this.sql.exec(sql,...args).toArray()[0],all:(...args)=>this.sql.exec(sql,...args).toArray(),run:(...args)=>{this.sql.exec(sql,...args).toArray();return {changes:this.sql.exec('SELECT changes() AS n').toArray()[0].n};}};}
 transactionSync(fn){return this.storage.transactionSync(fn);}
}
module.exports={RegistryDatabase};
