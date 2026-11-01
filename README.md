# AI Editorial Workspace — Editorial Desk

A lightweight research-to-draft workspace for AI newsletter editors. It combines a URL-based research assistant with a writer-controlled editing assistant.

## Core workflow

1. Add at least three article or announcement URLs.
2. The server retrieves pages, extracts the readable article body, and creates a structured brief for each source.
3. Review what happened, why it matters, who should care, source statements, editorial interpretation, caveats, and a suggested angle.
4. Build a working draft from the processed sources.
5. Run the Writing Assistant, inspect each issue, and accept or dismiss suggestions individually.
6. Compare the original draft with the current version.

## Product decisions

- **Primary user:** A newsletter editor who has limited time to assess several AI developments and turn the most useful one into a clear story.
- **Most important problem:** Reducing the distance between source collection and a defensible editorial angle, without disguising interpretation as fact.
- **Prioritized:** Three-or-more URL input, source-linked briefs, explicit fact/analysis separation, writing feedback, writer-controlled edits, and basic metrics.
- **Deliberately left out:** Publishing, team collaboration, account management, scheduled monitoring, social platform integrations, and a full citation-verification engine. These would distract from proving the core workflow in a 6–8 hour prototype.
- **Success measures:** Time from source collection to usable brief; percentage of briefs an editor marks useful; percentage of suggested edits accepted; factual correction rate; and editor-rated clarity of the final piece.

## Engineering

### Stack
- React + Vite frontend
- Node.js + Express API
- Mozilla Readability + jsdom for extracting article text
- OpenAI API for structured source analysis and optional AI writing feedback
- Deterministic rule-based writing checks as the no-key fallback

### AI vs deterministic logic
- **AI (when configured):** Produces structured research summaries and editorial interpretation from extracted source text; flags writing issues with proposed rewrites.
- **Deterministic:** URL validation, article extraction, word count, average sentence length, reading-time estimate, and fallback checks for long sentences, filler, possible passive voice, and selected jargon.
- **Important:** The fallback research brief is extractive and explicitly warns that it is not an independent fact-check. It does not claim to verify source assertions.

### Handling failures and reliability
- Each URL is processed independently. A blocked or inaccessible page is marked as an error without failing the other sources.
- URL count is limited to 3–8, duplicates are removed, and only HTTP(S) URLs are accepted.
- Fetch requests have a timeout. Short or unreadable pages produce an explicit extraction error.
- AI outputs are requested as JSON and parsed before returning to the UI. API errors are shown to the user.
- Every brief retains its original URL. Claims should be checked against the source; the prototype does not yet provide sentence-level citation alignment or independent corroboration.

### Limitations
- Some sites block automated extraction, require login, render content client-side, or expose only partial text.
- Search, tweets, and PDFs are not separately integrated; public URLs may work if their HTML contains readable text.
- Deterministic passive-voice and jargon checks are heuristic and can produce false positives.
- AI summaries can still omit nuance or misinterpret a source. Editorial verification remains required.

### Next day of work
1. Add claim-level evidence spans linking each fact to the exact source passage.
2. Add cross-source comparison and contradiction detection.
3. Support pasted article text and PDF extraction when URL retrieval fails.
4. Add a proper diff view and undo for accepted edits.
5. Add a small editor evaluation set and measure suggestion precision/acceptance.

## Editorial judgment

Clear writing gives readers enough context to understand the development, explains why it matters to a specific audience, and distinguishes what is known from what is inferred. Readability metrics are diagnostic signals, not goals.

The assistant should be evaluated by blind editor review: compare the original and revised drafts for clarity, accuracy, preserved meaning, and usefulness. Track accepted suggestions, rejected suggestions, and factual regressions.

The tool should not automatically change technical claims, numbers, names, uncertainty, causal language, quotations, or the author's central argument. It should not remove necessary technical terms merely to lower sentence complexity.

## Setup

Requirements: Node.js 18+ and npm.

```bash
git clone <your-repository-url>
cd ai-editorial-workspace
npm install
cp .env.example .env
```

Optionally add an API key to `.env`:

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
PORT=8787
```

Run locally:

```bash
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`).

Build the frontend:

```bash
npm run build
npm start
```

The Express server serves the production build from `dist` on port 8787.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | No | Enables AI-generated research briefs and AI writing feedback. Without it, deterministic fallback mode is used. |
| `OPENAI_MODEL` | No | OpenAI model name. Defaults to `gpt-4o-mini`. |
| `PORT` | No | Express server port. Defaults to `8787`. |

Never commit `.env` or API keys.

## Tools and implementation disclosure

This project was generated with assistance from ChatGPT. The implementation includes the React interface, Express endpoints, URL extraction, AI/fallback analysis paths, editing controls, metrics, and documentation. Before submission, the developer should install dependencies, run the app, test at least three accessible URLs, test the failure state with a blocked URL, and verify accept/reject and comparison behavior. Do not describe unrun tests as completed.

## Sample editorial output

Use the Research Assistant with three current, accessible sources to generate a source-grounded editorial piece. The generated draft is a starting point, not a publication-ready article. Check every factual statement against the original source URLs before publishing.
