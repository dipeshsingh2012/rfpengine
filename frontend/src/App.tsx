import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Download,
  FileText,
  FolderOpen,
  History,
  LayoutGrid,
  Link,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Upload,
  X,
} from 'lucide-react'

type Source = {
  id: string
  question: string
  answer: string
  score: number
}

type SearchResponse = {
  suggested_answer: string
  confidence_score: number
  sources: Source[]
}

type SourceMode = 'url' | 'upload' | 'extension'

const apiBaseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

const demoResponse: SearchResponse = {
  suggested_answer:
    'Acme retains customer data for the duration of the active subscription and for up to 30 days after termination to support recovery and orderly account closure. Backups are rotated on a 35-day schedule, after which data is permanently deleted unless a longer period is required by law.',
  confidence_score: 0.91,
  sources: [
    {
      id: 'kb-2048',
      question: 'How long is customer data retained after account termination?',
      answer: 'Customer data is retained for 30 days after termination. Encrypted backups are rotated after 35 days.',
      score: 0.0323,
    },
    {
      id: 'kb-1182',
      question: 'What is your data deletion policy?',
      answer: 'Customers may request deletion at any time. Production data is removed within 30 days and backup copies expire on their normal rotation schedule.',
      score: 0.0317,
    },
    {
      id: 'kb-0751',
      question: 'Where is customer information stored?',
      answer: 'Customer information is stored in encrypted cloud infrastructure with access restricted to authorized personnel.',
      score: 0.0308,
    },
  ],
}

const starterQuestions = [
  'Describe your data retention policy.',
  'How do you approach information security?',
  'What support is included with the platform?',
]

function demoAnswerFor(question: string): SearchResponse {
  const normalized = question.toLowerCase()
  const answer = normalized.includes('encrypt')
    ? 'Customer data is encrypted in transit using TLS 1.2 or higher and at rest using AES-256. Encryption keys are managed through a restricted key-management service.'
    : normalized.includes('certif') || normalized.includes('compliance')
      ? 'Our security program is aligned with industry best practices, and we maintain current SOC 2 Type II and ISO 27001 certifications. Current reports are available under NDA.'
      : normalized.includes('implement') || normalized.includes('timeline')
        ? 'A standard implementation typically takes 4 to 8 weeks, depending on integrations, data preparation, and stakeholder availability. A dedicated implementation manager coordinates the rollout.'
        : normalized.includes('support')
          ? 'The platform includes email support, a searchable help center, and an assigned customer success contact. Premium plans add priority response times and dedicated support.'
          : demoResponse.suggested_answer
  return { ...demoResponse, suggested_answer: answer, confidence_score: 0.84 }
}

function extractFormQuestions(text: string, fileName: string) {
  if (fileName.endsWith('.json')) {
    const parsed = JSON.parse(text)
    const records = Array.isArray(parsed) ? parsed : parsed.questions || []
    return records.map((record: { question?: string; text?: string }) => record.question || record.text || '').filter(Boolean)
  }
  if (fileName.endsWith('.csv')) {
    return text.split(/\r?\n/).slice(1).map((line) => line.split(',')[2] || line.split(',')[0]).filter(Boolean)
  }
  const document = new DOMParser().parseFromString(text, 'text/html')
  return [...document.querySelectorAll('textarea, input:not([type="hidden"]), [contenteditable="true"]')]
    .map((field) => document.querySelector(`label[for="${CSS.escape(field.id)}"]`)?.textContent?.trim() || field.getAttribute('aria-label') || field.getAttribute('placeholder') || '')
    .filter(Boolean)
}

function formatScore(score: number) {
  return `${Math.round(score * 100)}%`
}

