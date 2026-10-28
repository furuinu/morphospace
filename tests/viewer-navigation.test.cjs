'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');

test('atlas and stock specimens default to immersive viewing', () => {
 assert.match(html, /function loadSpecimen\(i,stored=null,\{fullscreen=true\}=\{\}\)/);
 assert.match(html, /viewerMetadata\(\);if\(fullscreen\)setViewerFullscreen\(true\);else render\(\);/);
 assert.equal((html.match(/item\.addEventListener\('click',\(\)=>\{try\{loadSpecimen\(i\)/g) || []).length, 2);
 assert.match(html, /loadSpecimen\(0,saved\)/);
});

test('inspector and list navigation remain available from full-screen', () => {
 assert.match(html, /id="viewerFullscreen"[^>]*>詳細を開く<\/button>/);
 assert.match(html, /textContent=full\?'詳細を開く':'鑑賞に戻る'/);
 assert.match(html, /id="close"[^>]*aria-label="生体一覧へ戻る"[^>]*>[\s\S]*?<\/svg><\/button>/);
 assert.match(html, /id="viewerDetailFold"/);
 assert.match(html, /id="viewerAboutOpen"/);
 assert.match(html, /id="viewerPicMov"/);
 assert.match(html, /id="mediaChoiceDialog"/);
 assert.match(html, /if\(\$\('viewerSettings'\)\.open\)\$\('viewerSettings'\)\.open=false;else close\(\);/);
 assert.match(html, /#viewerPrevious\{left:calc\(8px \+ env\(safe-area-inset-left,0px\)\)\}/);
});

test('appearance controls preserve the current viewer mode', () => {
 assert.equal((html.match(/loadSpecimen\(selected,activeStoredIndividual,\{fullscreen:viewer\.full\}\)/g)||[]).length,2);
 assert.match(html, /viewerReturnFocus=document\.activeElement/);
 assert.match(html, /target\.focus\(\{preventScroll:true\}\)/);
});

test('DNA startup uses a spatial canvas, and hidden navigation moves the title to the top',()=>{
 assert.match(html, /id="bootDnaCanvas" class="boot-dna"/);
 assert.match(html, /window\.morphospaceBootDNAComplete/);
 assert.match(html, /boot-action-slot/);
 assert.match(html, /\.overlay\.viewer-full\.viewer-nav-hidden \.viewer-brand\{\s*top:calc\(12px/);
 assert.match(html, /<div class="viewer-zoom"><span class="viewer-zoom-lens"/);
});
