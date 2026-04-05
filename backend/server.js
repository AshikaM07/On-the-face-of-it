// Load .env variables FIRST (required for local dev)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function getModel(task) {
  if (task === 'flashcards') return 'openrouter/free';
  if (task === 'quiz') return 'openrouter/free';
  if (task === 'chat') return 'openrouter/free';
  return 'openrouter/free';
}

async function callOpenRouter(messages, maxTokens = 2000, task = 'chat') {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set. Add it to your .env file.');

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://on-the-face-of-it.app',
      'X-Title': 'On The Face Of It - CBSE Study App',
    },
    body: JSON.stringify({
      model: getModel(task),
      max_tokens: maxTokens,
      temperature: 0.5,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${err}`);
  }

  return response.json();
}

function extractText(data) {
  const msg = data.choices?.[0]?.message;
  if (!msg) return '';
  if (typeof msg.content === 'string' && msg.content.trim()) return msg.content.trim();
  if (Array.isArray(msg.content)) {
    return msg.content.filter(b => b.type === 'text' && b.text).map(b => b.text).join('\n').trim();
  }
  return '';
}

function extractJSON(raw) {
  console.log('[extractJSON] Length:', raw.length, '| Preview:', raw.slice(0, 300));

  let cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Direct parse
  try { return JSON.parse(cleaned); } catch (_) { }

  const start = cleaned.indexOf('[');
  if (start === -1) throw new Error('No JSON array found. Try again.');

  let slice = cleaned.slice(start);

  // Walk to find balanced bracket
  let depth = 0, inStr = false, escape = false, endIdx = -1;
  for (let i = 0; i < slice.length; i++) {
    const ch = slice[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inStr) { escape = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) { endIdx = i; break; }
    }
  }

  if (endIdx !== -1) {
    try { return JSON.parse(slice.slice(0, endIdx + 1)); } catch (_) { }
  }

  // Truncation repair
  const lastClose = slice.lastIndexOf('}');
  if (lastClose === -1) throw new Error('Response too short or malformed. Try again.');

  const repaired = slice.slice(0, lastClose + 1) + ']';
  try {
    const result = JSON.parse(repaired);
    console.log('[extractJSON] Repaired truncated JSON, recovered', result.length, 'items');
    return result;
  } catch (e) {
    throw new Error(`JSON parse failed after repair: ${e.message}. Try again.`);
  }
}

// ── AI Assistant ─────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages array required' });

    const data = await callOpenRouter([
      {
        role: 'system', content: `You are an expert literary guide for "On The Face Of It" by Susan Hill (CBSE Class 12 English, Vistas).Answer the user's question **completely, accurately, and concisely** in a single, well-structured response. 
- Avoid vague or incomplete answers.
- Provide all necessary details.
- Be concise but do not omit important information.
 Help students understand characters, themes, symbols, and literary devices. Be warm, encouraging, and educational.` },
      ...messages
    ], 1200, 'chat');

    res.json({ reply: extractText(data) });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Generate Flashcards ───────────────
app.post('/api/flashcards', async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: 'topic required' });

    const prompt = `You are a JSON generator. Create 5 flashcards about "${topic}" from "On The Face Of It" by Susan Hill (CBSE Class 12 Vistas).

Return ONLY this JSON array — no explanation, no markdown, no code fences. Start with [ end with ]:

[{"front":"Q1?","back":"Answer 1.","category":"character"},{"front":"Q2?","back":"Answer 2.","category":"theme"},{"front":"Q3?","back":"Answer 3.","category":"quote"},{"front":"Q4?","back":"Answer 4.","category":"symbol"},{"front":"Q5?","back":"Answer 5.","category":"event"}]

category: one of character|theme|quote|symbol|event. Keep answers 1-2 sentences. Output only the JSON array.`;

    const data = await callOpenRouter([{ role: 'user', content: prompt }], 1800, 'flashcards');
    const raw = extractText(data);
    if (!raw) throw new Error('Model returned empty response. Try again.');

    const cards = extractJSON(raw);
    if (!Array.isArray(cards) || cards.length === 0) throw new Error('Invalid flashcard data. Try again.');

    const valid = cards.map(c => ({
      front: String(c.front || 'Question'),
      back: String(c.back || 'Answer'),
      category: ['character', 'theme', 'quote', 'symbol', 'event'].includes(c.category) ? c.category : 'theme'
    }));

    res.json({ cards: valid });
  } catch (err) {
    console.error('Flashcard error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Generate Quiz ─────────────────────
app.post('/api/quiz', async (req, res) => {
  try {
    const { type = 'mixed', count = 5 } = req.body;
    const safeCount = Math.min(Math.max(Number(count) || 5, 3), 5);

    const typeInstruction = type !== 'mixed'
      ? `All questions type="${type}".`
      : 'Mix types: use "mcq", "truefalse", "fill".';

    const prompt = `You are a JSON generator. Create exactly ${safeCount} quiz questions about "On The Face Of It" by Susan Hill (CBSE Class 12). ${typeInstruction}

Return ONLY a compact JSON array. No markdown. No explanation. Start with [ end with ].

Each item: {"type":"mcq","question":"...","options":["A","B","C","D"],"answer":0,"explanation":"..."}

Rules:
- options = exactly 4 strings
- answer = 0-based index integer  
- truefalse options = ["True","False","Cannot Say","Not mentioned"]
- explanation max 15 words
- NO trailing commas
- Valid JSON only

Output the array now:`;

    const data = await callOpenRouter([{ role: 'user', content: prompt }], 2000, 'quiz');
    const raw = extractText(data);
    if (!raw) throw new Error('Model returned empty response. Try again.');

    const questions = extractJSON(raw);
    if (!Array.isArray(questions) || questions.length === 0) throw new Error('Invalid quiz data. Try again.');

    const normalized = questions.map(q => {
      if (!Array.isArray(q.options)) q.options = ['A', 'B', 'C', 'D'];
      while (q.options.length < 4) q.options.push('N/A');
      q.options = q.options.slice(0, 4);
      if (q.type === 'truefalse') {
        q.options = ['True', 'False', 'Cannot Say', 'Not mentioned'];
      }
      q.answer = Math.min(Math.max(Number(q.answer) || 0, 0), 3);
      q.explanation = String(q.explanation || '');
      return q;
    });

    res.json({ questions: normalized });
  } catch (err) {
    console.error('Quiz error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Summary ───────────────────────────
app.get('/api/summary/:section', async (req, res) => {
  try {
    const { section } = req.params;
    const prompts = {
      overview: 'Write a 3-paragraph overview of "On The Face Of It" by Susan Hill for CBSE Class 12 students.',
      characters: 'Describe the main characters (Derry, Mr. Lamb, Derry\'s mother) in "On The Face Of It" in detail for exam preparation.',
      themes: 'Explain the major themes in "On The Face Of It" by Susan Hill.',
      symbols: 'Analyze the key symbols in "On The Face Of It" — the garden, wall, crab apples, gate, bees, ladder.',
    };

    const prompt = prompts[section] || `Explain this aspect of "On The Face Of It": ${section}`;
    const data = await callOpenRouter([
      { role: 'system', content: 'You are a literary expert for CBSE Class 12 English. Give detailed, educational responses.' },
      { role: 'user', content: prompt }
    ], 900, 'chat');

    res.json({ content: extractText(data) });
  } catch (err) {
    console.error('Summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Health check ──────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    apiKeySet: !!process.env.OPENROUTER_API_KEY,
    models: { chat: getModel('chat'), flashcards: getModel('flashcards'), quiz: getModel('quiz') },
    timestamp: new Date().toISOString()
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`🌿 On The Face Of It — http://localhost:${PORT}`);
  console.log(`OpenRouter Key: ${process.env.OPENROUTER_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`Models: chat=llama-3.3-70b | flashcards=gemini-2.0-flash | quiz=step-3.5-flash`);
});

module.exports = app;
