'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const composite=html.slice(html.indexOf('const lensComposite='),html.indexOf('function destroyLensFlare('));
const studio=html.slice(html.indexOf('const studioFragment='),html.indexOf('const residentVertex='));
const post=html.slice(html.indexOf('function paintLensFlare('),html.indexOf('function worldCameraFrame('));

// CPU port of the shader's noise, to check the dither really is zero-mean and bounded.
const fract=x=>x-Math.floor(x);
const noise=(x,y)=>fract(52.9829189*fract(x*.06711056+y*.00583715));
const dither=(x,y)=>(noise(x,y)+noise(x+47,y+17)-1)/255;

test('final composite antialiases the scene before flare and VHS treatment',()=>{
 assert.ok(composite.includes('vec3 sceneAA(vec2 uv)'));
 assert.ok(composite.includes('vec3 base=sceneAA(tape);'));
 assert.ok(composite.indexOf('vec3 base=sceneAA(tape);')<composite.indexOf('float grain=videoHash('),'film grain must stay unfiltered');
 assert.ok(composite.includes('if(lMax-lMin<max(.055,lMax*.166))return m+clamp((lM-(lNW+lNE+lSW+lSE)*.25)*uSharpen,-.07,.07);'),'non-edge pixels leave early, sharpened');
 assert.ok(!/for\s*\(/.test(composite.slice(composite.indexOf('vec3 sceneAA'),composite.indexOf('float videoHash'))),'no loops: WebGL1 compatible');
});
test('antialiasing receives the scene texel size',()=>{
 assert.ok(post.includes("if(p.u.uPixel)gl.uniform2f(p.u.uPixel,1/w,1/h);"));
 assert.ok(composite.includes('if(uPixel.x<=0.0)return m;'));
});
test('background gradient is dithered before the 8-bit scene target and output is dithered last',()=>{
 const main=studio.slice(studio.lastIndexOf('void main(){'));
 assert.ok(main.indexOf('proceduralNebula(vStudioUv),uNebulaMix)')<main.indexOf('-1.0)/255.0;'));
 assert.ok(main.indexOf('-1.0)/255.0;')<main.lastIndexOf('gl_FragColor='));
 const preview=main.slice(0,main.indexOf('return;'));
 assert.ok(!preview.includes('/255.0'),'atlas thumbnails keep their noise-free backdrop');
 assert.ok(composite.indexOf('ditherNoise(gl_FragCoord.xy+vec2(47.0,17.0))-1.0)/255.0;')>composite.indexOf('float dropout='));
});
test('dither is bounded to one 8-bit step, zero-mean and breaks up a slow gradient',()=>{
 let sum=0,min=1,max=-1;const W=320,H=200;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const d=dither(x+.5,y+.5);sum+=d;min=Math.min(min,d);max=Math.max(max,d);}
 assert.ok(min>=-1/255&&max<=1/255);
 assert.ok(Math.abs(sum/(W*H))<.05/255,'no brightness shift');
 // A ramp spanning three 8-bit levels across 320 px: undithered it has 3 hard steps.
 const row=y=>Array.from({length:W},(_,x)=>Math.round((.05+x/W*3/255+dither(x+.5,y+.5))*255));
 let transitions=0;const r=row(10.5);for(let x=1;x<W;x++)if(r[x]!==r[x-1])transitions++;
 assert.ok(transitions>40,'quantisation steps are dispersed, got '+transitions);
 // Averaged over many rows the dithered ramp reproduces the true gradient far below one level.
 let worst=0;for(let x=0;x<W;x+=16){let m=0;for(let y=0;y<H;y++)m+=row(y+.5)[x];m/=H;worst=Math.max(worst,Math.abs(m-(.05+x/W*3/255)*255));}
 assert.ok(worst<.2,'mean error '+worst);
});
test('non-edge pixels gain bounded local contrast and flat areas are untouched',()=>{
 assert.ok(html.includes('const ZOOM_DOF_MAX=1.0,SCENE_SHARPEN=.55;'));
 assert.ok(post.includes('if(p.u.uSharpen)gl.uniform1f(p.u.uSharpen,SCENE_SHARPEN);'));
 // CPU port of the luma step: centre against the mean of its four diagonal neighbours.
 const step=(centre,neighbours)=>Math.max(-.07,Math.min(.07,(centre-neighbours.reduce((a,b)=>a+b,0)/4)*.55));
 assert.equal(step(.5,[.5,.5,.5,.5]),0,'a flat area is unchanged');
 assert.ok(step(.52,[.5,.5,.5,.5])>0&&step(.48,[.5,.5,.5,.5])<0,'detail is pushed away from its surroundings');
 assert.equal(step(.9,[.1,.1,.1,.1]),.07);assert.equal(step(.1,[.9,.9,.9,.9]),-.07);
});
