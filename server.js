/**
 * server.js — AI Assistant Backend
 * ──────────────────────────────────
 * • Builds / hot-reloads the knowledge base from every HTML file.
 * • Exposes POST /api/chat  that performs RAG with GPT-5.2 Pro via OpenRouter.
 * • Watches for new / changed HTML files and auto-rebuilds.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');
const OpenAI = require('openai');
const { build, OUTPUT } = require('./scripts/build-knowledge-base');

// ── Config ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY) {
  console.error('❌  OPENROUTER_API_KEY is missing. Add it to .env');
  process.exit(1);
}

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: API_KEY,
});

// Model fallback chain — tries each in order until one responds.
// To use a paid model, put it first:  e.g. 'openai/gpt-5.2-pro'
const MODELS = [
  'openai/gpt-oss-120b:free',
  'openai/gpt-oss-20b:free',
  'qwen/qwen3-coder:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'stepfun/step-3.5-flash:free',
  'upstage/solar-pro-3:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'google/gemma-3-27b-it:free',
  'google/gemma-3-12b-it:free',
  'google/gemma-3n-e4b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'nvidia/nemotron-nano-9b-v2:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'qwen/qwen3-4b:free',
  'z-ai/glm-4.5-air:free',
];

// ── Knowledge base in memory ────────────────────────────────────────
let knowledgeBase = [];

function loadKnowledgeBase() {
  if (fs.existsSync(OUTPUT)) {
    knowledgeBase = JSON.parse(fs.readFileSync(OUTPUT, 'utf-8'));
    console.log(`[Server] Loaded ${knowledgeBase.length} KB entries from cache`);
  } else {
    knowledgeBase = build();
  }
  buildDocTokensCache();
}

function rebuildKnowledgeBase() {
  console.log('[Server] Rebuilding knowledge base…');
  knowledgeBase = build();
  buildDocTokensCache();
}

// ── Improved retrieval with diacritics normalization & IDF ───────────

// Strip diacritical marks:  ā→a, ī→i, ḥ→h, ṣ→s, etc.
function stripDiacritics(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Common English stop-words to ignore in scoring
const STOP_WORDS = new Set([
  'the','a','an','and','or','but','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','shall','should','may',
  'might','can','could','not','no','nor','so','if','then','else','when','where',
  'who','whom','which','what','how','why','that','this','these','those','it',
  'its','he','him','his','she','her','they','them','their','we','us','our',
  'you','your','about','from','into','with','for','on','at','to','by','of','in',
  'up','out','off','over','under','again','further','once','here','there','all',
  'each','every','both','few','more','most','other','some','such','only','own',
  'same','than','too','very','just','also','now','talk','said','say','says',
  'consider','considered','think','thinks','talked','weak','strong',
]);

function tokenize(text) {
  return stripDiacritics(text)
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF]/g, ' ')   // keep Arabic + alphanumeric
    .split(/\s+/)
    .filter(t => t.length > 2);
}

function tokenizeQuery(text) {
  return tokenize(text).filter(t => !STOP_WORDS.has(t));
}

// Pre-compute doc tokens on load for fast scoring
let docTokensCache = [];

function buildDocTokensCache() {
  docTokensCache = knowledgeBase.map(entry => {
    const text = `${entry.postTitle} ${entry.postTitle} ${entry.postMeta} ${entry.metaDescription} ${entry.content}`;
    return new Set(tokenize(text));
  });
}

// Count how many docs contain a term (for IDF weighting)
function docFrequency(term) {
  let count = 0;
  for (const docSet of docTokensCache) {
    for (const dt of docSet) {
      if (dt.includes(term) || term.includes(dt)) { count++; break; }
    }
  }
  return count || 1;
}

function scoreDocs(query) {
  const qTokens = tokenizeQuery(query);
  if (qTokens.length === 0) {
    // Fallback: try with all tokens (no stopword filter)
    const allTokens = tokenize(query);
    if (allTokens.length === 0) return knowledgeBase.slice(0, 5);
    return scoreDocsWithTokens(allTokens);
  }
  return scoreDocsWithTokens(qTokens);
}

function scoreDocsWithTokens(qTokens) {
  const N = knowledgeBase.length;

  // Compute IDF weight for each query token
  const tokenWeights = qTokens.map(qt => {
    const df = docFrequency(qt);
    return { token: qt, weight: Math.log(N / df) + 1 };
  });

  const scored = knowledgeBase.map((entry, idx) => {
    const docSet = docTokensCache[idx];
    let weightedScore = 0;
    let maxWeight = 0;

    for (const { token: qt, weight } of tokenWeights) {
      maxWeight += weight;
      for (const dt of docSet) {
        if (dt === qt) {
          weightedScore += weight;   // exact match — full weight
          break;
        } else if (dt.includes(qt) || qt.includes(dt)) {
          weightedScore += weight * 0.7;  // partial match — 70%
          break;
        }
      }
    }

    return { entry, score: maxWeight > 0 ? weightedScore / maxWeight : 0 };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter(s => s.score > 0.05).slice(0, 6).map(s => s.entry);
}

// ── Build the system prompt & context ────────────────────────────────
function buildPrompt(userQuestion, relevantDocs) {
  const contextChunks = relevantDocs.map((doc, i) => {
    const snippet = doc.content.length > 2000
      ? doc.content.slice(0, 2000) + '…'
      : doc.content;
    return `
--- Document ${i + 1} ---
Title: ${doc.postTitle}
Topic: ${doc.topic || doc.postMeta || 'General'}
Author: ${doc.author}
Source: ${doc.file}

${snippet}
`;
  }).join('\n');

  return `You are the official AI scholarly assistant for the website of Shaykh Dr. Khālid ibn Maḥmūd al-Ḥāyik (خالد الحايك), a renowned muḥaddith and scholar of ḥadīth sciences.

STRICT RULES:
1. You may ONLY answer based on the content from Shaykh Khālid's translated works provided below as context documents.
2. If the user's question cannot be answered from the provided context, respond politely: "I don't have information about that in the available works of Shaykh Khālid. Please try rephrasing your question or browse the topics on the website."
3. NEVER fabricate, hallucinate, or invent information not present in the provided context.
4. When you answer, cite which article/document the information comes from by its title.
5. Maintain an academic, respectful, and scholarly tone befitting Islamic scholarship.
6. You may answer in English or Arabic depending on the language the user asks in.
7. Keep answers focused and relevant. Use quotations from the source material where appropriate.

CONTEXT DOCUMENTS FROM SHAYKH KHĀLID'S WORKS:
${contextChunks}

USER'S QUESTION:
${userQuestion}

Provide a well-structured, accurate answer based ONLY on the context above.`;
}

// ── Express app ─────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Serve the static site itself so the assistant works in dev
app.use(express.static(path.join(__dirname)));

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    // 1. Retrieve relevant documents
    const relevantDocs = scoreDocs(message);

    // 2. Build system prompt with context
    const systemPrompt = buildPrompt(message, relevantDocs);

    // 3. Call LLM via OpenRouter (with model fallback)
    const chatHistory = (history || []).map(h => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.text,
    }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      { role: 'user', content: message },
    ];

    let text = '';
    let modelUsed = '';
    let succeeded = false;

    for (const modelId of MODELS) {
      try {
        console.log(`[Chat] Trying model: ${modelId}`);
        const completion = await openai.chat.completions.create({
          model: modelId,
          messages,
          max_tokens: 2048,
          temperature: 0.3,
        });
        text = completion.choices[0]?.message?.content || '';
        modelUsed = modelId;
        succeeded = true;
        console.log(`[Chat] Success with ${modelId}`);
        break;
      } catch (apiErr) {
        console.warn(`[Chat] ${modelId} failed (${apiErr.status}): ${apiErr.message?.slice(0, 120)}`);
        // Try next model
      }
    }

    if (!succeeded) {
      return res.status(503).json({
        error: 'All AI models are temporarily unavailable. Please try again in a minute.',
      });
    }

    res.json({
      reply: text,
      sources: relevantDocs.map(d => ({ title: d.postTitle, file: d.file })),
    });
  } catch (err) {
    console.error('[Chat Error]', err);
    if (err.status === 429) {
      return res.status(429).json({
        error: 'The AI assistant is currently at capacity. Please try again in a few minutes.',
      });
    }
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', entries: knowledgeBase.length });
});

// Debug endpoint — test retrieval without calling the LLM
app.get('/api/debug/retrieve', (req, res) => {
  const q = req.query.q || '';
  const docs = scoreDocs(q);
  res.json({
    query: q,
    queryTokens: tokenizeQuery(q),
    matchCount: docs.length,
    matches: docs.map(d => ({ title: d.postTitle, file: d.file })),
  });
});

// ── Start ───────────────────────────────────────────────────────────
loadKnowledgeBase();

// Watch HTML files for auto-rebuild
const watcher = chokidar.watch(
  [
    path.join(__dirname, '*.html'),
    path.join(__dirname, 'pages', '**', '*.html'),
  ],
  { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 500 } }
);
watcher.on('add', rebuildKnowledgeBase);
watcher.on('change', rebuildKnowledgeBase);
watcher.on('unlink', rebuildKnowledgeBase);
console.log('[Server] Watching HTML files for changes…');

const server = app.listen(PORT, () => {
  console.log(`\n🚀  Assistant server running at http://localhost:${PORT}`);
  console.log(`    Chat endpoint:  POST http://localhost:${PORT}/api/chat`);
  console.log(`    Knowledge base: ${knowledgeBase.length} entries\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌  Port ${PORT} is already in use.`);
    console.error(`    Fix: run  taskkill /F /PID <pid>  or change PORT in .env`);
    console.error(`    Find the pid:  netstat -ano | findstr :${PORT}`);
  } else {
    console.error('❌  Server error:', err.message);
  }
  process.exit(1);
});
