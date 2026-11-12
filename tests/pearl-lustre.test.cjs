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
 assert.match(html,/float clearCoat=clamp\(uOpticsControl\.x\*wet\*\(sharp\*\.40\+soft\*\.13\),0\.,\.46\)\*mix\(1\.,\.30,wetFilm\);/);
 assert.match(html,/halo\*\.15\*mix\(1\.,\.30,wetFilm\);/);
 assert.match(html,/float scattering=\(\.045\+\.0125\*pearl\+\.0135\*wetFilm\);/);
});
test('all thin-film contributions run at 15% of their former strength',()=>{
 assert.match(html,/const float FILM_LEVEL=\.15;/);
 assert.match(html,/0\.,\.68\)\*FILM_LEVEL;\n color=mix\(color,film,filmAmount\);/);
 assert.match(html,/clamp\(uOpticsControl\.y\*uOptics1\.y\*\.57,0\.,\.80\)\*FILM_LEVEL\);/);
 assert.match(html,/film,\.46\*FILM_LEVEL\)\*halo/);
});
