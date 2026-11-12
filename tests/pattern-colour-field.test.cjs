const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const L=html.split('\n'),line=t=>L.findIndex(l=>l.includes(t));
function crossover(){const f={};vm.createContext(f);
 const a=line('const clamp=(v,a,b)=>'),b=line('function seedRng(');
 const c=line('const PATTERN_LIMITS='),d=line('const MUTATION_TRAITS=');
 vm.runInContext(L.slice(a,b+1).join('\n')+'\n'+L.slice(c,d).join('\n')+';this.F=patternFounderDNA;this.X=patternCrossoverDNA;this.LIM=PATTERN_LIMITS;',f);return f}
test('one pattern grammar covers the skin: the territory overlay with unrelated motifs is gone',()=>{
 assert.doesNotMatch(html,/territoryColor/);
 assert.match(html,/vec3 regionalTint\(vec3 p\)\{/);
 assert.match(html,/vec3 lumaRecolor\(vec3 c,vec3 hue\)\{/);
 assert.match(html,/vec3 P0=lumaRecolor\(uPal0,groundHue\),P2=lumaRecolor\(uPal2,groundHue\);/);
 assert.match(html,/vec3 P1=lumaRecolor\(uPal1,markHue\),P3=lumaRecolor\(uPal3,markHue\),P4=lumaRecolor\(uPal4,markHue\);/);
 const body=html.slice(html.indexOf('vec3 chromatophoreLayers(vec3 undercoat,vec3 point){'),html.indexOf('uniform vec4 uOptics0;'));
 assert.doesNotMatch(body.slice(body.indexOf('vec3 P5=uPal5;')+14),/\buPal[0-5]\b/,'pattern code reads the regional palette only');
});
test('regional hue sources morph with the texture and are bound for every program',()=>{
 assert.match(html,/'uAltPal0','uAltPal1','uAltPal2','uAltPal3',/);
 assert.match(html,/\|uAltPal\[0-3\]\|/);assert.match(html,/\|regionalTint\|lumaRecolor\|/);
 assert.match(html,/for\(let i=0;i<4;i\+\+\)set3\(uniforms\['uAltPal'\+i\],alts\[i\]\);/);
});
test('colony grammar 7 reaches its own branch and living grammars raise no mismatched relief',()=>{
 assert.match(html,/\}else if\(kind>7\.5&&kind<13\.5\)\{/);
 assert.match(html,/if\(kind<7\.5\)return sin\(\(x\+y\*\.65\)\*uChromaB\.z\+sin\(p\.z\*4\.\+phase\)\)\*\.18; \/\/ colony veins\n[^\n]*\n return 1\.;/);
});
test('crossover inherits pattern family whole and keeps continuous genes inside their limits',()=>{
 const f=crossover();let fromParent=0,n=4000;
 for(let i=0;i<n;i++){const a=f.F(100+i*7,i%8),b=f.F(9000+i*13,(i+3)%8),log=[];const c=f.X(a,b,500+i,0,log,{});
  const mutated=log.some(e=>e.field==='patternDNA.family');
  if(!mutated){assert.ok(c.family===a.family||c.family===b.family,`family ${c.family} from ${a.family}/${b.family}`);fromParent++;}
  for(const [k,[lo,hi]] of Object.entries(f.LIM))if(typeof c[k]==='number')assert.ok(c[k]>=lo-1e-5&&c[k]<=hi+1e-5,`${k}=${c[k]}`);}
 assert.ok(fromParent/n>.85,`${fromParent/n}`);
});
