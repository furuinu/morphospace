const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('pearl keeps pale luminous pigments without washing the pattern out',()=>{
 assert.match(html,/else if\(mood===2\)v=1\.9\*l\+\.45\*\(1-s\)\+\.45\*d\.spread;/);
 assert.match(html,/const blend=pearlescent\?\.24:\.07;/);
 assert.match(html,/const steps=\[\.82,\.50,\.30,\.70,\.40,\.62\];/,'wider luminance ladder keeps pattern contrast');
});
test('pearl sheen is a coloured film on highlights, not a white coat over everything',()=>{
 assert.match(html,/float wet=\(\.24\+\.08\*pearl\+/);
 assert.match(html,/mix\(vec3\(\.92,\.96,1\.\),film,\(\.13\+metal\*\.24\+pearl\*\.15\)\*FILM_LEVEL\),clearCoat\)/);
 assert.match(html,/float scattering=\(\.045\+\.0125\*pearl\+/);
});
test('wet-film coating caps its white sheen at 30% so highlights stop clipping',()=>{
 assert.match(html,/float clearCoat=clamp\(gloss\*wet\*\(sharp\*\.40\+soft\*\.13\),0\.,\.46\*max\(1\.,gloss\)\)\*mix\(1\.,\.30,wetFilm\);/);
 assert.match(html,/halo\*\.15\*min\(1\.,gloss\)\*mix\(1\.,\.30,wetFilm\);/);
 assert.match(html,/float scattering=\(\.045\+\.0125\*pearl\+\.0135\*wetFilm\);/);
});
test('all thin-film contributions follow the 薄膜 slider, which defaults to the full v15.58 level',()=>{
 assert.match(html,/float FILM_LEVEL=clamp\(uOpticsControl\.z,0\.,1\.\);/);
 assert.match(html,/<input id="thinFilmStrength" type="range" min="0" max="100" value="100"\/><output id="thinFilmStrengthNum">100%<\/output>/,'薄膜 slider defaults to 100%');
 assert.match(html,/Number\(\$\('thinFilmStrength'\)\?\.value\?\?100\)\/100/);
 assert.match(html,/0\.,\.68\)\*FILM_LEVEL;\n/);assert.match(html,/color=mix\(color,film\*patternShade,filmAmount\);/);
 assert.match(html,/clamp\(uOpticsControl\.y\*uOptics1\.y\*\.57,0\.,\.80\)\*FILM_LEVEL\);/);
 assert.match(html,/film,\.46\*FILM_LEVEL\)\*halo/);
});
test('gloss highlight has its own slider and the Fresnel slider only drives edges',()=>{
 assert.match(html,/<input id="glossStrength" type="range" min="0" max="150" value="100"\/>/);
 assert.match(html,/uniform vec4 uOpticsControl;/);
 assert.match(html,/gl\.uniform4f\(uniforms\.uOpticsControl,[^;]*'thinFilmStrength'[^;]*'glossStrength'/);
 assert.match(html,/float gloss=clamp\(uOpticsControl\.w,0\.,1\.5\);/);
 assert.doesNotMatch(html,/uOpticsControl\.x\*wet/);assert.match(html,/\*\.055\*gloss;/);
 assert.match(html,/'thinFilmStrength','glossStrength'/);
});
test('film and edge reflection never hide the pattern completely',()=>{
 assert.match(html,/vec3 pigment=color;\n float patternShade=mix\(\.50,1\.,smoothstep\(\.03,\.40,dot\(pigment,vec3\(\.2126,\.7152,\.0722\)\)\)\);/);
 assert.match(html,/color=mix\(color,reflection\*mix\(1\.,patternShade,\.6\),rim\);/);
 assert.match(html,/float PATTERN_COVER=\.56,covered=1\.-\(1\.-filmAmount\)\*\(1\.-rim\);\n color=mix\(pigment,color,min\(1\.,PATTERN_COVER\/max\(covered,\.0001\)\)\);/);
 // Whatever the film and rim amounts, at least 44% of the pigment remains.
 for(const film of [0,.3,.68])for(const rim of [0,.5,.96]){const covered=1-(1-film)*(1-rim),s=Math.min(1,.56/Math.max(covered,.0001));assert.ok(1-covered*s>=.44-1e-9);}
});
test('comb-row beads carry a relief in the lighting, matching their colour pattern',()=>{
 assert.match(html,/#define COMB_BUMP \.42\n/);
 assert.match(html,/ return combBeadNormal\(point,normalize\(n-g\)\);\n\}/);
 assert.match(html,/ if\(uSurface0\.x<\.001\)return combBeadNormal\(point,normalize\(normal\)\);/);
 // Same coordinates as the iridescent beads in chromaticSkinFlow.
 const flow=html.slice(html.indexOf('vec4 chromaticSkinFlow('),html.indexOf('// Stable pseudo-thickness'));
 for(const part of ['float rowDensity=12.+floor(fract(seed*.67)*6.)*2.','beadDensity=42.+floor(fract(seed*.39)*5.)*6.','smoothstep(.10,.29,abs(across))','smoothstep(.12,.32,abs(along))'])assert.ok(flow.includes(part.replace(',beadDensity','float beadDensity').replace(/^beadDensity/,'float beadDensity'))||flow.includes(part),'flow uses '+part);
 assert.match(html,/float tA=clamp\(\(abs\(across\)-\.10\)\/\.19,0\.,1\.\),tB=clamp\(\(abs\(along\)-\.12\)\/\.20,0\.,1\.\);/);
 // Fades below pixel size, absent where the shader has no pixel footprint, and renamed in the second surface copy.
 assert.match(html,/float fade=1\.-max\(smoothstep\(\.30,\.90,PATTERN_FOOTPRINT\(rowCoordinate\)\),smoothstep\(\.30,\.90,PATTERN_FOOTPRINT\(beadCoordinate\)\)\);/);
 assert.match(html,/vec3 combBeadNormal\(vec3 point,vec3 n\)\{\n#ifdef PATTERN_FOOTPRINT/);
 assert.match(html,/surfaceNormal\|combBeadNormal\|territoryInfo/);
});
