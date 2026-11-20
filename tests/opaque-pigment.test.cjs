const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const body=html.slice(html.indexOf('vec3 chromatophoreLayers(vec3 undercoat,vec3 point){'),html.indexOf('uniform vec4 uOptics0;'));
test('animated pigment grows opaque sacs instead of fading a veil over the pattern',()=>{
 assert.match(body,/float sacRadius=\.30\*spread\*/);
 assert.match(body,/float bloom=smoothstep\(bloomEdge,bloomEdge\+\.03,/);
 assert.match(body,/color=mix\(color,P1,bloom\);\n\s*color=mix\(color,P5,local\);/);
 assert.doesNotMatch(body,/bloom\*wave\*\.38|local\*wave\*\.40|cellSpot\*wave\*\.13|cellSpot\*\.48/);
});
test('second pigments in living grammars are opaque, and patches open in the regional mark colours',()=>{
 assert.match(body,/smoothstep\(\.80,\.84,field\)\);/);assert.match(body,/smoothstep\(\.80,\.86,stripe\)\);/);
 assert.match(body,/color=mix\(color,P4,livingSpot\(uv\*1\.65\+2\.8,uChromaB\.y\*1\.4,t\*\.81\+1\.7\)\);/);
 assert.match(body,/vec3 patchColor=seed<\.5\?P3:P4;/);assert.doesNotMatch(body,/uPatchPal/);
 assert.match(body,/color=mix\(color,patchColor,selected\*step\(\.5,feather\)\*opening\*step\(\.5,mark\)\);/);
});
test('reaction-diffusion colours the pigment it sits on instead of flatly covering it',()=>{
 // The layer may now lay one of the individual's own palette colours, but it must
 // stay subordinate to the pigment underneath: the colour is scaled by the
 // underlying luminance, the shading term survives, and tint.z=0 reduces to the
 // historical pure darkening so legacy specimens are unchanged.
 assert.match(html,/color=mix\(color,ink\*\(\.72\+\.46\*dot\(color,vec3\(\.2126,\.7152,\.0722\)\)\),lay\*tint\.z\);/);
 assert.match(html,/color\*=1\.-lay\*1\.35\*\(1\.-tint\.z\*\.72\);/);
 assert.match(html,/vec3 ink=mix\(mix\(accent,highlight,tint\.x\),deep,tint\.y\*\.75\);/);
 // The reverted experiment laid a flat colour over the pigment regardless of it.
 assert.doesNotMatch(html,/mix\(accent,highlight,clamp\(pigment\*\.85/);
});
