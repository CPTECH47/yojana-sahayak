import test from 'node:test';
import assert from 'node:assert/strict';
import { createSchemeDiscovery } from './scheme-discovery.mjs';
import { filterApprovedPassages, loadPassages, passageDigest } from './corpus.mjs';
import { createWhatsAppConversation } from './whatsapp-flow.mjs';
import { createAnswerService } from './answer-service.mjs';

const reviewed=loadPassages();
const answers=createAnswerService({passages:reviewed,model:async()=>({fact_ids:[]})});

test('local model can select multiple reviewed source leads without writing claims',async()=>{
  const seen=[];
  const discovery=createSchemeDiscovery({getPassages:()=>reviewed,getCandidates:()=>[],model:async(messages)=>{
    const list=JSON.parse(messages[1].content).excerpts;seen.push(...list);
    return {evidence_ids:[list.find(x=>x.scheme_id==='pm-kisan').evidence_id,list.find(x=>x.scheme_id==='pmuy').evidence_id]};
  }});
  const result=await discovery.discover({description:'I am a woman farmer with my family',role:'farmer'});
  assert.deepEqual(result.leads.map(lead=>lead.scheme_id),['pm-kisan','pmuy']);
  assert.equal(result.leads.every(lead=>lead.status==='information_lead' && lead.source.url.startsWith('https://')),true);
  assert.equal(seen.some(x=>x.scheme_id==='pmuy'),true);
});

test('new approved scheme is discoverable without adding a hard-coded scheme alias',async()=>{
  const source={id:'demo-source',scheme_id:'new-farmer-scheme',title:'New Farmer Scheme official note',authority:'Official test ministry',url:'https://example.gov.in/note',status:'approved',snapshot_sha256:'a'.repeat(64),passage_hashes:{}};
  const passage={id:'demo-source:1',document_id:source.id,scheme_id:source.scheme_id,title:source.title,authority:source.authority,url:source.url,published_at:'2026-10-31',verified_at:'2026-10-31',snapshot_sha256:source.snapshot_sha256,locator:'section 1',text:'The new scheme provides information for farmers. Check all official requirements before applying.'};
  source.passage_hashes[passage.id]=passageDigest(passage);
  const approved=filterApprovedPassages([passage],[source],new Date('2026-10-31T00:00:00Z'));
  const discovery=createSchemeDiscovery({getPassages:()=>approved,getCandidates:()=>[],model:async()=>({evidence_ids:[passage.id]})});
  const result=await discovery.discover({description:'I am a farmer',role:'farmer'});
  assert.equal(result.leads[0].name,source.title);
  assert.equal(result.leads[0].status,'information_lead');
});

test('candidate or expired documents cannot become leads; invented model IDs are rejected',async()=>{
  const passage={id:'bad:1',document_id:'bad',scheme_id:'bad-scheme',title:'Bad',authority:'Official test',url:'https://example.gov.in/bad',published_at:null,verified_at:'2026-10-31',snapshot_sha256:'b'.repeat(64),locator:'section 1',text:'Farmers and farming families'};
  const source={id:'bad',scheme_id:'bad-scheme',title:passage.title,authority:passage.authority,url:passage.url,status:'needs_review',snapshot_sha256:passage.snapshot_sha256,passage_hashes:{[passage.id]:passageDigest(passage)}};
  const approved=filterApprovedPassages([passage],[source],new Date('2026-10-31T00:00:00Z'));
  assert.equal(approved.length,0);
  const expired=filterApprovedPassages([passage],[{...source,status:'approved',valid_until:'2026-10-30'}],new Date('2026-10-31T00:00:00Z'));
  assert.equal(expired.length,0);
  const none=await createSchemeDiscovery({getPassages:()=>approved,getCandidates:()=>[],model:async()=>({evidence_ids:[passage.id]})}).discover({description:'farmer',role:'farmer'});
  assert.deepEqual(none.leads,[]);
  const invalid=await createSchemeDiscovery({getPassages:()=>reviewed,getCandidates:()=>[],model:async()=>({evidence_ids:['made-up:1']})}).discover({description:'farmer',role:'farmer'});
  assert.equal(invalid.leads.every(lead=>reviewed.some(p=>p.id===lead.source.evidence_id)),true);
  assert.equal(invalid.leads.some(lead=>lead.scheme_id==='made-up'),false);
});

test('confirmed profile shows cited cross-scheme leads before the remaining question',async()=>{
  const discoverSchemes=async()=>({leads:[{scheme_id:'pm-kisan',name:'PM-KISAN',status:'information_lead',source:{title:'PM-KISAN guidelines',locator:'page 2',url:'https://pmkisan.gov.in/a'}},{scheme_id:'pmuy',name:'PMUY',status:'information_lead',source:{title:'PMUY FAQ',locator:'Q1',url:'https://pmuy.gov.in/faq.html'}}]});
  const flow=createWhatsAppConversation({answers,discoverSchemes,extractProfile:async()=>({role:'farmer',income_amount:null,income_period:null,facts:{}})});
  await flow.handle('lead','START');await flow.handle('lead','I am a woman farmer');
  const response=await flow.handle('lead','1');
  assert.match(response,/not confirmed eligibility[\s\S]*PMUY[\s\S]*PM-KISAN/u);
  assert.match(response,/pmuy.gov.in\/faq.html/u);
  assert.match(response,/1\/4.*land/u);
});

test('automatic official discovery is displayed only as an under-review lead',async()=>{
  const item={status:'needs_review',kind:'new_source',scheme_id:'pmfby',title:'PMFBY farmer crop insurance',summary:'Official information for farmers and crop insurance.',url:'https://www.pib.gov.in/PressReleasePage.aspx?PRID=123',snapshot_sha256:'a'.repeat(64),discovered_at:'2026-10-31T00:00:00Z'};
  const discovery=createSchemeDiscovery({getPassages:()=>reviewed,getCandidates:()=>[item,{...item,url:'https://evil.example/article',scheme_id:'evil'},{...item,title:'Public Liability Insurance for LPG Consumers',scheme_id:'not-a-scheme',url:'https://pmuy.gov.in/documents/insurance.pdf'}],model:async()=>({evidence_ids:[]})});
  const result=await discovery.discover({description:'I am a farmer',role:'farmer'});
  assert.deepEqual(result.leads,[]);
  assert.equal(result.pending.length,1);
  assert.equal(result.pending[0].status,'under_review');
  assert.equal(result.pending[0].scheme_id,'pmfby');
});
