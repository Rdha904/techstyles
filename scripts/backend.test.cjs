const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
require('./support/load-ts.cjs');

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'techstyles-test-'));
process.env.TECHSTYLES_DATA_DIR = path.join(temporary, 'data');
const store = require('../src/lib/store.ts');
const {repository} = require('../src/lib/repository.ts');
const validation = require('../src/lib/api.ts');
const uploads = require('../src/lib/uploads.ts');
function route(relative) {
  return require(path.join(__dirname, '../src/app/api', relative, 'route.ts'));
}
function jsonRequest(payload) { return new Request('http://localhost/api', {method:'POST',body:JSON.stringify(payload)}); }
after(() => fs.rmSync(temporary, {recursive:true,force:true}));

test('mutations persist and simultaneous requests do not lose changes', async () => {
  await Promise.all(Array.from({length:20}, (_, index) => repository.update('default', database => {
    database.products.push({...store.emptyProduct(),name:`Product ${index}`});
  })));
  const database = await repository.read('default');
  assert.equal(database.products.length,21);
  assert.equal(JSON.parse(fs.readFileSync(path.join(temporary,'data/workspace.json'),'utf8')).workspaces.default.products.length,21);
  await assert.rejects(repository.update('default', () => {throw new Error('abort');}));
  await repository.update('default', database => {store.findProduct(database,'demo-hoodie').name = 'Still works';});
  assert.equal(store.findProduct(await repository.read('default'),'demo-hoodie').name,'Still works');
});

test('snapshots are independent and omit access tokens and version history', () => {
  const product = store.emptyProduct();
  product.shareToken = 'secret';
  product.colors = [{id:'c',name:'Black',hex:'#000000'}];
  const snapshot = store.snapshot(product);
  snapshot.colors[0].name = 'White';
  assert.equal(product.colors[0].name,'Black');
  assert.equal('shareToken' in snapshot,false);
  assert.equal('versions' in snapshot,false);
});

test('validation rejects malformed nested rows and protects server fields', () => {
  assert.deepEqual(validation.productPatch({id:'replace-id',shareToken:'injected',name:'Valid'}),{name:'Valid'});
  assert.throws(() => validation.productPatch({name:''}));
  assert.throws(() => validation.productPatch({colors:[{id:'x',name:'X',hex:'red'}]}));
  assert.equal(validation.productPatch({colors:[{id:'x',name:'Blue',hex:'#1122ff',image:'/api/uploads/colorway.png'}]}).colors[0].image,'/api/uploads/colorway.png');
  assert.throws(() => validation.productPatch({colors:[{id:'x',name:'Blue',hex:'#1122ff',image:'https://example.com/image.png'}]}));
  assert.throws(() => validation.productPatch({annotations:[{id:'a',text:'x',x:101,y:1}]}));
  assert.throws(() => validation.productPatch({cover:'javascript:alert(1)'}));
  assert.deepEqual(validation.productPatch({measurements:[{id:'m',name:'Chest',tolerance:'1',values:{M:'60'}}]}).measurements[0].values,{M:'60'});
});

test('uploads inspect bytes and assign isolated random paths', async () => {
  assert.throws(() => uploads.detectFile(Buffer.from('<svg onload="evil()"/>')));
  const result = await uploads.saveUpload(Buffer.from([137,80,78,71,13,10,26,10]));
  assert.match(result.url,/^\/api\/uploads\/[0-9a-f-]{36}\.png$/);
  assert.equal(fs.existsSync(path.join(temporary,'data/uploads/default',path.basename(result.url))),true);
});

test('product API creates, versions, restores, shares live changes, revokes and deletes', async () => {
  const products = route('products');
  const productRoute = route('products/[id]');
  const versions = route('products/[id]/versions');
  const restore = route('products/[id]/versions/[versionId]/restore');
  const sharing = route('products/[id]/share');
  const shared = route('share/[token]');
  const created = await (await products.POST(jsonRequest({name:'API test'}))).json();
  const context = {params:Promise.resolve({id:created.id})};
  const saved = await (await versions.POST(jsonRequest({name:'Original'}),context)).json();
  await productRoute.PATCH(jsonRequest({name:'Edited'}),context);
  const share = await (await sharing.POST(jsonRequest({}),context)).json();
  const shareContext = {params:Promise.resolve({token:share.token})};
  const visible = await (await shared.GET(jsonRequest({}),shareContext)).json();
  assert.equal(visible.name,'Edited');
  assert.equal('shareToken' in visible,false);
  assert.equal('versions' in visible,false);
  const restored = await (await restore.POST(jsonRequest({}),{params:Promise.resolve({id:created.id,versionId:saved.versions[0].id})})).json();
  assert.equal(restored.name,'API test');
  assert.equal(restored.versions[0].name,'Before restore');
  assert.equal((await (await shared.GET(jsonRequest({}),shareContext)).json()).name,'API test');
  await sharing.DELETE(jsonRequest({}),context);
  assert.equal((await shared.GET(jsonRequest({}),shareContext)).status,404);
  await productRoute.DELETE(jsonRequest({}),context);
  assert.equal((await productRoute.GET(jsonRequest({}),context)).status,404);
});

