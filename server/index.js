require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static('dist'));
const PORT = process.env.PORT || 8787;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

function cleanText(s) {
  return (s || '').replace(/\s+/g, ' ').trim().slice(0, 18000);
}
function fallbackBrief(article) {
  const sentences = article.content.match(/[^.!?]+[.!?]+/g) || [article.content];
  const key = sentences.slice(0, 3).map(s => s.trim()).filter(Boolean);
  return {
    summary: key.join(' ') || 'The source content was retrieved, but a concise summary could not be extracted.',
    whatHappened: key[0] || 'Review the source for the central development.',
    whyItMatters: 'This development may affect how teams evaluate, build, or deploy AI products. The practical impact depends on adoption, reliability, cost, and integration details.',
    whoShouldCare: ['AI founders evaluating product opportunities', 'Builders deciding which tools or models to adopt', 'Business operators assessing workflow impact'],
    facts: key.slice(0, 3).map(text => ({ text, type: 'source statement' })),
    analysis: 'Editorial interpretation: investigate what changes for users, what remains difficult, and whether the announcement creates a measurable advantage.',
    angle: 'Beyond the announcement: what changes for the people building and operating with AI?',
    caveats: 'This is an extractive fallback, not a verified independent fact-check. Check claims against the original source.'
  };
}
async function summarize(article) {
  if (!openai) return fallbackBrief(article);
  const prompt = `You are a careful AI newsletter research editor. Use ONLY the supplied source text. Do not invent details. Return valid JSON with keys summary, whatHappened, whyItMatters, whoShouldCare (array), facts (array of {text,type}), analysis, angle, caveats. Clearly label interpretation and uncertainty. Source title: ${article.title}\nURL: ${article.url}\nText: ${article.content.slice(0, 14000)}`;
  const result = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: 'Return valid JSON only. Never fabricate facts or citations.' }, { role: 'user', content: prompt }],
    temperature: 0.2
  });
  return JSON.parse(result.choices[0].message.content);
}
app.post('/api/research', async (req, res) => {
  try {
    const urls = [...new Set((req.body.urls || []).map(x => String(x).trim()).filter(Boolean))];
    if (urls.length < 3) return res.status(400).json({ error: 'Please provide at least three unique source URLs.' });
    if (urls.length > 8) return res.status(400).json({ error: 'Please provide no more than eight URLs at a time.' });
    const articles = await Promise.all(urls.map(async url => {
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only HTTP and HTTPS URLs are supported.');
        const response = await fetch(url, { headers: { 'User-Agent': 'EditorialDeskBot/1.0 (research prototype)' }, signal: AbortSignal.timeout(12000) });
        if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
        const html = await response.text();
        const dom = new JSDOM(html, { url });
        const parsedArticle = new Readability(dom.window.document).parse();
        const content = cleanText(parsedArticle?.textContent || dom.window.document.body?.textContent);
        if (content.length < 250) throw new Error('Not enough readable article text. The site may block automated access.');
        const article = { url, title: parsedArticle?.title || dom.window.document.title || parsed.hostname, content };
        return { ...article, brief: await summarize(article), status: 'ok' };
      } catch (e) {
        return { url, title: new URL(url).hostname, content: '', brief: null, status: 'error', error: e.message };
      }
    }));
    const successful = articles.filter(a => a.status === 'ok');
    res.json({ articles, successfulCount: successful.length, note: openai ? 'AI-assisted analysis enabled. Verify every claim against the linked source.' : 'Deterministic fallback mode: add OPENAI_API_KEY for AI-generated editorial analysis.' });
  } catch (e) { res.status(500).json({ error: e.message || 'Research request failed.' }); }
});
app.post('/api/writing', async (req, res) => {
  try {
    const draft = String(req.body.draft || '').trim();
    if (!draft) return res.status(400).json({ error: 'Paste a draft to analyze.' });
    if (openai) {
      const result = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are a precise editorial coach. Preserve author meaning and technical nuance. Return JSON: {"issues":[{"id":"unique string","type":"Long sentence|Filler|Passive voice|Jargon|Repetition","excerpt":"exact original text","reason":"specific explanation","suggestion":"rewrite that preserves meaning","severity":"High|Medium|Low"}]}. Only flag genuine issues. Maximum 12 issues. Do not rewrite the whole draft.' },
          { role: 'user', content: draft }
        ],
        temperature: 0.2
      });
      return res.json(JSON.parse(result.choices[0].message.content));
    }
    res.json({ issues: analyzeRules(draft), mode: 'deterministic' });
  } catch (e) { res.status(500).json({ error: e.message || 'Writing analysis failed.' }); }
});
function analyzeRules(draft) {
  const issues = [];
  const sentences = draft.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
  sentences.forEach((raw, i) => {
    const s = raw.trim(), words = s.split(/\s+/);
    if (words.length > 25) issues.push({ id: `long-${i}`, type: 'Long sentence', excerpt: s, reason: `This sentence has ${words.length} words. Several ideas may be competing for attention.`, suggestion: splitAtConjunction(s), severity: words.length > 35 ? 'High' : 'Medium' });
    const filler = /\b(very|really|basically|actually|in order to|it is important to note that|at the end of the day|in terms of)\b/i.exec(s);
    if (filler) issues.push({ id: `filler-${i}`, type: 'Filler', excerpt: s, reason: `The phrase “${filler[0]}” may add length without adding meaning.`, suggestion: s.replace(new RegExp(filler[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').replace(/\s{2,}/g, ' ').trim(), severity: 'Low' });
    if (/\b(is|are|was|were|be|been|being)\s+\w+(ed|en)\b/i.test(s)) issues.push({ id: `passive-${i}`, type: 'Possible passive voice', excerpt: s, reason: 'This construction may hide who performs the action. Use active voice when the actor matters.', suggestion: 'Consider naming the actor and putting it before the verb. Check that the rewrite preserves the intended emphasis.', severity: 'Low' });
  });
  const jargon = ['inference-time compute','RAG','vector database','agentic','fine-tuning','latent space','multimodal'];
  jargon.forEach((term, i) => {
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const match = draft.match(re);
    if (match) issues.push({ id: `jargon-${i}`, type: 'Technical term', excerpt: match[0], reason: 'If your audience may not know this term, explain it briefly on first use.', suggestion: `${match[0]} (add a short plain-language explanation here)`, severity: 'Medium' });
  });
  return issues.slice(0, 12);
}
function splitAtConjunction(s) {
  const m = s.match(/^(.{35,}?)\s+(because|while|although|which|and)\s+(.+)$/i);
  if (!m) return 'Consider splitting this into two sentences, each with one main idea.';
  return `${m[1].trim()}. ${m[2][0].toUpperCase()}${m[2].slice(1)} ${m[3].trim()}`;
}
app.get('/api/health', (_, res) => res.json({ ok: true, aiEnabled: !!openai }));
app.get('*', (req, res) => res.sendFile(require('path').resolve('dist/index.html')));
app.listen(PORT, () => console.log(`Editorial Desk API running on http://localhost:${PORT}`));