function App() {
  const [question, setQuestion] = useState(starterQuestions[0])
  const [tenantId, setTenantId] = useState('acme-corp')
  const [topK, setTopK] = useState(5)
  const [response, setResponse] = useState<SearchResponse>(demoResponse)
  const [answer, setAnswer] = useState(demoResponse.suggested_answer)
  const [answersByQuestion, setAnswersByQuestion] = useState<Record<string, string>>({ [starterQuestions[0]]: demoResponse.suggested_answer })
  const [activeSource, setActiveSource] = useState(demoResponse.sources[0].id)
  const [isGenerating, setIsGenerating] = useState(false)
  const [answerStatus, setAnswerStatus] = useState<'Draft' | 'Approved' | 'Rejected'>('Draft')
  const [role, setRole] = useState<'Proposal manager' | 'Security SME' | 'Legal reviewer' | 'Final approver'>('Proposal manager')
  const [notice, setNotice] = useState('Demo data loaded')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [formUrl, setFormUrl] = useState('')
  const [sourceStatus, setSourceStatus] = useState('No external form loaded')
  const [detectedQuestions, setDetectedQuestions] = useState<string[]>([])
  const [sourceMode, setSourceMode] = useState<SourceMode>('upload')
  const [sourceLabel, setSourceLabel] = useState('Demo questionnaire')
  const [route, setRoute] = useState(window.location.pathname || '/')

  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname || '/')
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const approveButton = document.querySelector<HTMLButtonElement>('.approve-button')
    const rejectButton = document.querySelector<HTMLButtonElement>('.reject-button')
    if (!approveButton || !rejectButton) return
    const approve = () => { const nextStatus = role === 'Proposal manager' ? 'SME review' : role === 'Final approver' ? 'Final approved' : 'Approved by SME'; setAnswerStatus(nextStatus as 'Approved'); setNotice(`${nextStatus} · ${role}`) }
    const reject = () => { setAnswerStatus('Rejected'); setNotice('Answer rejected and needs revision') }
    approveButton.addEventListener('click', approve)
    rejectButton.addEventListener('click', reject)
    return () => { approveButton.removeEventListener('click', approve); rejectButton.removeEventListener('click', reject) }
  }, [route, answerStatus, role])

  function loadQuestions(questions: string[], source: string, mode: SourceMode) {
    setDetectedQuestions(questions)
    setSourceMode(mode)
    setSourceLabel(source)
    if (questions[0]) setQuestion(questions[0])
    setSourceStatus(`${source} · ${questions.length} question${questions.length === 1 ? '' : 's'} detected`)
    setNotice(questions.length ? 'Form questions loaded' : 'No questions found')
  }

  async function loadFormUrl() {
    try {
      const url = new URL(formUrl)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use an http or https URL.')
      setSourceStatus('Fetching form...')
      const result = await fetch(url.href)
      if (!result.ok) throw new Error(`Could not fetch form (${result.status})`)
      loadQuestions(extractFormQuestions(await result.text(), url.pathname.toLowerCase()), url.hostname, 'url')
    } catch (error) {
      setSourceStatus(error instanceof TypeError ? 'The form blocked browser access. Enable CORS or use file upload.' : (error as Error).message)
    }
  }

  async function loadFormFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try { loadQuestions(extractFormQuestions(await file.text(), file.name.toLowerCase()), file.name, 'upload') }
    catch (error) { setSourceStatus(`Could not read form: ${(error as Error).message}`) }
  }

  function navigate(path: string) {
    window.history.pushState({}, '', path)
    setRoute(path)
  }

  function openImport() {
    navigate('/review')
  }

  function openWorkspace() {
    navigate('/response/workspace/demo')
  }

  function openOriginalForm() {
    if (formUrl) window.open(formUrl, '_blank', 'noopener,noreferrer')
  }

  function exportAnswers() {
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`
    const rows = ['question,answer', ...detectedQuestions.map((item) => `${escapeCsv(item)},${escapeCsv(answersByQuestion[item] || '')}`)]
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }))
    link.download = `${sourceLabel.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'rfpengine-response'}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  async function generateAnswer() {
    if (!question.trim()) return
    setIsGenerating(true)
    setNotice('Searching approved knowledge...')
    try {
      const result = await fetch(`${apiBaseUrl}/v1/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, question, top_k: topK }),
      })
      if (!result.ok) throw new Error('API unavailable')
      const data = (await result.json()) as SearchResponse
      setResponse(data)
      setAnswer(data.suggested_answer)
      setAnswersByQuestion((current) => ({ ...current, [question]: data.suggested_answer }))
      setAnswerStatus('Draft')
      setActiveSource(data.sources[0]?.id ?? '')
      setNotice('Draft generated from live sources')
    } catch {
      const fallback = demoAnswerFor(question)
      setResponse(fallback)
      setAnswer(fallback.suggested_answer)
      setAnswersByQuestion((current) => ({ ...current, [question]: fallback.suggested_answer }))
      setAnswerStatus('Draft')
      setActiveSource(demoResponse.sources[0].id)
      setNotice('Demo answer generated. Connect the API for live retrieval.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (route === '/review') {
    return <div className="import-page"><header className="import-header"><div className="brand-mark"><span>R</span></div><div className="brand-name">RFP<span>Engine</span></div><span className="import-header-label">Response assistant</span></header><main className="import-main"><p className="breadcrumb">Responses <span>/</span> New response</p><h1>Review your questionnaire</h1><p className="subtitle">Confirm the questions found before drafting answers.</p><section className="import-source panel"><div className="panel-label"><span className="step-number">01</span><div><p className="eyebrow">Form source</p><span className="label-hint">Load a hosted questionnaire or upload form data</span></div></div><div className="source-input-row"><div className="source-url-field"><Link size={16} /><input value={formUrl} onChange={(event) => setFormUrl(event.target.value)} placeholder="https://buyer.example/questionnaire" /><button className="source-button" onClick={loadFormUrl} disabled={!formUrl.trim()}>Load URL</button></div><label className="upload-form-button"><Upload size={15} /> Upload HTML, JSON, or CSV<input type="file" accept=".html,.htm,.json,.csv,text/html,application/json,text/csv" onChange={loadFormFile} /></label></div><p className="source-status"><span className="status-dot" /> {sourceStatus}</p></section><section className="import-questions panel"><div className="import-question-heading"><div><p className="eyebrow">02 / Detected questions</p><h2>{detectedQuestions.length ? `${detectedQuestions.length} questions ready` : 'No questions detected'}</h2></div><span className="source-count">Review before continuing</span></div>{detectedQuestions.length ? <div className="import-question-list">{detectedQuestions.map((detectedQuestion, index) => <div className="import-question" key={`${detectedQuestion}-${index}`}><span className="source-rank">Q{String(index + 1).padStart(2, '0')}</span><span>{detectedQuestion}</span><Check size={15} /></div>)}</div> : <p className="empty-import">Load a URL or upload a form file to see its questions here.</p>}<button className="primary-button continue-button" onClick={openWorkspace} disabled={!detectedQuestions.length}>Continue to workspace <ArrowUpRight size={15} /></button></section></main></div>
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
          {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="brand-mark"><span>R</span></div>
        <div className="brand-name">RFP<span>Engine</span></div>
        <div className="workspace-switcher"><span className="workspace-dot" /> Acme Corporation <ChevronDown size={15} /></div>
        <div className="topbar-spacer" />
        <button className="icon-button" title="Open notifications"><AlertCircle size={18} /></button>
        <button className="avatar" title="Account menu">JD</button>
      </header>

      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-section">
          <p className="eyebrow">Workspace</p>
          <nav>
            <button className="nav-item active"><LayoutGrid size={17} /> Overview</button>
            <button className="nav-item"><FileText size={17} /> Responses <span className="nav-count">12</span></button>
            <button className="nav-item"><FolderOpen size={17} /> Knowledge base</button>
            <button className="nav-item"><History size={17} /> Activity</button>
          </nav>
        </div>
        <div className="sidebar-section recent-section">
          <p className="eyebrow">Recent RFPs <button className="tiny-action" title="Add RFP"><Plus size={14} /></button></p>
          <button className="recent-item selected"><span className="file-icon blue"><FileText size={15} /></span><span><strong>Northstar security review</strong><small>Edited 8 min ago</small></span></button>
          <button className="recent-item"><span className="file-icon orange"><FileText size={15} /></span><span><strong>Grove procurement RFP</strong><small>Edited yesterday</small></span></button>
          <button className="recent-item"><span className="file-icon green"><FileText size={15} /></span><span><strong>Meridian vendor form</strong><small>Edited Aug 18</small></span></button>
        </div>
        <div className="sidebar-bottom">
          <button className="nav-item"><Settings size={17} /> Workspace settings</button>
          <div className="plan-meter"><div><span>Knowledge base</span><strong>68%</strong></div><div className="meter"><span /></div><small>6,842 of 10,000 records</small></div>
        </div>
      </aside>

      <main className="main-content">
        {route === '/response/workspace/demo' && <div className="role-bar"><div className="role-selector"><span className="eyebrow">Viewing as</span><select value={role} onChange={(event) => setRole(event.target.value as typeof role)}><option>Proposal manager</option><option>Security SME</option><option>Legal reviewer</option><option>Final approver</option></select></div><div className="queue-summary"><span><strong>12</strong> total</span><span><strong>8</strong> approved</span><span className="queue-warning"><strong>2</strong> SME review</span><span><strong>1</strong> revision</span></div><span className="workflow-status">{answerStatus === 'Draft' ? 'Draft in progress' : answerStatus}</span></div>}
        {route === '/' ? <section className="home-screen"><p className="eyebrow">Start a response</p><h1>Bring in your questionnaire</h1><p className="home-subtitle">Choose how you want to load the seller form.</p><div className="home-feature-grid"><div className="home-feature"><span className="home-feature-number">01</span><div className="home-feature-icon"><Link size={22} /></div><h2>Paste a form URL</h2><p>Load a hosted questionnaire and extract its questions for review.</p><div className="home-url-row"><input value={formUrl} onChange={(event) => setFormUrl(event.target.value)} placeholder="https://buyer.example/form" /><button className="primary-button" onClick={async () => { openImport(); await loadFormUrl(); }} disabled={!formUrl.trim()}>Load URL <ArrowUpRight size={15} /></button></div><small>Works when the page permits browser access.</small></div><div className="home-feature"><span className="home-feature-number">02</span><div className="home-feature-icon upload-icon"><Upload size={22} /></div><h2>Upload form data</h2><p>Import an HTML, JSON, or CSV questionnaire from your computer.</p><label className="home-upload-button"><Upload size={16} /> Choose a form file<input type="file" accept=".html,.htm,.json,.csv,text/html,application/json,text/csv" onChange={async (event) => { openImport(); await loadFormFile(event); }} /></label><small>Questions are extracted locally in your browser.</small></div></div></section> : <>
        <div className="page-heading">
          <div><p className="breadcrumb">Responses <span>/</span> Northstar security review</p><h1>Response workspace</h1><p className="subtitle">Draft accurate answers from your approved knowledge base.</p></div>
          <button className="outline-button"><Upload size={16} /> Import RFP</button>
        </div>

        <section className="source-panel panel">
          <div className="panel-label"><span className="step-number">00</span><div><p className="eyebrow">Form source</p><span className="label-hint">Load a hosted questionnaire or upload form data</span></div></div>
          <div className="source-input-row"><div className="source-url-field"><Link size={16} /><input value={formUrl} onChange={(event) => setFormUrl(event.target.value)} placeholder="Paste form URL, e.g. https://buyer.example/questionnaire" /><button className="source-button" onClick={loadFormUrl} disabled={!formUrl.trim()}>Load URL</button></div><label className="upload-form-button"><Upload size={15} /> Upload HTML, JSON, or CSV<input type="file" accept=".html,.htm,.json,.csv,text/html,application/json,text/csv" onChange={loadFormFile} /></label></div>
          <div className="source-status-row"><p className="source-status"><span className="status-dot" /> {sourceStatus}</p>{route === '/review' && detectedQuestions.length > 0 && <button className="source-button" onClick={openWorkspace}>Continue to workspace <ArrowUpRight size={14} /></button>}</div>
        </section>

        <div className="source-actions"><span className="source-badge">{sourceMode === 'url' ? 'Hosted form' : sourceMode === 'upload' ? 'Uploaded form' : 'Live page'} · {sourceLabel}</span><div>{sourceMode === 'url' && <button className="outline-button" onClick={openOriginalForm}><Link size={15} /> Open original form</button>}{sourceMode === 'upload' && <button className="outline-button" onClick={exportAnswers}><Download size={15} /> Export CSV</button>}</div></div>
        <section className="question-panel panel">
          <div className="panel-label"><span className="step-number">01</span><div><p className="eyebrow">Question to answer</p><span className="label-hint">Ask a question or paste one from your RFP</span></div></div>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={3} />
          {detectedQuestions.length > 1 && <div className="detected-list">{detectedQuestions.map((detectedQuestion, index) => <button key={`${detectedQuestion}-${index}`} className={detectedQuestion === question ? 'detected-active' : ''} onClick={() => setQuestion(detectedQuestion)}>Q{String(index + 1).padStart(2, '0')} {detectedQuestion}</button>)}</div>}
          <div className="question-footer"><div className="question-meta"><span className="status-dot" /> Knowledge base connected <span className="divider" /> Tenant: <select value={tenantId} onChange={(event) => setTenantId(event.target.value)}><option value="acme-corp">acme-corp</option><option value="demo-tenant">demo-tenant</option></select></div><button className="primary-button" onClick={generateAnswer} disabled={isGenerating}>{isGenerating ? <RefreshCw className="spin" size={16} /> : <Sparkles size={16} />}{isGenerating ? 'Generating' : 'Generate answer'} <ArrowUpRight size={15} /></button></div>
        </section>

        <div className="workspace-grid">
          <section className="answer-column">
            <div className="section-heading"><div><p className="eyebrow">02 / Draft response</p><h2>Suggested answer</h2></div><span className="live-badge"><span /> {notice.includes('live') ? 'Live' : 'Preview'}</span></div>
            <div className="answer-panel panel">
              <div className="answer-toolbar"><span className="source-label"><Sparkles size={15} /> AI draft</span><button className="ghost-button" onClick={generateAnswer}><RefreshCw size={14} /> Regenerate</button></div>
              <textarea className="answer-editor" value={answer} onChange={(event) => setAnswer(event.target.value)} />
              <div className="answer-footer"><span>{answer.length} characters</span><div className="answer-actions"><button className="reject-button"><ThumbsDown size={15} /> Reject</button><button className="approve-button"><Check size={15} /> Approve answer</button></div></div>
            </div>
            <div className="review-note"><span className="note-icon"><BookOpen size={15} /></span><p><strong>Review before approving.</strong> This draft is grounded in {response.sources.length} retrieved sources. Check that the language matches your current policy.</p></div>
          </section>

          <aside className="sources-column"><div className="section-heading"><div><p className="eyebrow">03 / Evidence</p><h2>Retrieved sources</h2></div><span className="source-count">{response.sources.length} sources</span></div><div className="source-list">{response.sources.map((source, index) => <button key={source.id} className={`source-card ${activeSource === source.id ? 'source-active' : ''}`} onClick={() => setActiveSource(source.id)}><div className="source-card-top"><span className="source-rank">0{index + 1}</span><span className="match-score">{formatScore(Math.min(source.score * 30, 0.99))} match</span></div><strong>{source.question}</strong><p>{source.answer}</p><div className="source-id"><span>{source.id}</span><ArrowUpRight size={14} /></div></button>)}</div></aside>
        </div>

        <div className="bottom-strip"><div className="confidence"><div className="confidence-ring"><span>{Math.round(response.confidence_score * 100)}</span></div><div><p className="eyebrow">Confidence score</p><strong>Strong source alignment</strong><small>Based on semantic and keyword retrieval</small></div></div><div className="shortcut-hint"><span className="key">⌘</span><span className="key">↵</span> Generate answer</div><button className="send-button" title="Send for review"><Send size={16} /> Send for review</button></div>
        </>}
      </main>
    </div>
  )
}

export default App
