const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('only emitters feed the lens flare, and the flare is stronger',()=>{
 assert.match(html,/return s\.rgb\*smoothstep\(\.35,\.9,s\.a\)\*smoothstep\(\.55,\.92,l\)\*1\.8;\}/);
 assert.match(html,/vec3\(\.40\)\),1\.0\);/);assert.match(html,/flare=min\(texture2D\(uFlare,tape\)\.rgb,vec3\(\.32\)\);/);
 assert.match(html,/\/\/ Alpha carries the emission mask for the lens flare; the canvas itself is opaque \(alpha:false\)\.\n gl_FragColor=shaded;/);
 assert.match(html,/getContext\('webgl2',\{alpha:false/);
 assert.match(html,/gl_FragColor=vec4\(clamp\(colour,0\.0,1\.0\),0\.0\);/,'the backdrop is never emission');
});
test('the white silhouette rim is softer, pigment-tinted and not treated as emission',()=>{
 assert.equal((html.match(/normalize\(max\(shaded\.rgb,vec3\(\.08\)\)\)\*0\.95,0\.80\);\n  shaded\.rgb\+=edgeTint\*edgeGlow\*0\.30;/g)||[]).length,2,'full and compatible shaders');
 assert.doesNotMatch(html,/shaded\.a=max\(shaded\.a,edgeGlow/);
});
