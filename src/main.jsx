import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Search, PenLine, FileText, Sparkles, Link2, Check, X, Clock3, BookOpen, AlertCircle, ArrowRight, Copy } from 'lucide-react';
import './style.css';

const sampleDraft = `Artificial intelligence is increasingly being integrated into the workflows of companies across many different industries, and it is important to note that the adoption of these systems is creating both opportunities and challenges for teams. In order to get value from AI, organizations need to think carefully about where the technology is useful and how its outputs are evaluated. Agentic systems can use tools to complete multi-step tasks, but they are not automatically reliable. Teams should start with a narrow workflow, define what success looks like, and keep a human responsible for consequential decisions.`;
function App() {
  const [tab, setTab] = useState('research');
  const [urls, setUrls] = useState(['','','']);
  const [research, setResearch] = useState(null);
  const [researchBusy, setResearchBusy] = useState(false);
  const [researchError, setResearchError] = useState('');
  const [draft, setDraft] = useState(sampleDraft);
  const [original, setOriginal] = useState(sampleDraft);
  const [issues, setIssues] = useState([]);
  const [decisions, setDecisions] = useState({});
  const [writingBusy, setWritingBusy] = useState(false);
  const [writingError, setWritingError] = useState('');
  const [showCompare, setShowCompare] = useState(false);
  const [editorial, setEditorial] = useState('');
  const [headline, setHeadline] = useState('The AI announcement is only the beginning');
  const [copied, setCopied] = useState(false);

  const metrics = useMemo(() => {
    const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;
    const sentences = draft.match(/[.!?]+(?=\s|$)/g)?.length || (words ? 1 : 0);
    return { words, sentences, average: sentences ? (words / sentences).toFixed(1) : '0', minutes: Math.max(1, Math.ceil(words / 220)) };
  }, [draft]);

  const runResearch = async () => {
    setResearchError(''); setResearch(null);
    const clean = urls.map(x=>x.trim()).filter(Boolean);
    if (new Set(clean).size < 3) { setResearchError('Add at least three unique URLs to create a research brief.'); return; }
    setResearchBusy(true);
    try {
      const r = await fetch('/api/research', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({urls:clean}) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error);
      setResearch(data);
    } catch(e) { setResearchError(e.message || 'Could not complete research.'); }
    finally { setResearchBusy(false); }
  };
  const runWriting = async () => {
    setWritingError(''); setWritingBusy(true); setIssues([]); setDecisions({});
    try {
      const r = await fetch('/api/writing', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({draft}) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error);
      setIssues(data.issues || []); setOriginal(draft);
    } catch(e) { setWritingError(e.message || 'Analysis failed.'); }
    finally { setWritingBusy(false); }
  };
  const accept = (issue) => {
    if (!issue.suggestion || issue.suggestion.startsWith('Consider') || issue.suggestion.startsWith('add a short')) { setDecisions(p=>({...p,[issue.id]:'accepted-note'})); return; }
    setDraft(current => current.replace(issue.excerpt, issue.suggestion));
    setDecisions(p=>({...p,[issue.id]:'accepted'}));
  };
  const reject = id => setDecisions(p=>({...p,[id]:'rejected'}));
  const makeEditorial = () => {
    const sources = (research?.articles || []).filter(a=>a.status==='ok');
    const text = sources.map(a=>`${a.title}\n${a.brief?.summary || ''}\nSource: ${a.url}`).join('\n\n');
    setEditorial(`${headline}\n\n${text}\n\nWhy it matters: The important question is not simply whether a new AI capability exists. It is whether the capability changes the cost, speed, or quality of a real workflow. Builders should test it against a narrow task, compare it with the current baseline, and keep a human review step wherever errors carry meaningful consequences.\n\nA useful next step for operators: identify one repetitive workflow, define a measurable success criterion, and run a small pilot before making a broader commitment.`);
    setTab('writing');
    setDraft(`${headline}\n\n${text}\n\nWhy it matters: The important question is not simply whether a new AI capability exists. It is whether the capability changes the cost, speed, or quality of a real workflow. Builders should test it against a narrow task, compare it with the current baseline, and keep a human review step wherever errors carry meaningful consequences.\n\nA useful next step for operators: identify one repetitive workflow, define a measurable success criterion, and run a small pilot before making a broader commitment.`);
  };
  const copyText = async () => { await navigator.clipboard.writeText(draft); setCopied(true); setTimeout(()=>setCopied(false),1500); };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Sparkles size={19}/></div><div><b>Editorial Desk</b><small>AI WORKSPACE</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <button className={`nav-item ${tab==='research'?'active':''}`} onClick={()=>setTab('research')}><Search size={17}/> Research assistant</button>
      <button className={`nav-item ${tab==='writing'?'active':''}`} onClick={()=>setTab('writing')}><PenLine size={17}/> Writing assistant</button>
      <div className="sidebar-bottom"><div className="avatar">ED</div><div><b>Editorial workspace</b><small>Research → Draft → Refine</small></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><span className="eyebrow">THIS WEEK IN AI / EDITORIAL</span><h1>AI Editorial Workspace</h1></div><div className="top-status"><span className="status-dot"></span> Workspace ready</div></header>
      {tab==='research' ? <section className="content">
        <div className="intro"><div><span className="pill"><Search size={13}/> SOURCE INTELLIGENCE</span><h2>Find the story behind the news.</h2><p>Bring multiple sources together. Get a structured brief that separates source statements from editorial interpretation.</p></div><div className="intro-icon"><FileText size={32}/></div></div>
        <div className="panel source-panel"><div className="panel-heading"><div><h3>Source collection</h3><p>Add at least three article, research paper, or announcement URLs.</p></div><span className="counter">{urls.filter(x=>x.trim()).length} / 8</span></div>
          {urls.map((u,i)=><div className="url-row" key={i}><span className="url-index">{String(i+1).padStart(2,'0')}</span><Link2 size={16}/><input value={u} onChange={e=>setUrls(old=>old.map((v,j)=>i===j?e.target.value:v))} placeholder="https://example.com/ai-development" /></div>)}
          <div className="source-actions"><button className="text-button" onClick={()=>setUrls(v=>v.length<8?[...v,'']:v)}>+ Add another source</button><button className="primary" onClick={runResearch} disabled={researchBusy}>{researchBusy?<span className="spinner"/>:<Sparkles size={16}/>} {researchBusy?'Researching sources…':'Generate research brief'} <ArrowRight size={16}/></button></div>
          {researchError&&<div className="error"><AlertCircle size={16}/>{researchError}</div>}
        </div>
        {research && <div className="results">
          <div className="result-top"><div><span className="pill green">RESEARCH BRIEF</span><h2>What the sources tell us</h2><p>{research.successfulCount} of {research.articles.length} sources processed</p></div><button className="secondary" onClick={makeEditorial} disabled={!research.successfulCount}>Build a draft <ArrowRight size={15}/></button></div>
          <div className="notice"><AlertCircle size={15}/>{research.note} Always verify important claims against the source.</div>
          {research.articles.map((a,i)=><article className="source-card" key={a.url}><div className="source-card-top"><span className="source-number">SOURCE {String(i+1).padStart(2,'0')}</span><span className={`mini-status ${a.status}`}>{a.status==='ok'?'Processed':'Could not access'}</span></div><h3>{a.title}</h3><a href={a.url} target="_blank" rel="noreferrer">{a.url} <ArrowRight size={12}/></a>
            {a.status==='error'?<p className="error-copy">{a.error}</p>:<><div className="brief-grid"><div><label>WHAT HAPPENED</label><p>{a.brief?.whatHappened || a.brief?.summary}</p></div><div><label>WHY IT MATTERS</label><p>{a.brief?.whyItMatters}</p></div></div><div className="fact-box"><label>SOURCE STATEMENTS / EVIDENCE TO CHECK</label>{(a.brief?.facts||[]).map((f,j)=><p key={j}>• {typeof f==='string'?f:f.text}</p>)}</div><div className="brief-grid"><div><label>WHO SHOULD CARE</label><p>{(a.brief?.whoShouldCare||[]).join(' · ')}</p></div><div><label>EDITORIAL ANGLE</label><p>{a.brief?.angle}</p></div></div><p className="analysis-note"><b>Editorial interpretation:</b> {a.brief?.analysis}</p><p className="caveat">Caveat: {a.brief?.caveats}</p></>}
          </article>)}
        </div>}
      </section> : <section className="content">
        <div className="intro"><div><span className="pill"><PenLine size={13}/> EDITORIAL REVIEW</span><h2>Make every sentence earn its place.</h2><p>Get practical feedback while keeping control of every edit. Your original draft stays intact until you accept a suggestion.</p></div><div className="intro-icon"><PenLine size={32}/></div></div>
        <div className="metrics">
          <div className="metric"><span>WORD COUNT</span><b>{metrics.words}</b><small>Total words in your draft</small></div>
          <div className="metric"><span>AVG. SENTENCE</span><b>{metrics.average}</b><small>Words per sentence</small></div>
          <div className="metric"><span>READING TIME</span><b>{metrics.minutes} min</b><small>Estimated at 220 wpm</small></div>
          <div className="metric"><span>SENTENCES</span><b>{metrics.sentences}</b><small>Sentence count estimate</small></div>
        </div>
        <div className="editor-layout"><div className="panel editor-panel"><div className="panel-heading"><div><h3>Your draft</h3><p>Paste or write your newsletter copy below.</p></div><button className="icon-button" title="Copy draft" onClick={copyText}><Copy size={15}/>{copied?'Copied':'Copy'}</button></div><textarea className="draft-area" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Paste your editorial draft here…"/><div className="editor-footer"><span>Original text is preserved until you accept a suggestion.</span><button className="primary" onClick={runWriting} disabled={writingBusy||!draft.trim()}>{writingBusy?<span className="spinner"/>:<Sparkles size={16}/>} {writingBusy?'Analyzing…':'Analyze my writing'}</button></div>{writingError&&<div className="error">{writingError}</div>}</div>
        <div className="side-column"><div className="panel principle"><div className="principle-icon"><BookOpen size={18}/></div><h3>Editorial principle</h3><p>Clarity is not the same as simplicity. Keep technical terms when they matter, explain them when needed, and preserve the author's intended meaning.</p></div><div className="panel metric-help"><h3>About these metrics</h3><p><b>Average sentence length</b> can reveal dense passages, but context matters.</p><p><b>Reading time</b> is an estimate, not a quality score.</p><p><b>Word count</b> helps manage length and scope.</p></div></div></div>
        {issues.length>0&&<div className="feedback-section"><div className="result-top"><div><span className="pill green">EDITORIAL FEEDBACK</span><h2>{issues.length} suggestions to consider</h2><p>Accept only the changes that preserve your meaning.</p></div><button className="secondary" onClick={()=>setShowCompare(!showCompare)}>{showCompare?'Hide comparison':'Compare original & current'}</button></div>
          {showCompare&&<div className="compare-grid"><div><label>ORIGINAL DRAFT</label><p>{original}</p></div><div><label>CURRENT DRAFT</label><p>{draft}</p></div></div>}
          {issues.map(issue=><div className="issue-card" key={issue.id}><div className="issue-head"><span className="issue-type">{issue.type}</span><span className={`severity ${issue.severity?.toLowerCase()}`}>{issue.severity}</span>{decisions[issue.id]&&<span className="decision">{decisions[issue.id]==='accepted'?'Accepted':decisions[issue.id]==='rejected'?'Dismissed':'Note accepted'}</span>}</div><div className="quote">“{issue.excerpt}”</div><p className="reason">{issue.reason}</p>{issue.suggestion&&<div className="suggestion"><label>SUGGESTED CHANGE</label><p>{issue.suggestion}</p></div>}<div className="issue-actions"><button className="accept" onClick={()=>accept(issue)} disabled={!!decisions[issue.id]}><Check size={14}/> Accept suggestion</button><button className="reject" onClick={()=>reject(issue.id)} disabled={!!decisions[issue.id]}><X size={14}/> Dismiss</button></div></div>)}
        </div>}
      </section>}
      <footer className="footer">EDITORIAL DESK <span>·</span> Built for thoughtful AI journalism <span>·</span> Verify before publishing</footer>
    </main>
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
