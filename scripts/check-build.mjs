import {readFile,readdir,stat} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
const root='dist';
const html=await readFile(path.join(root,'index.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){const uri=match[1];assert(uri.startsWith('./'),`Nonportable asset: ${uri}`);await stat(path.join(root,uri));}
const manifest=JSON.parse(await readFile(path.join(root,'manifest.webmanifest'),'utf8'));
assert.equal(manifest.start_url,'./');assert.equal(manifest.display,'standalone');for(const icon of manifest.icons)await stat(path.join(root,icon.src));
for(const asset of ['worker.min.js','tesseract-core-lstm.wasm.js','tesseract-core-simd-lstm.wasm.js','tesseract-core-lstm.wasm','tesseract-core-simd-lstm.wasm','eng.traineddata.gz','fra.traineddata.gz'])await stat(path.join(root,'ocr',asset));
const bundle=(await Promise.all((await readdir(path.join(root,'assets'))).filter(f=>f.endsWith('.js')).map(f=>readFile(path.join(root,'assets',f),'utf8')))).join('');
for(const testText of ['meal-breakfast','restore-14-a','2026-11-15T17:00:00Z','My usual homemade lunch'])assert(!bundle.includes(testText),'Fixture leaked into production');
assert(!html.includes('service-worker'));console.log('PASS: relative build assets, manifest/icons, bundled OCR resources, no test fixtures in runtime.');
