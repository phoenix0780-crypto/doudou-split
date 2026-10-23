// render.js: open the scene in headless Chromium (SwiftShader WebGL), click viewpoint chips, screenshot each
const {chromium}=require('playwright'); const path=require('path'); const fs=require('fs');
const [,, url, outDir]=process.argv; fs.mkdirSync(outDir,{recursive:true});
const chips=[['全景','01-overview'],['車尾','05-cartail']];
(async()=>{
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const ctx=await browser.newContext({viewport:{width:1280,height:800}}); const page=await ctx.newPage();
  const log=[]; page.on('console',m=>log.push(m.type()+': '+m.text())); page.on('pageerror',e=>log.push('pageerror: '+e.message));
  await page.goto(url,{waitUntil:'load',timeout:60000}); await page.waitForTimeout(8000);
  for(const [c,name] of chips){ try{ await page.click(`#views .chip[data-v="${c}"]`); await page.waitForTimeout(9000); await page.screenshot({path:path.join(outDir,name+'.png')}); }catch(e){ log.push('chip '+c+': '+e.message); } }
  try{ await page.click('#bNight'); await page.waitForTimeout(3500); await page.screenshot({path:path.join(outDir,'06-night.png')}); await page.click('#views .chip[data-v="全景"]'); await page.waitForTimeout(9000); await page.screenshot({path:path.join(outDir,'07-night-overview.png')}); }catch(e){ log.push('night: '+e.message); }
  try{ await page.click('#bList'); await page.waitForTimeout(800); const btns=await page.$$('#list .nm'); for(const b of btns){ const t=await b.innerText(); if(/Model Y/.test(t)){ await b.click(); break; } } await page.waitForTimeout(9000); await page.screenshot({path:path.join(outDir,'08-car.png')}); await page.mouse.move(640,400); await page.mouse.down(); await page.mouse.move(900,430,{steps:10}); await page.mouse.up(); await page.waitForTimeout(6000); await page.screenshot({path:path.join(outDir,'09-car-b.png')}); await page.mouse.move(640,400); await page.mouse.down(); await page.mouse.move(900,380,{steps:10}); await page.mouse.up(); await page.waitForTimeout(6000); await page.screenshot({path:path.join(outDir,'10-car-c.png')}); }catch(e){ log.push('car: '+e.message); }
  fs.writeFileSync(path.join(outDir,'console.txt'),log.join('\n')+'\n');
  await browser.close();
})().catch(e=>{ fs.writeFileSync(path.join(outDir,'console.txt'),'render error: '+e.message+'\n'); });
