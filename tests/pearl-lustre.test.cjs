const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('pearl keeps pale luminous pigments without washing the pattern out',()=>{
 assert.match(html,/else if\(mood===2\)v=1\.9\*l\+\.45\*\(1-s\)\+\.45\*d\.spread;/);
 assert.match(html,/const blend=pearlescent\?\.24:\.07;/);
 assert.match(html,/const steps=\[\.82,\.50,\.30,\.70,\.40,\.62\];/,'wider luminance ladder keeps pattern contrast');
});
test('pearl sheen is a coloured film on highlights, not a white coat over everything',()=>{
 assert.match(html,/float wet=\(\.24\+\.16\*pearl\+/);
 assert.match(html,/mix\(vec3\(\.92,\.96,1\.\),film,\.13\+metal\*\.24\+pearl\*\.30\),clearCoat\)/);
 assert.match(html,/float scattering=\(\.045\+\.025\*pearl\+/);
});
