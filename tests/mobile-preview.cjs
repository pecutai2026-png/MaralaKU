const fs=require('node:fs'),path=require('node:path');
const {createPlatform}=require('../server.cjs');
const {chromium}=require('C:/Users/LENOVO.MGA23/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const app=createPlatform({dataDir:fs.mkdtempSync(path.join(require('node:os').tmpdir(),'marala-phone-preview-'))});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),base='http://127.0.0.1:'+app.server.address().port,out=path.join(__dirname,'artifacts');
 try{
 await page.goto(base+'/register?type=kafe');await page.locator('#register').waitFor();await page.screenshot({path:path.join(out,'phone-register.png'),fullPage:true});
 const registered=await page.request.post(base+'/platform/register',{data:{business:'Kafe Marala',owner:'Dewo',username:'dewo',phone:'081234567890',password:'Marala-preview-2026',type:'kafe',samples:true}});if(registered.status()!==201)throw Error(await registered.text());
 await page.goto(base+'/workspace');await page.locator('#guide-close').click();await page.locator('.marala-hero-action').waitFor();await page.screenshot({path:path.join(out,'phone-dashboard.png')});
 await page.locator('.marala-hero-action').click();await page.locator('[data-pos-check]').first().waitFor();await page.locator('[data-pos-check]').first().check();await page.screenshot({path:path.join(out,'phone-cashier.png')});
 console.log('Phone screenshots saved at 390 × 844.');
 }finally{await browser.close();await new Promise(r=>app.server.close(r));app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
