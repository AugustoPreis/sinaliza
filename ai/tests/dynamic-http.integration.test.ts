import { afterAll, beforeAll, expect, it } from 'vitest';
import { createClassificationServer } from '../src/http/server.js';
import type { Server } from 'node:http';
let server: Server;
let url: string;
const token = 'dynamic-local-test-token-'.repeat(2);
const id = '40000000-0000-4000-8000-000000000001';
beforeAll(async () => {
 server=await createClassificationServer({ AI_MODE:'dynamic',AI_SERVICE_TOKEN:token, NODE_ENV:'production' });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 url=`http://127.0.0.1:${(server.address() as {port:number}).port}/classification/preview`;
},120000);
afterAll(async()=>{ if (server) { server.closeAllConnections(); await new Promise<void>(r=>server.close(()=>r())); } });
async function post(body: unknown) {
 const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify(body)});
 return {status:response.status,body:await response.json() as { sector_id:string|null; classification:{requires_review:boolean} }};
}
it('uses newly supplied UUIDs and changed descriptions with the actual local encoder',async()=>{
 const description='Preciso solicitar férias do meu trabalho';
 const old={id,name:'Consertar projetores e computadores',categories:['cabos HDMI']};
 const unrelated=await post({description,candidates:[old]});
 const added={id:'40000000-0000-4000-8000-000000000002',name:description,categories:[]};
 const result=await post({description,candidates:[old,added]});
 expect(result.status).toBe(200);expect(result.body.sector_id).toBe(added.id);
 const updated=await post({description,candidates:[{...old,name:description,categories:[]}]});
 expect(updated.body.sector_id).toBe(id);
 // Both candidates now mean the same thing: no alphabetic choice.
 const ambiguous=await post({description,candidates:[{...old,name:description,categories:[]},added]});
 expect(ambiguous.body.sector_id).toBeNull();expect(ambiguous.body.classification.requires_review).toBe(true);
 expect(unrelated.status).toBe(200);
},120000);
it('validates candidates, empty descriptions and authorization',async()=>{
 expect((await post({description:'  ',candidates:[]})).status).toBe(400);
 expect((await post({description:'texto de teste',candidates:[]})).status).toBe(400);
 expect((await post({description:'texto de teste',candidates:[{id:'fake',name:'Setor',categories:[]}]})).status).toBe(400);
 expect((await fetch(url,{method:'POST'})).status).toBe(401);
});
it('abstains when a missing topic only weakly resembles a sparse real catalog',async()=>{
 const candidates=[
  {id,name:'Homologação local - Recursos Humanos',categories:['férias de funcionários','folha de pagamento','contracheque']},
  {id:'40000000-0000-4000-8000-000000000002',name:'Homologação local - Astronomia Quântica',categories:['interferometria quântica','fótons emaranhados','óptica quântica astronômica']},
 ];
 const boleto=await post({description:'meu boleto da mensalidade venceu e preciso emitir a segunda via',candidates});
 expect(boleto.status).toBe(200);
 expect(boleto.body.sector_id).toBeNull();
 expect(boleto.body.classification.requires_review).toBe(true);
 const rh=await post({description:'Preciso corrigir meu contracheque e conferir a folha de pagamento',candidates});
 expect(rh.body.sector_id).toBe(id);
 expect(rh.body.classification.requires_review).toBe(false);
 const astronomy=await post({description:'Preciso analisar interferometria quântica e fótons emaranhados',candidates});
 expect(astronomy.body.sector_id).toBe(candidates[1]!.id);
 expect(astronomy.body.classification.requires_review).toBe(false);
},120000);