test('new production fields validate and shared payload redacts excluded sections and comments', () => {
  assert.equal(store.emptyProduct().measurementUnit,'cm');
  assert.equal(validation.productPatch({measurementUnit:'in'}).measurementUnit,'in');
  assert.throws(() => validation.productPatch({measurementUnit:'mm'}));
  const patch = validation.productPatch({attachments:[{id:'a',name:'File',url:'/api/uploads/file.pdf'}],artworks:[],samples:[{id:'s',size:'M',color:'Black',quantity:2,status:'Requested'}],excludedSections:['attachments','samplings','bom','packaging','sketch'],archived:true,annotations:[{id:'m',text:'Width',x:0,y:20,x2:100,y2:20}]});
  assert.equal(patch.samples[0].quantity,2);
  assert.equal(patch.annotations[0].x2,100);
  assert.throws(() => validation.productPatch({samples:[{id:'s',size:'M',color:'Black',quantity:-1,status:'Requested'}]}));
  assert.throws(() => validation.productPatch({attachments:[{id:'a',name:'Bad',url:'/sites/techstyles/../../secret'}]}));
  const product = {...store.emptyProduct(),...patch,comments:[{id:'c',section:'overview',author:'Me',text:'Private',createdAt:'now'}],labels:'Private label',sketch:'/sites/techstyles/image.png'};
  const shared = require('../src/lib/share.ts').sharedProduct(product);
  assert.deepEqual(shared.attachments,[]); assert.deepEqual(shared.samples,[]); assert.deepEqual(shared.comments,[]);
  assert.equal(shared.labels,''); assert.equal(shared.sketch,'');
  assert.equal('shareToken' in shared,false);
});

test('AI requires a server key and generates/edits through mocked transport only', async () => {
  const generate = require('../src/lib/generate.ts').generateImage;
  const previous = process.env.OPENAI_API_KEY;
  try {
    delete process.env.OPENAI_API_KEY;
    await assert.rejects(generate({prompt:'Hoodie',kind:'sketch'},async()=>{throw new Error('Must not call');}),error=>error.status===503);
    process.env.OPENAI_API_KEY = 'unit-test-not-a-real-key';
    const png = Buffer.from([137,80,78,71,13,10,26,10]);
    const image = await generate({prompt:'Hoodie',kind:'sketch'},async(url,options)=>{
      assert.match(url,/images\/generations$/); assert.equal(JSON.parse(options.body).n,1);
      return Response.json({data:[{b64_json:png.toString('base64')}]});
    });
    await generate({prompt:'Keep construction',kind:'mockup',image:image.url},async(url,options)=>{
      assert.match(url,/images\/edits$/); assert.ok(options.body instanceof FormData);
      assert.ok(options.body.get('image[]') instanceof File);
      return Response.json({data:[{b64_json:png.toString('base64')}]});
    });
    await assert.rejects(generate({prompt:'Hoodie',kind:'mockup',image:'https://external.example/test.png'},async()=>{throw new Error('Must not call');}));
    const {emptyBrandProfile} = require('../src/lib/brand-types.ts');
    await repository.update('default', db=>{db.brandProfile={...emptyBrandProfile(),name:'Shared Studio',tone:'Direct and practical',revision:1};});
    await generate({prompt:'Hoodie',kind:'sketch',useBrandProfile:true},async(url,options)=>{
      assert.match(JSON.parse(options.body).prompt,/Shared Studio/);
      assert.match(JSON.parse(options.body).prompt,/Direct and practical/);
      return Response.json({data:[{b64_json:png.toString('base64')}]});
    });
  } finally { if (previous === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previous; }
});

test('workspaces are isolated and legacy single-workspace files are migrated', async () => {
  await repository.update('other', data => {data.products.push({...store.emptyProduct(),name:'Other brand',shareToken:'other-token'});});
  assert.equal((await repository.read('other')).products.length,1);
  assert.ok(!(await repository.read('default')).products.some(item => item.name === 'Other brand'));
  assert.equal((await repository.findProductByShareToken('other-token')).name,'Other brand');
  assert.equal(await repository.findProductByShareToken('missing'),null);
  const legacy = {products:[{...store.emptyProduct(),name:'Legacy'}],libraries:[],brandProfile:null};
  fs.writeFileSync(path.join(temporary,'data/workspace.json'),JSON.stringify(legacy));
  assert.equal((await repository.read('default')).products[0].name,'Legacy');
});

test('uploads are scoped per workspace and legacy flat files stay with the default workspace', async () => {
  const {fileStorage} = require('../src/lib/file-storage.ts');
  const name = '11111111-1111-1111-1111-111111111111.png';
  await fileStorage.save('brand-a', name, Buffer.from('a'));
  assert.equal((await fileStorage.read('brand-a', name)).toString(), 'a');
  assert.equal(await fileStorage.read('brand-b', name), null);
  const legacy = '22222222-2222-2222-2222-222222222222.png';
  fs.mkdirSync(path.join(temporary,'data/uploads'),{recursive:true});
  fs.writeFileSync(path.join(temporary,'data/uploads',legacy), 'old');
  assert.equal((await fileStorage.read('default', legacy)).toString(), 'old');
  assert.equal(await fileStorage.read('brand-a', legacy), null);
  await assert.rejects(fileStorage.read('../x', name));
  await assert.rejects(fileStorage.read('default', '../../etc/passwd'));
});
