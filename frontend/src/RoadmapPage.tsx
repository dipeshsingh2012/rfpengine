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
  RotateCcw,
  GripVertical,
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
  apiBaseUrl?: string;
}

const CLOUD_RUN_PROD_API = "https://rfpengine-api-714049712844.us-central1.run.app/api";

function resolveApiBase(): string {
  const envUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
  if (!envUrl || envUrl === "/api") {
    if (typeof window !== "undefined" && window.location.hostname && !window.location.hostname.includes("localhost") && window.location.hostname !== "127.0.0.1") {
      return CLOUD_RUN_PROD_API;
    }
    return "/api";
  }
  if (!envUrl.startsWith("/") && !envUrl.endsWith("/api")) {
    return `${envUrl}/api`;
  }
  return envUrl;
}

export const RoadmapPage: React.FC<RoadmapPageProps> = ({ onNavigateBack, showToast, apiBaseUrl }) => {
  const resolvedBase = apiBaseUrl || resolveApiBase();
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
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(false);

  // Drag-and-Drop Kanban State
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<RoadmapStage | null>(null);

  // Continuous Discovery & Opportunity Framing State (Teresa Torres + JTBD)
  const [newTitle, setNewTitle] = useState("");
  const [newPersona, setNewPersona] = useState("Proposal Manager");
  const [newTheme, setNewTheme] = useState<StrategicTheme>("Smart Ingestion");
  const [newSituation, setNewSituation] = useState("");
  const [newWorkaround, setNewWorkaround] = useState("");
  const [newOutcome, setNewOutcome] = useState("");
  const [newHypothesis, setNewHypothesis] = useState("");

  // Load initiatives from PostgreSQL database on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchFromDb() {
      try {
        setIsLoadingDb(true);
        const res = await fetch(`${resolvedBase}/v1/roadmap`);
        if (res.ok) {
          const data: RoadmapInitiative[] = await res.json();
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setInitiatives(data);
            localStorage.setItem("rfpengine.roadmap.initiatives", JSON.stringify(data));
          }
        }
      } catch (err) {
        console.warn("Could not sync roadmap from database (using offline local cache):", err);
      } finally {
        if (isMounted) setIsLoadingDb(false);
      }
    }
    fetchFromDb();
    return () => {
      isMounted = false;
    };
  }, [resolvedBase]);

  useEffect(() => {
    localStorage.setItem("rfpengine.roadmap.initiatives", JSON.stringify(initiatives));
  }, [initiatives]);

  useEffect(() => {
    localStorage.setItem("rfpengine.roadmap.upvoted", JSON.stringify([...upvotedIds]));
  }, [upvotedIds]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggedItemId(id);
  };

  const handleDragOver = (e: React.DragEvent, stage: RoadmapStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStage !== stage) {
      setDragOverStage(stage);
    }
  };

  const handleDragLeave = (e: React.DragEvent, stage: RoadmapStage) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverStage === stage) {
      setDragOverStage(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStage: RoadmapStage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedItemId;
    setDragOverStage(null);
    setDraggedItemId(null);

    if (!id) return;

    const targetItem = initiatives.find((i) => i.id === id);
    if (!targetItem || targetItem.stage === targetStage) return;

    const updatedQuarter = targetStage === "shipped" ? "Shipped" : targetItem.quarter === "Shipped" ? "In Backlog" : targetItem.quarter;

    // Optimistic UI update
    setInitiatives((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, stage: targetStage, quarter: updatedQuarter };
        }
        return item;
      })
    );

    const cfg = STAGE_CONFIG[targetStage];
    showToast(`Moved "${targetItem.title}" to ${cfg.label} ${cfg.icon}`);

    // Sync with PostgreSQL
    try {
      await fetch(`${resolvedBase}/v1/roadmap/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: targetStage, quarter: updatedQuarter }),
      });
    } catch (err) {
      console.warn("Failed to persist stage change to database:", err);
    }
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverStage(null);
  };

  const handleResetToDefault = async () => {
    if (window.confirm("Reset all roadmap initiatives back to default backlog in database?")) {
      setInitiatives(INITIAL_ROADMAP_INITIATIVES);
      localStorage.removeItem("rfpengine.roadmap.initiatives");
      showToast("🔄 Roadmap restored to default product backlog.");
      try {
        await fetch(`${resolvedBase}/v1/roadmap/reset`, { method: "POST" });
      } catch (err) {
        console.warn("Failed to reset database roadmap:", err);
      }
    }
  };

  const handleUpvote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isUpvoted = upvotedIds.has(id);
    const nextUpvoted = new Set(upvotedIds);
    const delta = isUpvoted ? -1 : 1;

    // Optimistic UI update
    setInitiatives((prev) =>
      prev.map((item) => {
        if (item.id === id) {
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

    // Sync with PostgreSQL
    try {
      await fetch(`${resolvedBase}/v1/roadmap/${id}/upvote?delta=${delta}`, {
        method: "POST",
      });
    } catch (err) {
      console.warn("Failed to persist upvote to database:", err);
    }
  };

  const handleCreateInitiative = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSituation.trim()) return;

    const fullProblem = `Context: ${newSituation.trim()}\n\nCurrent Workaround: ${newWorkaround.trim() || "Manual copy-pasting and email coordination across departments."}`;
    const userStory = `As a ${newPersona}, when ${newSituation.trim()}, I want ${newHypothesis.trim() || newTitle.trim()}, so that ${newOutcome.trim() || "our proposal turnaround time is reduced with zero errors"}.`;

    const newInit: RoadmapInitiative = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim(),
      stage: "discovery",
      theme: newTheme,
      priority: "P1 - High",
      targetPersona: newPersona,
      quarter: "In Discovery",
      summary: newSituation.trim().slice(0, 130) + "...",
      problemStatement: fullProblem,
      userStory: userStory,
      successMetrics: [
        newOutcome.trim() || "Reduce questionnaire completion time by > 50%",
        `Adopted by > 75% of active ${newPersona} users`,
        "Zero unverified hallucinations or compliance errors",
      ],
      acceptanceCriteria: [
        `Given a ${newPersona} user encountering: "${newSituation.trim().slice(0, 80)}...",`,
        `When they utilize: "${(newHypothesis.trim() || newTitle.trim()).slice(0, 80)}",`,
        `Then they achieve: "${(newOutcome.trim() || "streamlined delivery").slice(0, 80)}" without resorting to manual workarounds.`,
      ],
      technicalArchitecture:
        "To be determined during technical refinement spike with engineering leads.",
      rice: { reach: 70, impact: 3, confidence: 75, effort: 3, score: 52.5 },
      upvotes: 1,
      tags: ["Continuous Discovery", "Opportunity", "JTBD", "Community Backlog"],
    };

    // Optimistic UI update
    setInitiatives([newInit, ...initiatives]);
    setUpvotedIds((prev) => new Set([...prev, newInit.id]));
    setNewTitle("");
    setNewSituation("");
    setNewWorkaround("");
    setNewOutcome("");
    setNewHypothesis("");
    setShowSubmitModal(false);
    showToast("🎉 Customer Opportunity captured in PostgreSQL Discovery Backlog!");
    setSelectedInitiative(newInit);

    // Sync with PostgreSQL
    try {
      await fetch(`${resolvedBase}/v1/roadmap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newInit),
      });
    } catch (err) {
      console.warn("Failed to persist new opportunity to database:", err);
    }
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

          <button
            className="outline-button"
            style={{ padding: "7px 11px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "5px", color: "var(--muted)" }}
            onClick={handleResetToDefault}
            title="Reset to default roadmap backlog"
          >
            <RotateCcw size={12} /> Reset
          </button>
        </div>
      </div>

      {/* --- 1. KANBAN BOARD VIEW (DRAG AND DROP) --- */}
      {viewMode === "kanban" && (
        <div className="kanban-board">
          {stages.map((st) => {
            const stageItems = filteredInitiatives.filter((i) => i.stage === st);
            const cfg = STAGE_CONFIG[st];
            const isColumnDragOver = dragOverStage === st;

            return (
              <div
                className={`kanban-column ${isColumnDragOver ? "is-drag-over" : ""}`}
                key={st}
                onDragOver={(e) => handleDragOver(e, st)}
                onDragLeave={(e) => handleDragLeave(e, st)}
                onDrop={(e) => handleDrop(e, st)}
              >
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
                    <div className={`empty-column-placeholder ${isColumnDragOver ? "active-drop-zone" : ""}`}>
                      {isColumnDragOver ? "📥 Drop here to move" : "No initiatives in this filter"}
                    </div>
                  ) : (
                    stageItems.map((item) => {
                      const isUpvoted = upvotedIds.has(item.id);
                      const isItemDragging = draggedItemId === item.id;

                      return (
                        <article
                          key={item.id}
                          className={`kanban-card ${isItemDragging ? "is-dragging" : ""}`}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, item.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => setSelectedInitiative(item)}
                        >
                          <div className="kanban-card-top">
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <GripVertical size={13} className="drag-handle-icon" />
                              <span className={`priority-tag ${item.priority.slice(0, 2).toLowerCase()}`}>
                                {item.priority}
                              </span>
                            </div>
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
                {selectedInitiative.stage === "discovery" ? (
                  <div
                    style={{
                      background: "#fffbeb",
                      border: "1px solid #fef08a",
                      padding: "14px 16px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      color: "#92400e",
                      lineHeight: "1.55",
                    }}
                  >
                    <strong style={{ display: "block", marginBottom: "4px", color: "#b45309" }}>
                      ⏳ Pending Engineering Refinement & Technical Spike
                    </strong>
                    In continuous product discovery, the problem space, customer friction, and success metrics are validated first. Technical architecture, data models, and API dependencies will be scoped collaboratively with engineering leads during the <em>In Spec & Design</em> phase.
                  </div>
                ) : (
                  <div className="architecture-box">
                    <p>{selectedInitiative.technicalArchitecture}</p>
                  </div>
                )}
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

      {/* --- CONTINUOUS DISCOVERY & OPPORTUNITY INTAKE MODAL (Teresa Torres + JTBD) --- */}
      {showSubmitModal && (
        <div className="kb-modal-backdrop" onClick={() => setShowSubmitModal(false)}>
          <div className="kb-modal-container review-modal" style={{ maxWidth: "640px" }} onClick={(e) => e.stopPropagation()}>
            <div className="kb-modal-header">
              <div>
                <h2 style={{ fontSize: "16px", margin: "0 0 4px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Lightbulb size={18} color="var(--blue)" /> Frame Customer Opportunity
                </h2>
                <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>
                  Continuous Discovery Framework (Teresa Torres OST + Jobs-to-be-Done)
                </span>
              </div>
              <button className="icon-button" onClick={() => setShowSubmitModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="kb-modal-body" style={{ padding: "20px 24px", maxHeight: "80vh", overflowY: "auto" }}>
              <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: "4px", padding: "10px 14px", marginBottom: "16px", fontSize: "11px", color: "var(--navy)", lineHeight: "1.45" }}>
                <strong>💡 Product Discovery Principle:</strong> Great product teams discover the <em>unmet customer need and current workaround</em> before locking into specific technical implementations.
              </div>

              <form onSubmit={handleCreateInitiative} className="review-modal-form">
                <label>
                  1. Opportunity / Problem Title:
                  <input
                    type="text"
                    required
                    placeholder="e.g. Automated Spreadsheet Column Mapping for 300-Row Questionnaires"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    style={{ border: "1px solid var(--line)", padding: "10px 12px", borderRadius: "4px" }}
                  />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
                    Strategic Pillar:
                    <select value={newTheme} onChange={(e) => setNewTheme(e.target.value as StrategicTheme)}>
                      {themes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  2. Situation & Trigger (When...):
                  <textarea
                    required
                    placeholder="When in the procurement cycle does this pain happen? (e.g. When a buyer provides a multi-tab Excel spreadsheet with custom merged headers...)"
                    value={newSituation}
                    onChange={(e) => setNewSituation(e.target.value)}
                    rows={3}
                  />
                </label>

                <label>
                  3. Current Workaround (How does the team cope today?):
                  <textarea
                    placeholder="e.g. Today, our bid team manually copies 300 questions one-by-one into Google Docs, emails 4 engineers, and pastes them back..."
                    value={newWorkaround}
                    onChange={(e) => setNewWorkaround(e.target.value)}
                    rows={2}
                  />
                </label>

                <label>
                  4. Desired Outcome & Success KPI:
                  <input
                    type="text"
                    placeholder="e.g. Reduce questionnaire completion time from 3 days to < 2 hours with 0 errors"
                    value={newOutcome}
                    onChange={(e) => setNewOutcome(e.target.value)}
                    style={{ border: "1px solid var(--line)", padding: "10px 12px", borderRadius: "4px" }}
                  />
                </label>

                <label>
                  5. Proposed Solution Hypothesis (How might we solve this?):
                  <textarea
                    placeholder="e.g. A client-side WebAssembly parser with column heuristics and 1-click in-place export..."
                    value={newHypothesis}
                    onChange={(e) => setNewHypothesis(e.target.value)}
                    rows={2}
                  />
                </label>

                <div className="review-modal-actions" style={{ marginTop: "12px" }}>
                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => setShowSubmitModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="primary-button">
                    <Plus size={14} /> Frame Opportunity in Backlog
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

