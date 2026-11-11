const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const between=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i);assert.ok(i>=0&&j>i,a);return html.slice(i,j)};

function runtime(){
 const controls={wire:{checked:false},macroDof:{checked:true},dofStrength:{value:'45'}};
 const context={Math,Number,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),VIEWER_DEFAULT_ZOOM:55,spec:{viewDistance:10},nanoRenderPose:null,nanoAction:null,
  $:id=>controls[id],tier:{contact:true},qualityTier:()=>context.tier,viewerZoomBounds:()=>({min:3.2,max:24})};
 vm.createContext(context);vm.runInContext(between('const ZOOM_DOF_MAX=','function paintLensFlare('),context);
 // Distance for a zoom slider value, exactly as setViewerZoomValue computes it.
 const at=zoom=>{context.spec.viewDistance=24*Math.pow(3.2/24,zoom/100);return vm.runInContext('zoomDepthOfField()',context)};
 return {context,controls,at};
}
test('depth of field is absent at the default framing and rises smoothly to the closest zoom',()=>{
 const {at}=runtime();
 for(const zoom of [0,20,40,55])assert.ok(at(zoom)<1e-12,'zoom '+zoom);
 let previous=0;
 for(let zoom=56;zoom<=100;zoom++){const value=at(zoom);assert.ok(value>=previous&&value-previous<.06,'smooth at '+zoom);previous=value;}
 assert.ok(at(57)<.02,'eases in from zero');
 assert.ok(Math.abs(at(100)-1)<1e-9,'full strength at the closest zoom');
 assert.ok(at(78)>.4&&at(78)<.6);
});
test('captures, wireframe and the switch skip it; a reduced quality tier keeps it with fewer samples',()=>{
 const {context,controls,at}=runtime();
 for(const off of [()=>controls.macroDof.checked=false,()=>context.nanoRenderPose={},()=>context.nanoAction={},()=>controls.wire.checked=true,()=>controls.dofStrength.value='0']){
  off();
  assert.equal(at(100),0);
  context.nanoRenderPose=null;context.nanoAction=null;controls.wire.checked=false;controls.macroDof.checked=true;context.tier={contact:true};controls.dofStrength.value='45';
 }
 controls.dofStrength.value='90';assert.ok(Math.abs(at(100)-2)<1e-9);
 controls.dofStrength.value='45';context.tier={contact:false};assert.ok(Math.abs(at(100)-1)<1e-9,'the user\'s switch is honoured at every tier');
 assert.ok(html.includes('gl.uniform1f(p.u.uDofSamples,viewer.morph||!qualityTier().contact?12:24);'));
});
test('the pass runs from the zoom strength, focuses on the body and is independent of render scale',()=>{
 const pass=between('function paintLensFlare(','function worldCameraFrame(');
 assert.ok(pass.includes('const dofStrength=f.dofProgram&&f.depthTexture?zoomDepthOfField():0;')&&pass.includes('\n if(dofStrength>.02){'));
 assert.ok(!pass.includes('if(false&&'),'the pass is no longer compiled out');
 assert.ok(pass.includes("gl.uniform1f(p.u.uFocus,Math.max(.3,spec.viewDistance+Number($('dofFocus').value)*.035));"));
 assert.ok(pass.includes('gl.uniform2f(p.u.uPixel,h/800/w,1/800);'));
 assert.ok(pass.includes('gl.uniform1f(p.u.uStrength,Math.min(2.8,dofStrength));'));
 assert.ok(pass.indexOf('paintContactShade(f,w,h);')<pass.indexOf('const dofStrength='),'contact shading is blurred with the surface it belongs to');
});
test('motes carry random pale rainbow hues',()=>{
 const vertex=between('const moteVertex=','const moteFragment='),fragment=between('const moteFragment=','let moteProgram=');
 assert.ok(vertex.includes('vMoteTone=fract(aMote.w*5.03+aMote.x*3.7);vMoteWash=fract(aMote.w*11.9+aMote.y*2.3);'));
 assert.ok(fragment.includes('vec3 hue=.5+.5*cos(6.2831853*(vMoteTone+vec3(0.0,.3333,.6667)));'));
 assert.ok(fragment.includes('vec3 tint=mix(vec3(1.0),hue,.34+.22*vMoteWash);'));
 // CPU port: every hue is reachable, and every tint stays pale (bright, low saturation).
 const tint=(tone,wash)=>[0,.3333,.6667].map(o=>{const hue=.5+.5*Math.cos(2*Math.PI*(tone+o));return 1+(hue-1)*(.34+.22*wash)});
 const dominant=new Set();let minChannel=1,maxSaturation=0;
 for(let i=0;i<600;i++){
  const tone=(i*.6180339887)%1,wash=(i*.7548776662)%1,c=tint(tone,wash),hi=Math.max(...c),lo=Math.min(...c);
  dominant.add(c.indexOf(hi)+'>'+c.indexOf(lo));minChannel=Math.min(minChannel,lo);maxSaturation=Math.max(maxSaturation,(hi-lo)/hi);
  assert.ok(hi>.86,'bright');
 }
 assert.equal(dominant.size,6,'all six hue sectors appear');
 assert.ok(minChannel>.43,'never a saturated colour: '+minChannel);
 assert.ok(maxSaturation<.56,'saturation '+maxSaturation);
});
test('the macro depth-of-field switch is usable, on by default and kept as a local preference',()=>{
 assert.ok(html.includes('<input id="macroDof" type="checkbox" checked/> マクロ被写界深度'));
 assert.ok(!/id="macroDof"[^>]*disabled/.test(html));
 assert.ok(html.includes("$('macroDof').onchange=()=>{try{localStorage.setItem('morphospace-macro-dof',$('macroDof').checked?'1':'0')}catch(error){}render()};"));
 assert.ok(html.includes("for(const id of ['motion','patternMotion','triplanarTrial','wire','auto','branchMotion','branchSolo'])if(typeof view[id]==='boolean')$(id).checked=view[id];"),'a shared view does not switch it off');
 assert.ok(html.includes("$('dofStrength').oninput=()=>{$('dofStrengthNum').textContent=$('dofStrength').value+'%';render()};"));
 assert.ok(html.includes("$('dofFocus').oninput=()=>{$('dofFocusNum').textContent=$('dofFocus').value;render()};"));
});
test('the settings panel says whether depth of field is running, and why not',()=>{
 assert.ok(html.includes('<output id="dofState" class="minor"></output>'),'the readout is visible');
 const controls={macroDof:{checked:true},wire:{checked:false}};
 const context={Math,ZOOM_DOF_MAX:1,nanoRenderPose:null,nanoAction:null,$:id=>controls[id]};
 vm.createContext(context);vm.runInContext(between('function depthOfFieldStatus(','function paintLensFlare('),context);
 const status=(f,strength)=>{context.f=f;return vm.runInContext('depthOfFieldStatus(f,'+strength+')',context)};
 const ready={dofProgram:{},depthTexture:{}};
 assert.equal(status(ready,.58),'被写界深度：動作中　強さ 58%');
 assert.equal(status(ready,0),'被写界深度：待機中（ズームで寄ると効きます）');
 controls.macroDof.checked=false;assert.equal(status(ready,0),'被写界深度：オフ');controls.macroDof.checked=true;
 controls.wire.checked=true;assert.equal(status(ready,0),'被写界深度：一時停止中');controls.wire.checked=false;
 assert.ok(status({dofProgram:null,depthTexture:null,dofError:'no depth'},0).startsWith('被写界深度：この端末では利用できません（no depth'));
 const pass=between('function paintLensFlare(','function worldCameraFrame(');
 assert.ok(pass.includes("const text=depthOfFieldStatus(f,dofStrength);if($('dofState').textContent!==text)$('dofState').textContent=text;"));
});
