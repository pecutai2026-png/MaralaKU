// Pembuat QR code mandiri (mode byte, koreksi galat M, versi 1–10) untuk link etalase dan e-tiket.
(function(root){'use strict';
// [jumlah codeword EC per blok, [[jumlah blok, codeword data per blok], ...]] untuk level M.
const BLOCKS=[null,[10,[[1,16]]],[16,[[1,28]]],[26,[[1,44]]],[18,[[2,32]]],[24,[[2,43]]],[16,[[4,27]]],[18,[[4,31]]],[22,[[2,38],[2,39]]],[22,[[3,36],[2,37]]],[26,[[4,43],[1,44]]]];
const ALIGN=[null,[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50]];
const REMAINDER=[0,0,7,7,7,7,7,0,0,0,0];
const EXP=new Array(512),LOG=new Array(256);
(()=>{let x=1;for(let i=0;i<255;i++){EXP[i]=x;LOG[x]=i;x<<=1;if(x&256)x^=0x11d;}for(let i=255;i<512;i++)EXP[i]=EXP[i-255];})();
const mul=(a,b)=>a&&b?EXP[LOG[a]+LOG[b]]:0;
function generator(n){let g=[1];for(let i=0;i<n;i++){const next=new Array(g.length+1).fill(0);for(let j=0;j<g.length;j++){next[j]^=g[j];next[j+1]^=mul(g[j],EXP[i]);}g=next;}return g;}
function ecc(data,n){const g=generator(n),out=data.concat(new Array(n).fill(0));for(let i=0;i<data.length;i++){const c=out[i];if(c)for(let j=1;j<g.length;j++)out[i+j]^=mul(g[j],c);}return out.slice(data.length);}
function capacity(v){return BLOCKS[v][1].reduce((n,[c,k])=>n+c*k,0);}
function encode(text){
 const bytes=Array.from(new TextEncoder().encode(String(text)));
 let version=1;while(version<=10&&4+(version<10?8:16)+bytes.length*8>capacity(version)*8)version++;
 if(version>10)throw Error('Teks terlalu panjang untuk QR.');
 const bits=[],push=(v,n)=>{for(let i=n-1;i>=0;i--)bits.push((v>>>i)&1);};
 push(4,4);push(bytes.length,version<10?8:16);bytes.forEach(b=>push(b,8));
 const cap=capacity(version)*8;push(0,Math.min(4,cap-bits.length));while(bits.length%8)bits.push(0);
 const data=[];for(let i=0;i<bits.length;i+=8)data.push(parseInt(bits.slice(i,i+8).join(''),2));
 for(let pad=0xec;data.length<capacity(version);pad^=0xec^0x11)data.push(pad);
 const [ecLen,groups]=BLOCKS[version],blocks=[];let at=0;
 for(const [count,size]of groups)for(let i=0;i<count;i++){const d=data.slice(at,at+size);at+=size;blocks.push({d,e:ecc(d,ecLen)});}
 const final=[],maxD=Math.max(...blocks.map(b=>b.d.length));
 for(let i=0;i<maxD;i++)for(const b of blocks)if(i<b.d.length)final.push(b.d[i]);
 for(let i=0;i<ecLen;i++)for(const b of blocks)final.push(b.e[i]);
 return {version,codewords:final};
}
function bch(value,poly){const deg=31-Math.clz32(poly);let v=value<<deg;while(31-Math.clz32(v)>=deg)v^=poly<<(31-Math.clz32(v)-deg);return (value<<deg)|v;}
function build(text){
 const {version,codewords}=encode(text),size=17+version*4;
 const m=Array.from({length:size},()=>new Array(size).fill(null)),fixed=Array.from({length:size},()=>new Array(size).fill(false));
 const set=(r,c,v)=>{m[r][c]=v;fixed[r][c]=true;};
 const finder=(r,c)=>{for(let i=-1;i<=7;i++)for(let j=-1;j<=7;j++){const y=r+i,x=c+j;if(y<0||x<0||y>=size||x>=size)continue;const on=i>=0&&i<=6&&j>=0&&j<=6&&(i===0||i===6||j===0||j===6||(i>=2&&i<=4&&j>=2&&j<=4));set(y,x,on);}};
 finder(0,0);finder(0,size-7);finder(size-7,0);
 for(let i=8;i<size-8;i++){set(6,i,i%2===0);set(i,6,i%2===0);}
 const pos=ALIGN[version],last=pos.length-1;pos.forEach((r,a)=>pos.forEach((c,b)=>{if((a===0&&b===0)||(a===0&&b===last)||(a===last&&b===0))return;for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++)set(r+i,c+j,Math.max(Math.abs(i),Math.abs(j))!==1);}));
 for(let i=0;i<9;i++){if(!fixed[8][i])set(8,i,false);if(!fixed[i][8])set(i,8,false);}
 for(let i=0;i<8;i++){set(8,size-1-i,false);set(size-1-i,8,false);}
 set(size-8,8,true);
 if(version>=7){const info=bch(version,0x1f25);for(let i=0;i<18;i++){const bit=!!((info>>i)&1),a=Math.floor(i/3),b=size-11+i%3;set(a,b,bit);set(b,a,bit);}}
 const bits=[];codewords.forEach(c=>{for(let i=7;i>=0;i--)bits.push((c>>i)&1);});for(let i=0;i<REMAINDER[version];i++)bits.push(0);
 let k=0;for(let col=size-1;col>0;col-=2){if(col===6)col--;for(let n=0;n<size;n++){const up=((size-1-col)>>1)%2===0,row=up?size-1-n:n;for(let d=0;d<2;d++){const c=col-d;if(fixed[row][c])continue;m[row][c]=!!bits[k++];}}}
 const masks=[(r,c)=>(r+c)%2===0,(r)=>r%2===0,(r,c)=>c%3===0,(r,c)=>(r+c)%3===0,(r,c)=>(Math.floor(r/2)+Math.floor(c/3))%2===0,(r,c)=>(r*c)%2+(r*c)%3===0,(r,c)=>((r*c)%2+(r*c)%3)%2===0,(r,c)=>((r+c)%2+(r*c)%3)%2===0];
 let best=null;
 for(let mask=0;mask<8;mask++){
  const g=m.map((row,r)=>row.map((v,c)=>fixed[r][c]?v:v!==masks[mask](r,c)));
  const format=bch((0<<3)|mask,0x537)^0x5412;
  for(let i=0;i<15;i++){const bit=!!((format>>i)&1);if(i<6)g[i][8]=bit;else if(i<8)g[i+1][8]=bit;else g[size-15+i][8]=bit;if(i<8)g[8][size-1-i]=bit;else if(i<9)g[8][15-i]=bit;else g[8][14-i]=bit;}
  const score=penalty(g);if(!best||score<best.score)best={g,score};
 }
 return best.g;
}
function penalty(g){const n=g.length;let s=0;
 for(let pass=0;pass<2;pass++)for(let i=0;i<n;i++){let run=1;for(let j=1;j<n;j++){const a=pass?g[j][i]:g[i][j],b=pass?g[j-1][i]:g[i][j-1];if(a===b){run++;if(run===5)s+=3;else if(run>5)s++;}else run=1;}}
 for(let i=0;i<n-1;i++)for(let j=0;j<n-1;j++){const v=g[i][j];if(v===g[i+1][j]&&v===g[i][j+1]&&v===g[i+1][j+1])s+=3;}
 const dark=g.flat().filter(Boolean).length;s+=Math.floor(Math.abs(dark*20-n*n*10)/(n*n))*10;return s;}
function svg(text,{size=220,margin=4,color='#0e2238',background='#ffffff',label='Kode QR'}={}){const g=build(text),n=g.length,total=n+margin*2;let path='';g.forEach((row,r)=>row.forEach((v,c)=>{if(v)path+=`M${c+margin} ${r+margin}h1v1h-1z`;}));return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${size}" height="${size}" role="img" aria-label="${label}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="${background}"/><path d="${path}" fill="${color}"/></svg>`;}
root.MARALA_QR={svg,matrix:build};
})(typeof window!=='undefined'?window:globalThis);
