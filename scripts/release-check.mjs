import {loadPassages} from '../server/corpus.mjs';
import {supportedRecords} from '../server/verified-facts.mjs';
const option=process.argv.find(v=>v.startsWith('--date='));
const now=option?new Date(option.slice(7)+'T06:00:00Z'):new Date();
try {
 const passages=loadPassages(now),documents=new Set(passages.map(p=>p.document_id)).size;
 const records=supportedRecords(passages);
 const result={as_of:now.toISOString(),usable_documents:documents,required_documents:10,
   available_schemes:[...new Set(passages.map(p=>p.scheme_id))],usable_answer_records:records.length,
   corpus_gate:documents>=10?'pass':'blocked_source_review_required',
   live_model_and_phone:'not_verified_by_this_command'};
 console.log(JSON.stringify(result,null,2));
 if(documents<10 || !records.length)process.exitCode=1;
}catch{console.error('Release check failed: corpus or pinned facts unavailable');process.exitCode=1;}
