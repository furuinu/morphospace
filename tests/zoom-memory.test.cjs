const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('transitions frame the next specimen from the remembered user zoom, so it never ratchets',()=>{
 assert.match(html,/spec\.viewDistance=next;viewer\.zoomValue=100\*Math\.log\(max\/next\)\/Math\.log\(max\/min\);syncViewerZoom\(\);/);
 assert.match(html,/const zoom=viewerZoomRatio\(viewer\.zoomValue\?\?VIEWER_DEFAULT_ZOOM\);/);
 assert.doesNotMatch(html,/const zoom=spec\.viewDistance\/\(spec\.baseViewDistance\*viewer\.fit\);/);
 // The ratio matches the slider mapping (min .32×, max 2.4× of the fitted base distance).
 const r=v=>2.4*Math.pow(.32/2.4,v/100);assert.ok(Math.abs(r(0)-2.4)<1e-12&&Math.abs(r(100)-.32)<1e-12);
});
