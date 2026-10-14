const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');require('./support/load-ts.cjs');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'techstyles-brand-book-test-'));
process.env.TECHSTYLES_DATA_DIR=path.join(temporary,'data');
function route(relative){
 return require(path.join(__dirname,'../src/app/api',relative,'route.ts'));
}
const {repository}=require('../src/lib/repository.ts');
const types=require('../src/lib/brand-types.ts');
const brand=require('../src/lib/brand.ts');
const book=route('brand-book');const share=route('brand-book/share');const shared=route('share/brand-book/[token]');
after(()=>fs.rmSync(temporary,{recursive:true,force:true}));
const put=(data)=>book.PUT(new Request('http://localhost/api/brand-book',{method:'PUT',body:JSON.stringify(data)}));
const view=(token)=>shared.GET(new Request('http://localhost'),{params:Promise.resolve({token})});
const image=(n)=>`/api/uploads/0000000${n}-0000-0000-0000-000000000000.png`;

test('brand book requires a saved profile to publish and starts empty',async()=>{
 const data=await (await book.GET()).json();
 assert.equal(data.profile,null);assert.deepEqual(data.book,types.emptyBrandBook());
 assert.equal((await share.POST()).status,400);
});
test('brand book image settings are validated and limited to seven images',async()=>{
 assert.equal((await put({coverUrl:'javascript:alert(1)',imageUrls:[]})).status,400);
 assert.equal((await put({coverUrl:'',imageUrls:['https://example.com/a.png']})).status,400);
 assert.equal((await put({coverUrl:'',imageUrls:[1,2,3,4,5,6,7,8].map(image)})).status,400);
 const response=await put({coverUrl:image(1),imageUrls:[image(2),image(2),image(3)]});
 assert.equal(response.status,200);
 const saved=(await response.json()).book;
 assert.equal(saved.coverUrl,image(1));assert.deepEqual(saved.imageUrls,[image(2),image(3)]);assert.ok(saved.updatedAt);
});
test('published brand book is read-only, omits private data and stops working when unpublished',async()=>{
 await repository.update('default',data=>{data.brandProfile={...types.emptyBrandProfile(),name:'North Studio',tone:'Calm',evidence:[{field:'tone',value:'Calm',source:'brief.txt',excerpt:'Calm'}],revision:3};});
 const {token,url}=await (await share.POST()).json();
 assert.match(token,/^[0-9a-f]{48}$/);assert.equal(url,`/share/brand-book/${token}`);
 assert.equal((await (await share.POST()).json()).token,token);
 const published=await (await view(token)).json();
 assert.equal(published.profile.name,'North Studio');assert.equal(published.profile.tone,'Calm');
 assert.equal('evidence' in published.profile,false);assert.equal('revision' in published.profile,false);
 assert.equal('shareToken' in published.book,false);assert.deepEqual(published.book.imageUrls,[image(2),image(3)]);
 assert.equal((await view('wrong')).status,404);
 assert.equal((await share.DELETE()).status,200);
 assert.equal((await view(token)).status,404);
 assert.equal((await repository.read('default')).brandBook.coverUrl,image(1));
});
test('published view helper does not mutate the stored profile',()=>{
 const profile={...types.emptyBrandProfile(),name:'A',evidence:[{field:'name',value:'A',source:'s',excerpt:'A'}]};
 brand.publishedBrandBook(profile,types.emptyBrandBook());
 assert.equal(profile.evidence.length,1);
});
