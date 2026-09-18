# RFPEngine Frontend Architecture & UI Design System

## Overview
The RFPEngine frontend is a high-performance, responsive React application built with TypeScript and Vite. It connects to the FastAPI backend and provides tools for questionnaire importing, automated RAG response generation, continuous knowledge base synchronization, and enterprise governance approvals.

---

## Design System & CSS Tokens

All global styling tokens and variables are declared in `src/styles.css` under `:root`.

### Color Palette & Tokens
- `--surface` (`#ffffff`): Primary card, modal, and panel background.
- `--background` (`#f5f2eb`): Application canvas background.
- `--bg-subtle` (`#faf9f5`): Light container and section background.
- `--ink` / `--text` (`#20262d`): Primary typography and high-contrast labels.
- `--muted` (`#7b817f`): Secondary labels, timestamps, and subtitles.
- `--line` / `--border` / `--border-color` (`#ddd9d0`): Standard borders and dividers.
- `--blue` / `--accent` (`#3759d7`): Interactive accent, links, and selected states.
- `--navy` (`#18243b`): Primary dark backgrounds, headers, and main brand marks.
- `--lime` (`#d5f36b`): High-attention primary action button background.
- `--coral` (`#f08267`): User avatars and urgent calls to action.

### Standardized Button Conventions
- `.primary-button`: High-priority primary actions (e.g. Save, Ingest, Generate All).
- `.secondary-button`: Clean white/subtle bordered button for secondary actions (e.g. Refresh, Cancel, Configure).
- `.outline-button`: Transparent bordered buttons with hover states (e.g. Export Deliverable, Open Form).
- `.ghost-button`: Minimal flat buttons for inline toolbar operations.
- `.danger-button`: Destructive actions (e.g. Delete Questionnaire, Revoke Connector).
- `.icon-btn`: Compact square icon button with subtle padding.

### Standardized Modal Architecture
All modals follow a unified overlay pattern:
```tsx
<div className="modal-backdrop" onClick={onClose}>
  <div className="modal-card" onClick={(e) => e.stopPropagation()}>
    <div className="modal-header">
      <div className="modal-title-wrap">
        <h3>Modal Title</h3>
      </div>
      <button className="icon-button" onClick={onClose}><X size={18} /></button>
    </div>
    <div className="modal-body">
      {/* Content or .form-grid */}
    </div>
    <div className="modal-actions">
      <button className="secondary-button" onClick={onClose}>Cancel</button>
      <button className="primary-button" onClick={onSubmit}>Confirm</button>
    </div>
  </div>
</div>
```

---

## Automated UI & CSS Regression Tests

To ensure the UI and CSS never break, the project includes two automated test suites:

1. **CSS & Token Integrity Test (`src/tests/cssIntegrity.test.ts`)**:
   - Parses `src/styles.css` using PostCSS.
   - Scans all React `.tsx` files in `src/`.
   - Asserts that every `className` used in React is defined in `styles.css`.
   - Asserts that all CSS custom properties (`var(--...)`) are defined in `:root`.
   - Asserts zero syntax errors or empty selectors in the stylesheet.

2. **Component Sanity Suite (`src/tests/componentSanity.test.ts`)**:
   - Renders all core views, layouts, and dialogs using `react-dom/server` without browser overhead.
   - Asserts error-free markup generation and prop contract satisfaction across:
     - `AppShell`, `Topbar`, `Sidebar`
     - `HomeWelcomeView`, `ResponsesDashboard`, `QuestionnaireWorkspace`
     - `KnowledgeBaseModal`, `WorkspaceSettingsModal`, `ExportPackageModal`, `ActivityLogModal`

### Running Tests
```bash
npm test
```
The test suite runs with Node 22 native test runner and reports line, branch, and function coverage.

