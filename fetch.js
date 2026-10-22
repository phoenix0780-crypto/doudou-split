// imgfetch: downloads image URLs or takes scrolling screenshots of pages listed in urls.txt
const fs=require('fs'), path=require('path');
const [,, listFile, outDir]=process.argv;
const lines=fs.readFileSync(listFile,'utf8').split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const index=[];
(async()=>{
  const shots=lines.filter(l=>/^shot\s+/i.test(l));
  let browser=null;
  if(shots.length){ const {chromium}=require('playwright'); browser=await chromium.launch(); }
  let n=0;
  for(const line of lines){
    n++; const tag=String(n).padStart(2,'0');
    try{
      if(/^shot\s+/i.test(line)){
        const url=line.replace(/^shot\s+/i,'');
        const ctx=await browser.newContext({userAgent:UA,viewport:{width:1280,height:2000},locale:'zh-TW'});
        const page=await ctx.newPage();
        await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
        await page.waitForTimeout(3000);
        const H=await page.evaluate(()=>document.body.scrollHeight);
        for(let y=0;y<Math.min(H,40000);y+=1000){ await page.evaluate(v=>window.scrollTo(0,v),y); await page.waitForTimeout(250); }
        await page.evaluate(()=>window.scrollTo(0,0)); await page.waitForTimeout(800);
        const total=Math.min(await page.evaluate(()=>document.body.scrollHeight),24000);
        let k=0; for(let y=0;y<total;y+=2000){ k++; await page.evaluate(v=>window.scrollTo(0,v),y); await page.waitForTimeout(600); await page.screenshot({path:path.join(outDir,`${tag}-${String(k).padStart(2,'0')}.png`)}); }
        const imgs=await page.evaluate(()=>Array.from(document.images).filter(i=>i.naturalWidth>=300).map(i=>i.currentSrc||i.src));
        fs.writeFileSync(path.join(outDir,`${tag}-imgs.txt`),imgs.join('\n')+'\n');
        index.push(`${tag}\tshot\t${url}\t${k} screenshots, ${imgs.length} imgs>=300px`);
        await ctx.close();
      } else {
        const url=line;
        const r=await fetch(url,{headers:{'user-agent':UA,'accept':'image/jpeg,image/png,image/gif,image/*;q=0.8,*/*;q=0.5','referer':new URL(url).origin+'/'}});
        if(!r.ok) throw new Error('HTTP '+r.status);
        const ct=(r.headers.get('content-type')||'').split(';')[0].trim();
        const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/avif':'avif'})[ct]||((url.match(/\.(jpe?g|png|webp|gif)(?=[?#]|$)/i)||[,'bin'])[1].toLowerCase().replace('jpeg','jpg'));
        const buf=Buffer.from(await r.arrayBuffer());
        fs.writeFileSync(path.join(outDir,`${tag}.${ext}`),buf);
        index.push(`${tag}\timg\t${url}\t${buf.length} bytes ${ct}`);
      }
    }catch(e){ index.push(`${tag}\tERROR\t${line}\t${e.message}`); }
  }
  if(browser) await browser.close();
  fs.writeFileSync(path.join(outDir,'index.txt'),index.join('\n')+'\n');
  console.log(index.join('\n'));
})();
