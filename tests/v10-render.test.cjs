const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const match=html.match(/const PD10_SHADER=pdTry\(\(\)=>compile\(("(?:\\.|[^"\\])*"),("(?:\\.|[^"\\])*")\)/);
assert.ok(match,'extract the actual shipped shader');
const vs=JSON.parse(match[1]),frag=JSON.parse(match[2]);
const detailLine=html.split('\n').find(l=>l.startsWith('function pd10DetailSource('));assert.ok(detailLine);const detailFrag=new Function(detailLine+';return pd10DetailSource;')()(frag);
test('V10 source and isolation',()=>{
 assert.match(html,/name="pd-version" content="10\.0-alpha\.[123456789]"/);
 assert.doesNotMatch(frag,/\bsampler\w*\b/);
 assert.match(html,/function pd10Draw\(o\)/);
 assert.match(html,/if\(pd10Draw\(o\)\)return/);
 assert.match(html,/POST\.end\(\); pdRecoveryPaint\(\)/);
 let count=0;
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(/\bsrc\s*=|type\s*=\s*["'](?!text\/javascript|application\/javascript)/i.test(m[1])||!m[2].trim())continue;
  new vm.Script(m[2],{filename:'inline-'+(++count)+'.js'});
 }
 assert.ok(count>0);
});
test('actual WebGL2 compiles and draws all 12 planet types',async()=>{
 const {chromium,webkit}=require('playwright');
 const browser=process.env.PD_BROWSER==='webkit'?await webkit.launch({headless:true}):await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage();
 const result=await page.evaluate(({vs,frag,detailFrag})=>{
 const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('webgl2');if(!g)throw Error('WebGL2 unavailable');
 const shader=(type,src)=>{const x=g.createShader(type);g.shaderSource(x,src);g.compileShader(x);if(!g.getShaderParameter(x,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(x));return x;};
 const p=g.createProgram();g.attachShader(p,shader(g.VERTEX_SHADER,vs));g.attachShader(p,shader(g.FRAGMENT_SHADER,frag));g.bindAttribLocation(p,0,'a');g.linkProgram(p);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p));g.useProgram(p);
 const b=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,b);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),g.STATIC_DRAW);g.enableVertexAttribArray(0);g.vertexAttribPointer(0,2,g.FLOAT,false,0,0);
 const u=k=>g.getUniformLocation(p,k),f=(k,x)=>g.uniform1f(u(k),x),i=(k,x)=>g.uniform1i(u(k),x),v=(k,x)=>g.uniform3fv(u(k),x);
 g.viewport(0,0,128,128);g.uniform2f(u('res'),128,128);g.uniform2f(u('center'),64,64);f('radius',42);f('reach',1.2);v('c1',[.3,.5,.8]);v('c2',[.7,.45,.2]);v('at',[.4,.6,1]);v('light',[.4,.5,1]);g.uniformMatrix3fv(u('viewBasis'),false,new Float32Array([1,0,0,0,1,0,0,0,1]));g.uniform2f(u('ringK'),0,0);
 for(const [k,x] of Object.entries({seed:1,ang:.4,tilt:.2,tm:2,alpha:1,atmo:.5,stage:3,beat:.3,weather:.4,quality:1,identity:0,ringS:.3,roll:0}))f(k,x);
 i('kind',0);i('album',0);const output=[];
 for(let type=0;type<12;type++){
 i('type',type);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.drawArrays(g.TRIANGLE_STRIP,0,4);
 const buf=new Uint8Array(128*128*4);g.readPixels(0,0,128,128,g.RGBA,g.UNSIGNED_BYTE,buf);let pixels=0,signature=2166136261;const colors=new Set();
 for(let n=0;n<buf.length;n+=4)if(buf[n+3]>220){pixels++;for(let k=0;k<3;k++)signature=Math.imul(signature^buf[n+k],16777619);colors.add(buf[n]+','+buf[n+1]+','+buf[n+2]);}
 output.push({type,pixels,colors:colors.size,signature,error:g.getError()});
 }
 const dp=g.createProgram();g.attachShader(dp,shader(g.VERTEX_SHADER,vs));g.attachShader(dp,shader(g.FRAGMENT_SHADER,detailFrag));g.bindAttribLocation(dp,0,'a');g.linkProgram(dp);if(!g.getProgramParameter(dp,g.LINK_STATUS))throw Error(g.getProgramInfoLog(dp));
 return output;
 },{vs,frag,detailFrag});
 for(const r of result){assert.equal(r.error,0,JSON.stringify(r));assert.ok(r.pixels>3500,JSON.stringify(r));assert.ok(r.colors>30,JSON.stringify(r));}
 assert.notEqual(result[6].signature,result[7].signature,'spectral and vortex worlds must look distinct');console.log(result);
 }finally{await browser.close();}
});

