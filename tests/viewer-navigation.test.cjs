'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');

test('atlas and stock specimens default to immersive viewing', () => {
 assert.match(html, /function loadSpecimen\(i,stored=null,\{fullscreen=true\}=\{\}\)/);
 assert.match(html, /viewerMetadata\(\);if\(fullscreen\)\{setViewerFullscreen\(true\);setViewerNavigationVisible\(false\)\}else render\(\);/, 'immersive viewing opens with the controls hidden');
 assert.equal((html.match(/item\.addEventListener\('click',\(\)=>\{try\{loadSpecimen\(i\)/g) || []).length, 2);
 assert.match(html, /loadSpecimen\(0,saved\)/);
});

test('inspector and list navigation remain available from full-screen', () => {
 // The detail toggle sits directly on the toolbar, not inside the settings panel.
 const toolbar=html.slice(html.indexOf('<div class="viewer-toolbar"'),html.indexOf('<details id="viewerSettings">'));
 assert.match(toolbar, /id="viewerFullscreen"[^>]*aria-label="個体の詳細を開く"[^>]*><i class="ms-icon"/);
 assert.match(toolbar, /id="close"[^>]*aria-label="実験室・生体一覧へ戻る"[^>]*><i class="ms-icon" aria-hidden="true">&#xf0c3;<\/i><\/button>/);
 assert.match(html, /setAttribute\('aria-pressed',String\(!full\)\)/);
 assert.doesNotMatch(html, /viewerDetailFold|viewerRecord|id="recordVideo"|id="save"/);
 assert.match(html, /@font-face\{font-family:"Morphospace Icons"[^}]*src:url\(data:font\/woff2;base64,/);
 assert.match(html, /id="viewerAboutOpen"/);
 // The lab page offers a way back to the specimen that was on screen.
 assert.match(html, /<div class="wrap"><div class="viewer-return-bar"><button type="button" class="btn primary" id="viewerReturn" aria-label="鑑賞に戻る" title="鑑賞に戻る"><i class="ms-icon" aria-hidden="true">&#xf06e;<\/i><\/button><\/div>\n<div id="gallery"/);
 // The lab page has no title block or help button; About opens from the viewer.
 assert.doesNotMatch(html, /<header|<h1|aboutOpen"|about-trigger/);
 assert.match(html, /function close\(\)\{if\(videoRecording\|\|nanoAction\)return;if\(selected>=0\)viewerLast=\{index:selected,stored:activeStoredIndividual\};/);
 assert.match(html, /\$\('viewerReturn'\)\.onclick=returnToViewer;/);
 assert.match(html, /id="viewerPicMov"/);
 assert.match(html, /id="mediaChoiceDialog"/);
 assert.match(html, /if\(\$\('viewerSettings'\)\.open\)\$\('viewerSettings'\)\.open=false;else close\(\);/);
 assert.match(html, /#viewerPrevious\{left:calc\(8px \+ env\(safe-area-inset-left,0px\)\)\}/);
});

test('appearance controls preserve the current viewer mode', () => {
 assert.equal((html.match(/loadSpecimen\(selected,activeStoredIndividual,\{fullscreen:viewer\.full\}\)/g)||[]).length,1);
 assert.match(html, /viewerReturnFocus=document\.activeElement/);
 assert.match(html, /target\.focus\(\{preventScroll:true\}\)/);
});

test('startup shows a progress bar only, and hidden navigation moves the title to the top',()=>{
 assert.doesNotMatch(html, /bootDnaCanvas|boot-dna|morphospaceBootDNAComplete/);
 assert.match(html, /boot-action-slot/);
 assert.match(html, /\.overlay\.viewer-full\.viewer-nav-hidden \.viewer-brand\{\s*top:calc\(12px/);
 assert.match(html, /<div class="viewer-zoom"><span class="viewer-zoom-lens"/);
});

test('DNA startup displays the same build version as the home footer',()=>{
 const splash=html.match(/<div class="boot-version" aria-label="バージョン">(v\d+\.\d+\.\d+(?:\.\d+\.\d+)?)<\/div>/);
 const header=html.match(/<span class="version-label">(v\d+\.\d+\.\d+(?:\.\d+\.\d+)?)<\/span>/);
 assert.ok(splash,'loading splash must display the version without running JavaScript');
 assert.ok(header,'home version label must exist for the deploy stamper');
 assert.equal(splash[1],header[1]);
 assert.match(html, /#bootSplash \.boot-version\{[^}]*font-size:10px/);
});
