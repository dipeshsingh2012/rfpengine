# Chrome Web Store Listing — RFPEngine Response Assistant

> Last Updated: 2026-08-28

---

## Store Listing

**Extension Name** [REQUIRED]
```text
RFPEngine Response Assistant
```

**Short Description** [REQUIRED]
```text
Scan buyer questionnaires, retrieve verified knowledge, and insert human-approved RFP responses.
```
*(97 characters — Max 132 characters)*

**Detailed Description** [REQUIRED]
```text
RFPEngine Response Assistant is a Chrome side panel extension that automates answering repetitive Request for Proposal (RFP), security questionnaire, and vendor assessment forms directly inside your browser.

Key Features:
- Intelligent Questionnaire Scanning: Automatically detects question fields, text areas, radio buttons, and checkboxes across buyer web portals.
- Grounded AI Answering: Retrieves relevant compliance, security, and product documentation from your enterprise knowledge base using hybrid search (BM25 + Dense Vectors).
- Human-in-the-Loop Governance: Review, edit, approve, or reject AI-generated suggestions before anything is written to the buyer's form.
- Direct Form Insertion: Safely populates approved responses into active web page input fields with a single click.
- Source Citation Visibility: Inspect source document references, passage titles, and confidence scores for every answer.

How to Use:
1. Open any vendor questionnaire or RFP web form in Chrome.
2. Click the RFPEngine icon in your toolbar to open the side panel.
3. Click "Scan Form" to detect all questions on the page.
4. Click "Generate Answers" to retrieve verified answers from your knowledge base.
5. Review each answer, make any adjustments, and click "Approve".
6. Click "Insert Answers" to populate the completed responses directly into the form.

Privacy & Security:
RFPEngine only scans form inputs when explicitly triggered by the user. Form questions are transmitted securely via TLS 1.3 to your dedicated RFPEngine backend to query your knowledge base. RFPEngine never sells your data or uses your confidential questionnaires for third-party model training.

Support & Documentation:
For documentation, API keys, and workspace management, visit https://www.rfpengine.net or contact support@rfpengine.net.
```

**Category** [REQUIRED]
```text
Productivity
```

**Single Purpose** [REQUIRED]
```text
Scans buyer questionnaires in the browser, retrieves verified knowledge base answers, and inserts human-approved responses into web forms.
```

**Primary Language** [REQUIRED]
```text
English
```

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|---|---|---|---|
| **Store Icon** [REQUIRED] | 128×128 PNG | ✅ Ready | `extension/icons/icon-128.png` |
| **Screenshot 1** [REQUIRED] | 1280×800 or 640×400 | 🟡 To Capture | `store-assets/screenshot-1-sidepanel.png` |
| **Screenshot 2** [RECOMMENDED] | 1280×800 or 640×400 | 🟡 To Capture | `store-assets/screenshot-2-answering.png` |
| **Screenshot 3** [RECOMMENDED] | 1280×800 or 640×400 | 🟡 To Capture | `store-assets/screenshot-3-form-fill.png` |
| **Small Promo Tile** [RECOMMENDED] | 440×280 PNG | 🟡 Optional | `store-assets/promo-small.png` |
| **Marquee Promo Tile** | 1400×560 PNG | 🟡 Optional | `store-assets/promo-marquee.png` |

---

## Permissions Justification

| Permission | Type | Exact Justification for Google Reviewer |
|---|---|---|
| `sidePanel` | permissions | Enables the side panel UI where users review detected questionnaire items, generate AI suggestions, and manage approval stages alongside the buyer's active webpage. |
| `activeTab` | permissions | Grants temporary read/write access to the current tab when the user clicks the extension action icon to scan form inputs and insert approved answers. |
| `tabs` | permissions | Used to identify the active tab ID and URL when sending scan and form-fill messages between the side panel and the content script. |
| `storage` | permissions | Saves local user preferences (such as custom API endpoint configurations and tenant IDs) across browser sessions. |
| `https://rfpengine-api-714049712844.us-central1.run.app/*` | host_permissions | Allows the extension to communicate with the production RFPEngine backend on Google Cloud Run to perform hybrid search and AI answer generation. |
| `http://localhost:8000/*` | host_permissions | Allows local developers to connect the extension to a local development backend server. |
| `http://localhost:5173/*` | host_permissions | Allows local developers to interact with the local RFPEngine web application. |
| `https://*/*`, `http://*/*` | host_permissions | Enables the content script to detect and fill questionnaire fields on arbitrary third-party buyer portal URLs where RFPs and security questionnaires are hosted. |

---

## Privacy & Data Use

### Data Collection Disclosure

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|---|---|---|---|---|
| **Personally Identifiable Info** | No | No | N/A | No |
| **Health Info** | No | No | N/A | No |
| **Financial Info** | No | No | N/A | No |
| **Authentication Info** | No | No | N/A | No |
| **Personal Communications** | No | No | N/A | No |
| **Location** | No | No | N/A | No |
| **Web History** | No | No | N/A | No |
| **User Activity** | Yes | No | Tracks in-extension approvals and card actions in memory | No |
| **Website Content** | Yes | Yes (to user's backend) | Transmits detected form questions to user's RFPEngine API endpoint to query knowledge base | No |

### Data Use Certification
- [x] Data is **NOT** sold to third parties.
- [x] Data is **NOT** used for purposes unrelated to the extension's core functionality.
- [x] Data is **NOT** used for creditworthiness or lending purposes.

---

## Privacy Policy

**Privacy Policy URL**:
```text
https://www.rfpengine.net/privacy
```

---

## Developer Info

**Publisher Name**: RFPEngine
**Contact Email**: support@rfpengine.net
**Support URL**: https://www.rfpengine.net/support
**Homepage URL**: https://www.rfpengine.net

---

## Version History

| Version | Date | Changes | Status |
|---|---|---|---|
| `0.1.0` | 2026-08-28 | Initial production release: Side panel UI, form scanner, hybrid retrieval answering, and direct field insertion. | Draft |

---

## Packaging for Submission

Run the package script to generate a clean, store-ready ZIP archive:

```bash
npm run package:extension
```

Output file: `dist/rfpengine-extension-v0.1.0.zip`