test('pixel watchdog distinguishes absent output from changed RGB',()=>{
 const line=html.split('\n').find(l=>l.startsWith('function pd10PixelDelta('));assert.ok(line);
 const c=vm.createContext({});vm.runInContext(line,c);
 const a=new Uint8Array(16),b=new Uint8Array(16);assert.equal(c.pd10PixelDelta(a,b),0);b[3]=255;assert.equal(c.pd10PixelDelta(a,b),0);b[4]=50;assert.equal(c.pd10PixelDelta(a,b),50);
});

test('production probe resolves MSAA pixels and restores framebuffer bindings',async()=>{
 const {chromium,webkit}=require('playwright');
 const browser=process.env.PD_BROWSER==='webkit'?await webkit.launch({headless:true}):await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage();
 const source=html.slice(html.indexOf('let PD10_PROBE_UNAVAILABLE='),html.indexOf('function pd10TryProbe('));
 assert.ok(source.includes('function pd10ProbePixels'));
 const result=await page.evaluate(source=>{
 const c=document.createElement('canvas');c.width=c.height=32;
 const gl=c.getContext('webgl2');if(!gl)throw Error('WebGL2 unavailable');
 const f=gl.createFramebuffer(),rb=gl.createRenderbuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.bindRenderbuffer(gl.RENDERBUFFER,rb);
 const samples=Math.min(4,gl.getParameter(gl.MAX_SAMPLES));if(samples<2)throw Error('MSAA unavailable');
 gl.renderbufferStorageMultisample(gl.RENDERBUFFER,samples,gl.RGBA8,32,32);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.RENDERBUFFER,rb);
 if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('MSAA incomplete');
 const dst=gl.createFramebuffer(),single=gl.createRenderbuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,dst);gl.bindRenderbuffer(gl.RENDERBUFFER,single);gl.renderbufferStorage(gl.RENDERBUFFER,gl.RGBA8,32,32);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.RENDERBUFFER,single);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('resolve target incomplete');gl.bindFramebuffer(gl.FRAMEBUFFER,f);
 const POST={on:true,ms:{f},s:{f:dst}},H=32,probe=new Function('gl','POST','H',source+';return pd10ProbePixels;')(gl,POST,H);
 const a=new Uint8Array(16),b=new Uint8Array(16);
 gl.clearColor(.1,.2,.3,1);gl.clear(gl.COLOR_BUFFER_BIT);const first=probe({x:16,y:16},a);
 gl.clearColor(.8,.5,.2,1);gl.clear(gl.COLOR_BUFFER_BIT);const second=probe({x:16,y:16},b);
 return {first,second,a:Array.from(a),b:Array.from(b),restored:gl.getParameter(gl.READ_FRAMEBUFFER_BINDING)===f&&gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING)===f,error:gl.getError()};
 },source);
 assert.equal(result.first,true,JSON.stringify(result));assert.equal(result.second,true,JSON.stringify(result));assert.equal(result.restored,true,JSON.stringify(result));assert.equal(result.error,0,JSON.stringify(result));assert.ok(result.b[0]-result.a[0]>100,JSON.stringify(result));
 }finally{await browser.close();}
});

test('actual CPU recovery distinguishes all 12 planet materials and caches deterministic sprites',()=>{
 const source=html.slice(html.indexOf('function pdRecoverySprite('),html.indexOf('function pdRecoveryPaint('));
 assert.ok(source.includes('PD_REC_CACHE'));
 const cache=new Map(),doc={createElement(){return {getContext(){return {createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(im){this.owner.pixels=im.data;},owner:this};}};}};
 const build=new Function('document','PD_REC_CACHE',source+';return pdRecoverySprite;')(doc,cache);
 const palette={kind:0,seed:7.7,ang:.4,tilt:.2,c1:[.35,.55,.75],c2:[.7,.4,.22],at:[.45,.6,1],atmo:.5,L:[.3,.5,1]};
 const signatures=new Set();
 for(let type=0;type<12;type++){const o={...palette,type},c=build(o,50);assert.equal(c,build(o,50));let hash=2166136261;const colors=new Set();for(let i=0;i<c.pixels.length;i+=4){if(c.pixels[i+3]<220)continue;for(let k=0;k<3;k++)hash=Math.imul(hash^c.pixels[i+k],16777619);colors.add(c.pixels.slice(i,i+3).join(','));}assert.ok(colors.size>30,'type '+type);signatures.add(hash);}
 assert.equal(signatures.size,12);
 const p=build({...palette,type:11},50);assert.notEqual(p,build({...palette,type:11,atmo:.9},50));
 for(let i=0;i<30;i++)build({...palette,seed:i,type:0},10);
 assert.ok(cache.size<=24);
});
