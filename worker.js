// Cloudflare Worker — Backend API pre Budget App
// Pracuje s D1 databázou, jednoduchá auth cez heslo v hlavičke

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Password',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function checkAuth(request, env) {
  const password = request.headers.get('X-Auth-Password');
  return password === env.APP_PASSWORD;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Login endpoint
    if (path === '/api/login' && request.method === 'POST') {
      const { password } = await request.json();
      if (password === env.APP_PASSWORD) {
        return json({ ok: true });
      }
      return json({ ok: false, error: 'Nesprávne heslo' }, 401);
    }

    // Všetko ostatné vyžaduje auth
    if (path.startsWith('/api/') && !checkAuth(request, env)) {
      return json({ error: 'Unauthorized' }, 401);
    }

    try {
      // === ACCOUNTS ===
      if (path === '/api/accounts' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM accounts ORDER BY id').all();
        return json(results);
      }

      if (path === '/api/accounts' && request.method === 'POST') {
        const { name, balance } = await request.json();
        const result = await env.DB.prepare(
          'INSERT INTO accounts (name, balance) VALUES (?, ?)'
        ).bind(name, balance || 0).run();
        return json({ id: result.meta.last_row_id, name, balance });
      }

      if (path.match(/^\/api\/accounts\/(\d+)$/) && request.method === 'DELETE') {
        const id = path.split('/').pop();
        await env.DB.prepare('DELETE FROM accounts WHERE id = ?').bind(id).run();
        return json({ ok: true });
      }

      // === TRANSACTIONS ===
      if (path === '/api/transactions' && request.method === 'GET') {
        const { results } = await env.DB.prepare(
          'SELECT * FROM transactions ORDER BY date DESC, id DESC'
        ).all();
        return json(results);
      }

      if (path === '/api/transactions' && request.method === 'POST') {
        const t = await request.json();
        const result = await env.DB.prepare(
          `INSERT INTO transactions (date, account_id, category, payee, amount, receipt_id, receipt_url, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          t.date, t.account_id, t.category, t.payee, t.amount,
          t.receipt_id || null, t.receipt_url || null, t.notes || null
        ).run();

        // Aktualizuj zostatok účtu
        await env.DB.prepare(
          'UPDATE accounts SET balance = balance + ? WHERE id = ?'
        ).bind(t.amount, t.account_id).run();

        return json({ id: result.meta.last_row_id, ...t });
      }

      if (path.match(/^\/api\/transactions\/(\d+)$/) && request.method === 'DELETE') {
        const id = path.split('/').pop();
        // Vráť sumu späť na účet
        const tx = await env.DB.prepare(
          'SELECT amount, account_id FROM transactions WHERE id = ?'
        ).bind(id).first();
        if (tx) {
          await env.DB.prepare(
            'UPDATE accounts SET balance = balance - ? WHERE id = ?'
          ).bind(tx.amount, tx.account_id).run();
          await env.DB.prepare('DELETE FROM transactions WHERE id = ?').bind(id).run();
        }
        return json({ ok: true });
      }

      // === ENVELOPES ===
      if (path === '/api/envelopes' && request.method === 'GET') {
        const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);
        const { results } = await env.DB.prepare(
          'SELECT * FROM envelopes WHERE month = ? ORDER BY category'
        ).bind(month).all();
        return json(results);
      }

      if (path === '/api/envelopes' && request.method === 'POST') {
        const { category, budgeted, month } = await request.json();
        await env.DB.prepare(
          `INSERT INTO envelopes (category, budgeted, month) VALUES (?, ?, ?)
           ON CONFLICT(category, month) DO UPDATE SET budgeted = excluded.budgeted`
        ).bind(category, budgeted, month).run();
        return json({ ok: true });
      }

      // === RECURRING ===
      if (path === '/api/recurring' && request.method === 'GET') {
        const { results } = await env.DB.prepare(
          'SELECT * FROM recurring WHERE active = 1 ORDER BY next_date'
        ).all();
        return json(results);
      }

      if (path === '/api/recurring' && request.method === 'POST') {
        const r = await request.json();
        const result = await env.DB.prepare(
          `INSERT INTO recurring (name, amount, frequency, next_date, category, account_id)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(r.name, r.amount, r.frequency || 'mesačne', r.next_date, r.category, r.account_id || 1).run();
        return json({ id: result.meta.last_row_id, ...r });
      }

      if (path.match(/^\/api\/recurring\/(\d+)$/) && request.method === 'DELETE') {
        const id = path.split('/').pop();
        await env.DB.prepare('UPDATE recurring SET active = 0 WHERE id = ?').bind(id).run();
        return json({ ok: true });
      }

      return json({ error: 'Not found' }, 404);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  },
};
