import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAnswerService } from './answer-service.mjs';
import { loadPassages } from './corpus.mjs';

const app = express();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 3000);
const answers = createAnswerService();
app.use(express.json({ limit: '32kb' }));

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, service: 'yojana-sahayak', corpus_documents: new Set(loadPassages().map(p => p.document_id)).size });
});

app.post('/api/chat', async (request, response) => {
  try {
    const result = await answers.chat(request.body);
    response.status(result.status === 'invalid_request' ? 400 : 200).json(result);
  } catch (error) {
    console.error('Chat failed:', error instanceof Error ? error.message : 'unknown error');
    response.status(503).json({ status: 'error', reason_code: 'answer_service_unavailable', answer_text: 'The answer service is unavailable. Please try again.', citations: [] });
  }
});

app.post('/api/recommend', (request, response) => {
  const result = answers.recommend(request.body);
  response.status(result.status === 'invalid_request' ? 400 : 200).json(result);
});

app.get('/api/prep-status', async (_request, response) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return response.status(503).json({ ok: false, message: 'Supabase variables are not configured yet.' });
  }

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase
      .from('hackathon_prep')
      .select('message')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Supabase prep read failed:', error.code || error.message);
      return response.status(502).json({ ok: false, message: 'Supabase read failed. Check the setup guide and service logs.' });
    }

    return response.json({ ok: true, message: data.message });
  } catch (error) {
    console.error('Supabase connection failed:', error instanceof Error ? error.message : 'unknown error');
    return response.status(502).json({ ok: false, message: 'Supabase connection failed. Check the hosting service network and variables.' });
  }
});

app.use(express.static(path.join(root, 'dist')));
app.use((request, response) => {
  if (request.path.startsWith('/api/')) {
    return response.status(404).json({ ok: false, message: 'Unknown API route.' });
  }
  return response.sendFile(path.join(root, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Yojana Sahayak listening on port ${port}`);
});
