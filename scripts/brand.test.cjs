const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const ts=require('typescript');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'techstyles-brand-test-'));
process.env.TECHSTYLES_DATA_DIR=path.join(temporary,'data');
fs.symlinkSync(path.resolve(__dirname,'../node_modules'),path.join(temporary,'node_modules'),'dir');
for(const name of ['store','api','uploads','brand-types','brand','safe-web','brand-import']) {
 const source=fs.readFileSync(path.join(__dirname,'../src/lib',`${name}.ts`),'utf8');
 fs.writeFileSync(path.join(temporary,`${name}.js`),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);
}
const types=require(path.join(temporary,'brand-types.js'));
const brand=require(path.join(temporary,'brand.js'));
const imports=require(path.join(temporary,'brand-import.js'));
const safe=require(path.join(temporary,'safe-web.js'));
const store=require(path.join(temporary,'store.js'));
const source=fs.readFileSync(path.join(__dirname,'../src/app/api/brand-profile/route.ts'),'utf8').replace(/(['"])@\/lib\//g,'$1./');
fs.writeFileSync(path.join(temporary,'route.js'),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);
const route=require(path.join(temporary,'route.js'));
after(()=>fs.rmSync(temporary,{recursive:true,force:true}));
const request=(data)=>new Request('http://localhost/api/brand-profile',{method:'PUT',body:JSON.stringify(data)});
test('legacy workspace remains compatible; saving requires review and rejects stale revisions',async()=>{
 const before=await store.getDatabase();assert.equal((await (await route.GET()).json()).profile,null);
 const draft={...types.emptyBrandProfile(),name:'North Studio',colors:['#123456']};
 assert.equal((await route.PUT(request(draft))).status,400);
 const response=await route.PUT(request({...draft,reviewed:true}));assert.equal(response.status,200);
 const saved=(await response.json()).profile;assert.equal(saved.revision,1);
 assert.equal((await route.PUT(request({...draft,reviewed:true}))).status,409);
 assert.equal((await store.getDatabase()).products.length,before.products.length);
 assert.equal((await (await route.GET()).json()).profile.name,'North Studio');
 assert.match(brand.brandContext(saved),/North Studio/);
});
test('strict brand validation permits unknowns but rejects unsafe assets and drops stale evidence',()=>{
 const base={...types.emptyBrandProfile(),name:'Verified brand'};
 assert.equal(brand.validateBrand(base).audience,'');
 assert.throws(()=>brand.validateBrand({...base,logo:{name:'Unsafe',url:'javascript:alert(1)'}}));
 assert.throws(()=>brand.validateBrand({...base,colors:['red']}));
 assert.throws(()=>brand.validateBrand({...base,website:'file:///etc/passwd'}));
 const parsed=brand.validateBrand({...base,description:'Edited',evidence:[{field:'description',value:'Old',source:'brief.txt',excerpt:'Old'}]});assert.equal(parsed.evidence.length,0);
});
test('website extraction uses actual evidence and does not invent brand strategy',()=>{
 const html='<html><head><title>North Studio</title><meta name="description" content="Apparel made in small batches"><style>:root {--brand-color:#123456;} h1 {font-family:"Figtree",sans-serif;color:#abc}</style></head><body><h2>Brand values</h2><p>Repair and reuse</p><img src="/logo.png" alt="North logo"></body></html>';
 const {result,images}=imports.extractHtml(html,'https://example.com/');
 assert.ok(result.suggestions.some(s=>s.field==='description'&&s.value==='Apparel made in small batches'));
 assert.ok(result.suggestions.some(s=>s.field==='values'&&s.value==='Repair and reuse'));
 assert.ok(result.suggestions.some(s=>s.field==='colors'&&s.value==='#AABBCC'));
 assert.ok(result.suggestions.some(s=>s.field==='fonts'&&s.value==='Figtree'));
 assert.equal(result.suggestions.some(s=>s.field==='audience'||s.field==='positioning'||s.field==='tone'),false);
 assert.equal(images[0].field,'logo');
 assert.ok(result.suggestions.every(s=>s.source&&s.excerpt));
});
test('file extraction stays a draft and accepts explicitly labeled text and JSON',async()=>{
 const before=await store.getDatabase();
 const result=await imports.importFiles([new File(['Brand name: Field Studio\nTarget audience: Trail runners\nTone of voice: Clear and practical'], 'brief.txt'),new File([JSON.stringify({colors:['#abcdef'],fonts:['Inter']})],'palette.json')]);
 assert.ok(result.suggestions.some(s=>s.field==='audience'&&s.value==='Trail runners'));
 assert.ok(result.suggestions.some(s=>s.field==='colors'&&s.value==='#ABCDEF'));
 assert.deepEqual((await store.getDatabase()).brandProfile,before.brandProfile);
 const noEvidence=imports.extractText('We sell jackets.','unknown.txt');assert.equal(noEvidence.suggestions.length,0);assert.ok(noEvidence.warnings.length);
});
test('URL guard blocks local, credentialed and non-HTTPS targets',async()=>{
 for(const url of ['http://example.com','https://user:secret@example.com','https://localhost','https://example.com:444'])assert.throws(()=>safe.websiteUrl(url));
 for(const ip of ['127.0.0.1','10.2.3.4','169.254.169.254','172.16.1.1','192.168.2.1','100.100.100.200','::1','::ffff:127.0.0.1','fc00::1'])assert.equal(safe.publicAddress(ip),false,ip);
 assert.equal(safe.publicAddress('8.8.8.8'),true);
 await assert.rejects(safe.readPublicUrl('https://127.0.0.1/'));
});
function pdf(text){
 const stream=`BT /F1 12 Tf 50 750 Td (${text}) Tj ET`;
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
 let out='%PDF-1.4\n';const offsets=[0];objects.forEach((obj,i)=>{offsets.push(out.length);out+=`${i+1} 0 obj\n${obj}\nendobj\n`;});const start=out.length;out+=`xref\n0 6\n0000000000 65535 f \n`;offsets.slice(1).forEach(offset=>out+=String(offset).padStart(10,'0')+' 00000 n \n');out+=`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;return Buffer.from(out);
}
test('PDF upload extracts real text, not invented details',async()=>{
 const result=await imports.importFiles([new File([pdf('Brand name: PDF Studio')],'brand.pdf',{type:'application/pdf'})]);
 assert.ok(result.suggestions.some(s=>s.field==='name'&&s.value==='PDF Studio'),JSON.stringify(result));
 assert.equal(result.suggestions.some(s=>s.field==='audience'),false);
});
