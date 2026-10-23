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
 assert.match(html, /id="viewerFullscreen"[^>]*>鑑賞へ<\/button>/);
 assert.match(html, /textContent=full\?'詳細':'鑑賞へ'/);
 assert.match(html, /id="close"[^>]*aria-label="生体一覧へ戻る"[^>]*>← 一覧<\/button>/);
 assert.match(html, /if\(\$\('viewerSettings'\)\.open\)\$\('viewerSettings'\)\.open=false;else close\(\);/);
 assert.match(html, /#viewerPrevious\{left:calc\(8px \+ env\(safe-area-inset-left,0px\)\)\}/);
});

test('appearance controls preserve the current viewer mode', () => {
 assert.equal((html.match(/loadSpecimen\(selected,activeStoredIndividual,\{fullscreen:viewer\.full\}\)/g)||[]).length,2);
 assert.match(html, /viewerReturnFocus=document\.activeElement/);
 assert.match(html, /target\.focus\(\{preventScroll:true\}\)/);
});
