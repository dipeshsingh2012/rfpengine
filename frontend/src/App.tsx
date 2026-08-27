import { useState } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  FileText,
  FolderOpen,
  History,
  LayoutGrid,
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

function formatScore(score: number) {
  return `${Math.round(score * 100)}%`
}

function App() {
  const [question, setQuestion] = useState(starterQuestions[0])
  const [tenantId, setTenantId] = useState('acme-corp')
  const [topK, setTopK] = useState(5)
  const [response, setResponse] = useState<SearchResponse>(demoResponse)
  const [answer, setAnswer] = useState(demoResponse.suggested_answer)
  const [activeSource, setActiveSource] = useState(demoResponse.sources[0].id)
  const [isGenerating, setIsGenerating] = useState(false)
  const [notice, setNotice] = useState('Demo data loaded')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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
      setActiveSource(data.sources[0]?.id ?? '')
      setNotice('Draft generated from live sources')
    } catch {
      setResponse(demoResponse)
      setAnswer(demoResponse.suggested_answer)
      setActiveSource(demoResponse.sources[0].id)
      setNotice('Showing demo result. Connect the API for live retrieval.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
          {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="brand-mark"><span>R</span></div>
        <div className="brand-name">RFQ<span>Engine</span></div>
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
        <div className="page-heading">
          <div><p className="breadcrumb">Responses <span>/</span> Northstar security review</p><h1>Response workspace</h1><p className="subtitle">Draft accurate answers from your approved knowledge base.</p></div>
          <button className="outline-button"><Upload size={16} /> Import RFP</button>
        </div>

        <section className="question-panel panel">
          <div className="panel-label"><span className="step-number">01</span><div><p className="eyebrow">Question to answer</p><span className="label-hint">Ask a question or paste one from your RFP</span></div></div>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={3} />
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
      </main>
    </div>
  )
}

export default App
