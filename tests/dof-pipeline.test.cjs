'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const shader=html.slice(html.indexOf('const macroDofShader='),html.indexOf('const lensExtract='));
const post=html.slice(html.indexOf('function paintLensFlare('),html.indexOf('function worldCameraFrame('));
test('DOF blurs rendered specimen texture instead of only light bloom',()=>{
 assert.ok(shader.includes('float gatherRadius=radius*max(coc,.55)'));
 assert.ok(shader.includes('float weight=max(surfaceWeight*coc,nearSpill)'));
 assert.ok(shader.includes('float strength=clamp(max(coc,spill*.65),0.0,1.0)'));
 assert.ok(shader.includes('gl_FragColor=mix(center,softened,strength)'));
 assert.ok(!shader.includes('mixAmount=clamp(max(blur*.85'));
});
test('DOF takes rendered scene and depth before lens flare and final composite',()=>{
 assert.ok(post.indexOf('scene=f.targets[3].texture')<post.indexOf('for(let i=flareEnabled?0:2'));
 assert.ok(post.includes('gl.bindTexture(gl.TEXTURE_2D,f.depthTexture)'));
 assert.ok(html.includes('gl.uniform1f(p.u.uFocus,Math.max(.3,spec.viewDistance+Number($(\'dofFocus\').value)*.035))'));
 assert.ok(html.includes('<option value="1">深度表示</option><option value="2">ぼけ量表示</option>'));
});
