import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  const [state, setState] = useState({ kind: 'idle', message: '' });

  async function checkConnection() {
    setState({ kind: 'loading', message: 'Checking the server and database…' });
    try {
      const response = await fetch('/api/prep-status');
      const result = await response.json();
      setState({
        kind: response.ok && result.ok ? 'success' : 'error',
        message: result.message || 'No response message was returned.'
      });
    } catch {
      setState({ kind: 'error', message: 'The server could not be reached.' });
    }
  }

  return (
    <main className="page">
      <section className="panel" aria-labelledby="page-title">
        <p className="kicker">Team connection rehearsal</p>
        <h1 id="page-title">One click through the full stack.</h1>
        <p className="intro">
          This temporary practice screen checks React, Express, Supabase, and Render before the problem statement arrives.
        </p>
        <button type="button" onClick={checkConnection} disabled={state.kind === 'loading'}>
          {state.kind === 'loading' ? 'Checking…' : 'Check Supabase connection'}
        </button>
        <p className={`result result--${state.kind}`} role="status" aria-live="polite">
          {state.message || 'Ready when you are.'}
        </p>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
