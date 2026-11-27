const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const match=html.match(/const PD10_SHADER=pdTry\(\(\)=>compile\(("(?:\\.|[^"\\])*"),("(?:\\.|[^"\\])*")\)/);
assert.ok(match,'extract the actual shipped shader');
const vs=JSON.parse(match[1]),frag=JSON.parse(match[2]);
test('V10 source and isolation',()=>{
 assert.match(html,/name="pd-version" content="10\.0-alpha\.[12]"/);
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
 const {chromium}=require('playwright');
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage();
 const result=await page.evaluate(({vs,frag})=>{
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
 const buf=new Uint8Array(128*128*4);g.readPixels(0,0,128,128,g.RGBA,g.UNSIGNED_BYTE,buf);let pixels=0;const colors=new Set();
 for(let n=0;n<buf.length;n+=4)if(buf[n+3]>220){pixels++;colors.add(buf[n]+','+buf[n+1]+','+buf[n+2]);}
 output.push({type,pixels,colors:colors.size,error:g.getError()});
 }
 return output;
 },{vs,frag});
 for(const r of result){assert.equal(r.error,0,JSON.stringify(r));assert.ok(r.pixels>3500,JSON.stringify(r));assert.ok(r.colors>30,JSON.stringify(r));}
 console.log(result);
 }finally{await browser.close();}
});
