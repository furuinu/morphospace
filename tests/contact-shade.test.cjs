'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const between=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b));
const estimate=between('const contactShadeShader=','const contactApplyShader=');
const apply=between('const contactApplyShader=','const lensExtract=');
const pass=between('function paintContactShade(','const CONTACT_SHADE_REACH=');
const post=between('function paintLensFlare(','function worldCameraFrame(');
const setup=between('function ensureLensFlare(','function createVhsTracking(');

test('contact shading is estimated from scene depth and leaves empty background untouched',()=>{
 assert.ok(estimate.includes('if(z0>.99999){gl_FragColor=vec4(1.0);return;}'));
 assert.ok(estimate.includes('vec3 n=normalize(cross(dx,dy));'));
 assert.ok(estimate.includes('for(int i=0;i<10;i++){'),'constant loop bound');
 assert.ok(estimate.includes('clamp(1.0-d2/(uRadius*uRadius),0.0,1.0)'),'distant geometry cannot occlude');
 assert.ok(estimate.includes('float shade=1.0-clamp(occlusion*.1*uStrength,0.0,.62);'),'darkening is bounded');
 assert.ok(apply.includes('if(texture2D(uDepth,vPost).r>.99999){gl_FragColor=vec4(1.0);return;}'));
});
test('the pass multiplies colour only, before bloom extraction, and restores GL state',()=>{
 assert.ok(post.indexOf('paintContactShade(f,w,h);')<post.indexOf('for(let i=flareEnabled?0:2'));
 assert.ok(pass.includes('gl.blendFuncSeparate(gl.DST_COLOR,gl.ZERO,gl.ZERO,gl.ONE);'),'alpha keeps the emission mask');
 assert.ok(pass.includes('gl.bindFramebuffer(gl.FRAMEBUFFER,f.contactFramebuffer)'),'colour-only view avoids a depth feedback loop');
 const tail=pass.slice(pass.lastIndexOf('quad(p);'));
 for(const restore of ['gl.disable(gl.BLEND)','gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA)','gl.depthMask(true)','gl.enable(gl.DEPTH_TEST)','gl.viewport(0,0,w,h)','gl.bindFramebuffer(gl.FRAMEBUFFER,f.targets[0].framebuffer)'])
  assert.ok(tail.includes(restore),restore);
});
test('zero shading strength, wireframe, laboratory sequences and missing resources skip the pass',()=>{
 assert.ok(pass.includes("!(strength>0)||$('wire').checked||nanoRenderPose||!qualityTier().contact||videoRecording?.lite>=1)return;"));
 assert.ok(pass.includes('!f.contactProgram||!f.contactApply||!f.contactTarget||!f.contactFramebuffer||!f.depthTexture'));
 assert.ok(html.includes("function contactShadeStrength(){return clamp(Number($('shadeStrength')?.value||0)/15,0,2)*"));
});
test('WebGL2 depth is required and a failed setup releases everything',()=>{
 assert.ok(setup.includes('if(modern&&f.depthTexture){'));
 assert.ok(setup.includes("console.warn('Contact shading unavailable; scene unchanged',contactError);destroyContactShade(f);"));
 assert.ok(setup.includes('if(!f.depthTexture||!complete)destroyContactShade(f);'));
 const destroy=between('function destroyContactShade(','function ensureLensFlare(');
 for(const release of ['gl.deleteProgram(f.contactProgram.program)','gl.deleteProgram(f.contactApply.program)','gl.deleteTexture(f.contactTarget.texture)','gl.deleteFramebuffer(f.contactFramebuffer)'])
  assert.ok(destroy.includes(release),release);
 assert.ok(between('function destroyLensFlare(','function destroyContactShade(').includes('destroyContactShade(f);'));
});
