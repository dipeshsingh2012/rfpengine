import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Filter,
  Layers,
  Lightbulb,
  Plus,
  Search,
  Sparkles,
  Tag,
  ThumbsUp,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import {
  INITIAL_ROADMAP_INITIATIVES,
  RoadmapInitiative,
  RoadmapStage,
  StrategicTheme,
  STAGE_CONFIG,
} from "./roadmapData";

type ViewMode = "kanban" | "rice" | "themes";

interface RoadmapPageProps {
  onNavigateBack: () => void;
  showToast: (msg: string) => void;
}

export const RoadmapPage: React.FC<RoadmapPageProps> = ({ onNavigateBack, showToast }) => {
  const [initiatives, setInitiatives] = useState<RoadmapInitiative[]>(() => {
    const saved = localStorage.getItem("rfpengine.roadmap.initiatives");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_ROADMAP_INITIATIVES;
      }
    }
    return INITIAL_ROADMAP_INITIATIVES;
  });

  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("rfpengine.roadmap.upvoted");
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  const [selectedInitiative, setSelectedInitiative] = useState<RoadmapInitiative | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [themeFilter, setThemeFilter] = useState<string>("all");
  const [personaFilter, setPersonaFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  // New Feature Submission Form State
  const [newTitle, setNewTitle] = useState("");
  const [newProblem, setNewProblem] = useState("");
  const [newPersona, setNewPersona] = useState("Proposal Manager");
  const [newTheme, setNewTheme] = useState<StrategicTheme>("Core AI & Retrieval");

  useEffect(() => {
    localStorage.setItem("rfpengine.roadmap.initiatives", JSON.stringify(initiatives));
  }, [initiatives]);

  useEffect(() => {
    localStorage.setItem("rfpengine.roadmap.upvoted", JSON.stringify([...upvotedIds]));
  }, [upvotedIds]);

  const handleUpvote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isUpvoted = upvotedIds.has(id);
    const nextUpvoted = new Set(upvotedIds);

    setInitiatives((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const delta = isUpvoted ? -1 : 1;
          return { ...item, upvotes: Math.max(0, item.upvotes + delta) };
        }
        return item;
      })
    );

    if (isUpvoted) {
      nextUpvoted.delete(id);
      showToast("Upvote removed");
    } else {
      nextUpvoted.add(id);
      showToast("👍 Feature request upvoted! Added to discovery backlog.");
    }
    setUpvotedIds(nextUpvoted);
  };

  const handleCreateInitiative = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newProblem.trim()) return;

    const newInit: RoadmapInitiative = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim(),
      stage: "discovery",
      theme: newTheme,
      priority: "P1 - High",
      targetPersona: newPersona,
      quarter: "In Backlog",
      summary: newProblem.trim().slice(0, 140) + "...",
      problemStatement: newProblem.trim(),
      userStory: `As a ${newPersona}, I want ${newTitle.trim()}, so that our workflow is streamlined and errors are reduced.`,
      successMetrics: [
        "Customer satisfaction rating > 90%",
        "Adopted by > 50% of active bid teams",
      ],
      acceptanceCriteria: [
        `Given a ${newPersona} user, when they use ${newTitle.trim()}, then expected workflow completes with zero blockers.`,
      ],
      technicalArchitecture: "FastAPI endpoint + React UI integration + Postgres schema extension.",
      rice: { reach: 60, impact: 3, confidence: 70, effort: 3, score: 42.0 },
      upvotes: 1,
      tags: ["Community Request", "Product Discovery"],
    };

    setInitiatives([newInit, ...initiatives]);
    setUpvotedIds((prev) => new Set([...prev, newInit.id]));
    setNewTitle("");
    setNewProblem("");
    setShowSubmitModal(false);
    showToast("🎉 Feature request submitted to Product Discovery board!");
    setSelectedInitiative(newInit);
  };

  const filteredInitiatives = useMemo(() => {
    return initiatives.filter((item) => {
      const matchTheme = themeFilter === "all" || item.theme === themeFilter;
      const matchPersona = personaFilter === "all" || item.targetPersona.includes(personaFilter);
      const matchSearch =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchTheme && matchPersona && matchSearch;
    });
  }, [initiatives, themeFilter, personaFilter, searchQuery]);

  const stages: RoadmapStage[] = ["discovery", "spec", "development", "beta", "shipped"];
  const themes: StrategicTheme[] = [
    "Core AI & Retrieval",
    "Enterprise Governance",
    "Smart Ingestion",
    "Ecosystem Integrations",
    "Collaboration & Workflow",
  ];

  // RICE Sorted
  const riceSorted = useMemo(() => {
    return [...filteredInitiatives].sort((a, b) => b.rice.score - a.rice.score);
  }, [filteredInitiatives]);

  return (
    <div className="roadmap-container">
      {/* Top Header */}
      <header className="roadmap-header">
        <div className="roadmap-header-content">
          <div className="roadmap-header-left">
            <button className="roadmap-back-btn" onClick={onNavigateBack}>
              <ArrowLeft size={16} /> Back to App
            </button>
            <div className="roadmap-badge-live">
              <span className="live-dot" /> Live Product Discovery & Strategy
            </div>
          </div>
          <button className="primary-button" onClick={() => setShowSubmitModal(true)}>
            <Plus size={16} /> Submit Feature Idea
          </button>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="roadmap-hero">
        <div className="roadmap-hero-inner">
          <p className="eyebrow" style={{ color: "var(--blue)" }}>
            PRODUCT MANAGEMENT & STRATEGIC DISCOVERY
          </p>
          <h1>Product Strategy & Innovation Roadmap</h1>
          <p className="roadmap-hero-subtitle">
            Explore active product discovery, feature specifications, RICE scoring, and technical architecture
            driving the next generation of enterprise RFP intelligence.
          </p>

          {/* Key Metrics Bar */}
          <div className="roadmap-stats-row">
            <div className="roadmap-stat-card">
              <span className="stat-num">{initiatives.filter((i) => i.stage === "shipped").length}</span>
              <span className="stat-label">Shipped to Production</span>
            </div>
            <div className="roadmap-stat-card">
              <span className="stat-num">
                {initiatives.filter((i) => i.stage === "development" || i.stage === "beta").length}
              </span>
              <span className="stat-label">Active in Sprints / Beta</span>
            </div>
            <div className="roadmap-stat-card">
              <span className="stat-num">
                {initiatives.filter((i) => i.stage === "discovery" || i.stage === "spec").length}
              </span>
              <span className="stat-label">In Discovery & Spec</span>
            </div>
            <div className="roadmap-stat-card">
              <span className="stat-num">{initiatives.reduce((acc, curr) => acc + curr.upvotes, 0)}</span>
              <span className="stat-label">Community Upvotes</span>
            </div>
          </div>
        </div>
      </section>

      {/* Controls Bar */}
      <div className="roadmap-controls-bar">
        <div className="roadmap-view-switcher">
          <button
            className={`view-tab-btn ${viewMode === "kanban" ? "active" : ""}`}
            onClick={() => setViewMode("kanban")}
          >
            <Layers size={15} /> Kanban Board
          </button>
          <button
            className={`view-tab-btn ${viewMode === "rice" ? "active" : ""}`}
            onClick={() => setViewMode("rice")}
          >
            <BarChart3 size={15} /> RICE Prioritization
          </button>
          <button
            className={`view-tab-btn ${viewMode === "themes" ? "active" : ""}`}
            onClick={() => setViewMode("themes")}
          >
            <TrendingUp size={15} /> Strategic Themes
          </button>
        </div>

        <div className="roadmap-filters">
          <div className="roadmap-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search initiatives, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
                <X size={12} />
              </button>
            )}
          </div>

          <select value={themeFilter} onChange={(e) => setThemeFilter(e.target.value)}>
            <option value="all">All Strategic Themes</option>
            {themes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select value={personaFilter} onChange={(e) => setPersonaFilter(e.target.value)}>
            <option value="all">All Personas</option>
            <option value="Proposal Manager">Proposal Manager</option>
            <option value="Security SME">Security SME</option>
            <option value="Legal Counsel">Legal Counsel</option>
            <option value="RevOps">Head of Sales / RevOps</option>
            <option value="Bid Team">Bid Team</option>
          </select>
        </div>
      </div>

      {/* --- 1. KANBAN BOARD VIEW --- */}
      {viewMode === "kanban" && (
        <div className="kanban-board">
          {stages.map((st) => {
            const stageItems = filteredInitiatives.filter((i) => i.stage === st);
            const cfg = STAGE_CONFIG[st];

            return (
              <div className="kanban-column" key={st}>
                <div className="kanban-column-header">
                  <div className="stage-title-wrap">
                    <span className="stage-icon">{cfg.icon}</span>
                    <h3>{cfg.label}</h3>
                    <span className="stage-count">{stageItems.length}</span>
                  </div>
                  <p className="stage-desc">{cfg.description}</p>
                </div>

                <div className="kanban-cards-list">
                  {stageItems.length === 0 ? (
                    <div className="empty-column-placeholder">No initiatives in this filter</div>
                  ) : (
                    stageItems.map((item) => {
                      const isUpvoted = upvotedIds.has(item.id);

                      return (
                        <article
                          key={item.id}
                          className="kanban-card"
                          onClick={() => setSelectedInitiative(item)}
                        >
                          <div className="kanban-card-top">
                            <span className={`priority-tag ${item.priority.slice(0, 2).toLowerCase()}`}>
                              {item.priority}
                            </span>
                            <span className="quarter-tag">{item.quarter}</span>
                          </div>

                          <h4>{item.title}</h4>
                          <p className="kanban-card-summary">{item.summary}</p>

                          <div className="kanban-card-meta">
                            <span className="meta-persona">
                              <User size={11} /> {item.targetPersona.split("/")[0].trim()}
                            </span>
                            <span className="meta-rice">
                              RICE: <strong>{item.rice.score.toFixed(1)}</strong>
                            </span>
                          </div>

                          <div className="kanban-card-footer">
                            <span className="meta-theme">{item.theme}</span>
                            <button
                              className={`upvote-btn ${isUpvoted ? "upvoted" : ""}`}
                              onClick={(e) => handleUpvote(item.id, e)}
                              title={isUpvoted ? "Remove upvote" : "Upvote feature"}
                            >
                              <ThumbsUp size={12} /> {item.upvotes}
                            </button>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- 2. RICE PRIORITIZATION TABLE VIEW --- */}
      {viewMode === "rice" && (
        <div className="rice-table-container panel">
          <div className="rice-table-header">
            <div>
              <h3>RICE Strategic Prioritization Scoring Matrix</h3>
              <p className="rice-formula-note">
                Formula: <code>(Reach × Impact × Confidence) ÷ Effort = RICE Score</code>. Higher scores represent higher ROI initiatives.
              </p>
            </div>
            <span className="source-count">{riceSorted.length} Ranked Initiatives</span>
          </div>

          <div className="table-responsive">
            <table className="rice-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Initiative</th>
                  <th>Stage</th>
                  <th>Theme</th>
                  <th>Reach</th>
                  <th>Impact</th>
                  <th>Confidence</th>
                  <th>Effort (wks)</th>
                  <th>RICE Score</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {riceSorted.map((item, idx) => {
                  const cfg = STAGE_CONFIG[item.stage];
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedInitiative(item)}
                      className="rice-row"
                    >
                      <td className="rank-cell">#{idx + 1}</td>
                      <td className="title-cell">
                        <strong>{item.title}</strong>
                        <small>{item.targetPersona}</small>
                      </td>
                      <td>
                        <span className={`status-pill ${cfg.badgeClass}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td>
                        <span className="theme-text">{item.theme}</span>
                      </td>
                      <td className="metric-num">{item.rice.reach}</td>
                      <td className="metric-num">{item.rice.impact}x</td>
                      <td className="metric-num">{item.rice.confidence}%</td>
                      <td className="metric-num">{item.rice.effort} wks</td>
                      <td className="score-cell">
                        <strong>{item.rice.score.toFixed(1)}</strong>
                      </td>
                      <td>
                        <button
                          className="inspect-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInitiative(item);
                          }}
                        >
                          View PRD <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- 3. STRATEGIC THEMES VIEW --- */}
      {viewMode === "themes" && (
        <div className="themes-grid">
          {themes.map((th) => {
            const themeItems = filteredInitiatives.filter((i) => i.theme === th);
            const shippedCount = themeItems.filter((i) => i.stage === "shipped").length;
            const progress = themeItems.length > 0 ? (shippedCount / themeItems.length) * 100 : 0;

            return (
              <div className="theme-card panel" key={th}>
                <div className="theme-card-top">
                  <div>
                    <span className="eyebrow">Strategic Pillar</span>
                    <h3>{th}</h3>
                  </div>
                  <span className="theme-count-badge">{themeItems.length} Initiatives</span>
                </div>

                <div className="theme-progress-bar">
                  <div className="theme-progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <div className="theme-progress-labels">
                  <span>{shippedCount} of {themeItems.length} Shipped</span>
                  <span>{Math.round(progress)}% Complete</span>
                </div>

                <div className="theme-initiatives-list">
                  {themeItems.map((item) => (
                    <div
                      key={item.id}
                      className="theme-initiative-row"
                      onClick={() => setSelectedInitiative(item)}
                    >
                      <div className="theme-init-left">
                        <span className="stage-mini-icon">{STAGE_CONFIG[item.stage].icon}</span>
                        <div>
                          <strong>{item.title}</strong>
                          <span className="theme-persona-small">{item.targetPersona}</span>
                        </div>
                      </div>
                      <span className="theme-score-pill">RICE {item.rice.score.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- SLIDE-OVER MINI-PRD DRAWER --- */}
      {selectedInitiative && (
        <div className="prd-drawer-backdrop" onClick={() => setSelectedInitiative(null)}>
          <aside className="prd-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="prd-drawer-header">
              <div>
                <div className="prd-header-tags">
                  <span className={`status-pill ${STAGE_CONFIG[selectedInitiative.stage].badgeClass}`}>
                    {STAGE_CONFIG[selectedInitiative.stage].icon} {STAGE_CONFIG[selectedInitiative.stage].label}
                  </span>
                  <span className={`priority-tag ${selectedInitiative.priority.slice(0, 2).toLowerCase()}`}>
                    {selectedInitiative.priority}
                  </span>
                  <span className="quarter-tag">{selectedInitiative.quarter}</span>
                </div>
                <h2>{selectedInitiative.title}</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setSelectedInitiative(null)}
                aria-label="Close PRD drawer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="prd-drawer-body">
              {/* RICE Matrix Banner */}
              <div className="prd-rice-banner">
                <div className="prd-rice-score-box">
                  <span className="rice-label">RICE SCORE</span>
                  <span className="rice-value">{selectedInitiative.rice.score.toFixed(1)}</span>
                </div>
                <div className="prd-rice-breakdown">
                  <div>
                    <small>Reach</small>
                    <strong>{selectedInitiative.rice.reach}%</strong>
                  </div>
                  <div>
                    <small>Impact</small>
                    <strong>{selectedInitiative.rice.impact}x</strong>
                  </div>
                  <div>
                    <small>Confidence</small>
                    <strong>{selectedInitiative.rice.confidence}%</strong>
                  </div>
                  <div>
                    <small>Effort</small>
                    <strong>{selectedInitiative.rice.effort} wks</strong>
                  </div>
                </div>
                <button
                  className={`upvote-btn-large ${upvotedIds.has(selectedInitiative.id) ? "upvoted" : ""}`}
                  onClick={(e) => handleUpvote(selectedInitiative.id, e)}
                >
                  <ThumbsUp size={14} /> {selectedInitiative.upvotes} Upvotes
                </button>
              </div>

              {/* 1. Problem Statement */}
              <section className="prd-section">
                <h3>
                  <span className="section-number">01</span> The "Why" & Problem Statement
                </h3>
                <div className="prd-callout problem">
                  <p>{selectedInitiative.problemStatement}</p>
                </div>
              </section>

              {/* 2. Target Persona & User Story */}
              <section className="prd-section">
                <h3>
                  <span className="section-number">02</span> User Persona & Agile Story
                </h3>
                <div className="persona-box">
                  <User size={16} color="var(--blue)" />
                  <strong>Target Persona:</strong> {selectedInitiative.targetPersona}
                </div>
                <div className="user-story-card">
                  <p>"{selectedInitiative.userStory}"</p>
                </div>
              </section>

              {/* 3. Target KPIs & Success Metrics */}
              <section className="prd-section">
                <h3>
                  <span className="section-number">03</span> Target KPIs & Success Metrics
                </h3>
                <ul className="metrics-list">
                  {selectedInitiative.successMetrics.map((m, i) => (
                    <li key={i}>
                      <CheckCircle2 size={15} color="#16a34a" /> {m}
                    </li>
                  ))}
                </ul>
              </section>

              {/* 4. Acceptance Criteria */}
              <section className="prd-section">
                <h3>
                  <span className="section-number">04</span> Acceptance Criteria (Gherkin Format)
                </h3>
                <div className="acceptance-list">
                  {selectedInitiative.acceptanceCriteria.map((c, i) => (
                    <div key={i} className="acceptance-card">
                      <code>{c}</code>
                    </div>
                  ))}
                </div>
              </section>

              {/* 5. Technical Architecture */}
              <section className="prd-section">
                <h3>
                  <span className="section-number">05</span> Technical Architecture & Dependencies
                </h3>
                <div className="architecture-box">
                  <p>{selectedInitiative.technicalArchitecture}</p>
                </div>
              </section>

              {/* 6. Tags */}
              <div className="prd-tags-row">
                <Tag size={14} />
                {selectedInitiative.tags.map((tag) => (
                  <span key={tag} className="prd-tag-pill">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* --- SUBMIT FEATURE IDEA MODAL --- */}
      {showSubmitModal && (
        <div className="kb-modal-backdrop" onClick={() => setShowSubmitModal(false)}>
          <div className="kb-modal-container review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="kb-modal-header">
              <h2 style={{ fontSize: "16px", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Lightbulb size={18} color="var(--blue)" /> Submit Product Discovery Idea
              </h2>
              <button className="icon-button" onClick={() => setShowSubmitModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="kb-modal-body" style={{ padding: "20px 24px" }}>
              <p style={{ margin: "0 0 14px", fontSize: "12px", color: "var(--muted)" }}>
                Contribute to our product discovery backlog. Every request undergoes problem validation and RICE scoring.
              </p>
              <form onSubmit={handleCreateInitiative} className="review-modal-form">
                <label>
                  Feature / Initiative Title:
                  <input
                    type="text"
                    required
                    placeholder="e.g. Multi-Language RFP Translation & Localization"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    style={{ border: "1px solid var(--line)", padding: "10px 12px", borderRadius: "4px" }}
                  />
                </label>

                <label>
                  Target User Persona:
                  <select value={newPersona} onChange={(e) => setNewPersona(e.target.value)}>
                    <option value="Proposal Manager">Proposal Manager</option>
                    <option value="Security SME">Security SME</option>
                    <option value="Legal Counsel">Legal Counsel</option>
                    <option value="Head of Sales / RevOps">Head of Sales / RevOps</option>
                    <option value="Bid Team">Bid Team</option>
                  </select>
                </label>

                <label>
                  Strategic Theme:
                  <select value={newTheme} onChange={(e) => setNewTheme(e.target.value as StrategicTheme)}>
                    {themes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Customer Problem Statement (The "Why"):
                  <textarea
                    required
                    placeholder="Describe the specific customer pain point, friction in the bid process, or business cost..."
                    value={newProblem}
                    onChange={(e) => setNewProblem(e.target.value)}
                    rows={4}
                  />
                </label>

                <div className="review-modal-actions">
                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => setShowSubmitModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="primary-button">
                    <Plus size={14} /> Add to Discovery Backlog
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

