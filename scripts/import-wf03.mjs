#!/usr/bin/env node
/**
 * Import updated WF-03 workflow to n8n.
 *
 * Two modes:
 *
 *   Mode 1 — Via Supabase edge function proxy (requires admin login):
 *     node scripts/import-wf03.mjs --proxy <email> <password>
 *
 *   Mode 2 — Direct n8n API (requires API key):
 *     node scripts/import-wf03.mjs --direct <n8n-api-key>
 *     N8N_API_KEY=<key> node scripts/import-wf03.mjs --direct
 *
 * The script:
 * 1. Reads the local WF-03 JSON
 * 2. Fetches the current workflow ID from n8n (matching WF-03 by name)
 * 3. Updates (PUT) the workflow on n8n
 * 4. Re-activates the workflow if it was active before
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WF_JSON_PATH = resolve(__dirname, '../infra/n8n/workflows/WF-03-IA-Reescrita-Auditoria-Publicacao.json');

const SUPABASE_URL = 'https://xhpfxvoonpclonjyfimt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhocGZ4dm9vbnBjbG9uanlmaW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDE0NTQsImV4cCI6MjA5MTQxNzQ1NH0.N-bUCtsHz9bqcqa5QmoRlrOy7Vhxn0uhxRvRqaL1yPc';
const EDGE_PROXY_URL = `${SUPABASE_URL}/functions/v1/n8n-proxy`;
const N8N_DIRECT_URL = (process.env.N8N_BASE_URL || process.env.N8N_DIRECT_URL || 'https://n8n-vision7.onrender.com').replace(/\/$/, '');

const TARGET_WF_ID = '4ko3mYzK15Ioi7Vo';

function getWorkflowTimestamp(workflow) {
  const raw = workflow?.updatedAt || workflow?.createdAt || '';
  const parsed = raw ? Date.parse(raw) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickPreferredWorkflow(workflows) {
  const exact = workflows.find((workflow) => workflow.id === TARGET_WF_ID);
  if (exact) return exact;

  const matches = workflows.filter((workflow) => String(workflow.name ?? '').includes('WF-03'));
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  return [...matches].sort((a, b) => {
    const activeDelta = Number(b.active === true) - Number(a.active === true);
    if (activeDelta !== 0) return activeDelta;
    return getWorkflowTimestamp(b) - getWorkflowTimestamp(a);
  })[0];
}

// ── Auth ─────────────────────────────────────────────────────────────────────
async function login(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed (${res.status}): ${await res.text()}`);
  return (await res.json()).access_token;
}

// ── API callers ──────────────────────────────────────────────────────────────
async function callProxy(token, payload) {
  const res = await fetch(EDGE_PROXY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok && !body?.httpStatus) throw new Error(`Proxy HTTP ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

async function callDirect(apiKey, method, path, body) {
  const url = `${N8N_DIRECT_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(90_000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`n8n API ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

// ── Generic operations ───────────────────────────────────────────────────────
function makeApi(mode, credential) {
  if (mode === 'proxy') {
    return {
      get: (path) => callProxy(credential, { path, method: 'GET' }),
      put: (path, body) => callProxy(credential, { path, method: 'PUT', body }),
      post: (path, body) => callProxy(credential, { path, method: 'POST', body }),
    };
  }
  return {
    get: (path) => callDirect(credential, 'GET', path),
    put: (path, body) => callDirect(credential, 'PUT', path, body),
    post: (path, body) => callDirect(credential, 'POST', path, body),
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const modeFlag = args[0];

  let api;

  if (modeFlag === '--proxy') {
    const [email, password] = args.slice(1);
    if (!email || !password) {
      console.error('Usage: node scripts/import-wf03.mjs --proxy <email> <password>');
      process.exit(1);
    }
    console.log('🔐 Autenticando via Supabase...');
    const token = await login(email, password);
    console.log('✓ Login OK');
    api = makeApi('proxy', token);
  } else if (modeFlag === '--direct') {
    const apiKey = args[1] || process.env.N8N_API_KEY;
    if (!apiKey) {
      console.error('Usage: node scripts/import-wf03.mjs --direct <n8n-api-key>');
      console.error('       N8N_API_KEY=<key> node scripts/import-wf03.mjs --direct');
      process.exit(1);
    }
    console.log('🔑 Usando API key direta para n8n...');
    api = makeApi('direct', apiKey);
  } else {
    console.error('Usage:');
    console.error('  node scripts/import-wf03.mjs --proxy <email> <password>');
    console.error('  node scripts/import-wf03.mjs --direct <n8n-api-key>');
    console.error('  N8N_API_KEY=<key> node scripts/import-wf03.mjs --direct');
    process.exit(1);
  }

  // 1. Read local workflow JSON
  const localWf = JSON.parse(readFileSync(WF_JSON_PATH, 'utf-8'));
  console.log(`📁 Workflow local: "${localWf.name}" (${localWf.nodes.length} nodes)`);

  // 2. Get workflows from n8n to find matching WF-03
  console.log('🔍 Procurando WF-03 no n8n...');
  const wfList = await api.get('/api/v1/workflows?excludePinnedData=true');
  const workflows = Array.isArray(wfList) ? wfList : (wfList?.data ?? []);
  const existing = pickPreferredWorkflow(workflows);

  if (!existing) {
    console.error('❌ WF-03 não encontrado no n8n. Workflows disponíveis:');
    workflows.forEach((w) => console.log(`  - ${w.id}: ${w.name}`));
    process.exit(1);
  }

  const duplicates = workflows.filter((workflow) => String(workflow.name ?? '').includes('WF-03'));
  if (duplicates.length > 1) {
    console.log('ℹ️ Múltiplas cópias WF-03 encontradas; usando a preferida:');
    duplicates.forEach((workflow) => {
      console.log(`  - ${workflow.id}: ${workflow.name} active=${workflow.active} updatedAt=${workflow.updatedAt ?? '(n/a)'}`);
    });
  }

  console.log(`✓ Encontrado: id=${existing.id} name="${existing.name}" active=${existing.active}`);

  // 3. Get full workflow details (need versionId for update)
  const fullWf = await api.get(`/api/v1/workflows/${existing.id}`);
  const versionId = fullWf?.versionId ?? undefined;
  console.log(`  versionId: ${versionId ?? '(none)'}`);

  // 4. Build update payload
  const updatePayload = {
    name: localWf.name,
    nodes: localWf.nodes,
    connections: localWf.connections,
    settings: localWf.settings ?? {},
    pinData: localWf.pinData ?? {},
  };
  if (versionId) updatePayload.versionId = versionId;

  // 5. Update the workflow
  console.log('📤 Atualizando workflow no n8n...');
  const updateResult = await api.put(`/api/v1/workflows/${existing.id}`, updatePayload);

  if (updateResult?.id) {
    console.log(`✓ Workflow atualizado: id=${updateResult.id}`);
  } else {
    console.log('⚠ Resposta:', JSON.stringify(updateResult).slice(0, 500));
  }

  // 6. Re-activate if it was active
  if (existing.active) {
    console.log('🔄 Re-ativando workflow...');
    const activateResult = await api.post(`/api/v1/workflows/${existing.id}/activate`);
    console.log(`✓ Ativado: active=${activateResult?.active}`);
  }

  console.log('\n✅ Importação concluída com sucesso!');
  console.log('   Próxima execução automática: ~60 minutos (Schedule Trigger)');
  console.log('   Ou execute manualmente no dashboard de Automações.');
}

main().catch((err) => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
