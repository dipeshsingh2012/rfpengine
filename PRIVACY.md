# Privacy Policy — RFPEngine & Chrome Extension

*Last Updated: August 28, 2026*

This Privacy Policy applies to **RFPEngine** and the **RFPEngine Response Assistant** Chrome browser extension.

---

## 1. Core Principles & Single Purpose
RFPEngine's single purpose is to help sellers scan buyer questionnaires, retrieve verified knowledge base passages, and draft human-approved RFP responses.

- **Zero Data Selling**: We never sell your data to data brokers or third parties.
- **Zero Model Training on Customer Data**: We do not use your private enterprise documents or questionnaire text to train public AI foundation models.
- **No Browsing Tracking**: We do not track your general browsing history or monitor web pages in the background.

---

## 2. What Data We Process
- **Questionnaire Fields**: Text of questions detected when the user manually clicks "Scan Form".
- **Knowledge Base Documents**: Enterprise documents and compliance records uploaded by users to their isolated tenant database.
- **Approval States & Edits**: In-progress answer drafts, reviewer role assignments, and approval state transitions.

---

## 3. How Data Is Stored & Protected
- **In Transit**: Encrypted via TLS 1.3.
- **At Rest**: Encrypted via AES-256 in isolated multi-tenant databases (PostgreSQL, Elasticsearch, Pinecone Serverless).
- **AI Inference**: Processed securely via enterprise Google Cloud Vertex AI APIs (`gemini-2.5-flash` & `text-embedding-004`).

---

## 4. User Controls & Deletion
Users can delete any indexed document, passage, or workspace directly from the RFPEngine web interface at any time. Deletions are executed synchronously across relational and vector databases.

---

## 5. Contact Information
For privacy inquiries or compliance requests, contact:
- **Email**: `support@rfpengine.net`
- **Website**: [https://www.rfpengine.net](https://www.rfpengine.net)
- **Live Hosted Privacy Policy**: [https://www.rfpengine.net/privacy.html](https://www.rfpengine.net/privacy.html)
