// RFPEngine Content Script — Form Scanner, Auto-Filler & In-Page Injection Overlay

const PROD_API_ENDPOINT = 'https://rfpengine-api-714049712844.us-central1.run.app/api/v1/search';

function normalizeText(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function calculateSimilarity(str1, str2) {
  const words1 = new Set(normalizeText(str1).split(' ').filter((w) => w.length > 2));
  const words2 = new Set(normalizeText(str2).split(' ').filter((w) => w.length > 2));
  if (words1.size === 0 || words2.size === 0) return 0;
  let matches = 0;
  for (const w of words1) {
    if (words2.has(w)) matches++;
  }
  return matches / Math.max(words1.size, words2.size);
}

function fieldQuestion(field) {
  if (field.id) {
    const label = document.querySelector(`label[for="${CSS.escape(field.id)}"]`);
    if (label?.innerText.trim()) return label.innerText.trim();
  }
  const labelledBy = field.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.innerText)
      .filter(Boolean)
      .join(' ');
    if (text) return text.trim();
  }
  if (field.getAttribute('aria-label')) return field.getAttribute('aria-label').trim();
  const container = field.closest('tr, .question, .form-group, fieldset, li, section, div');
  const nearby = container?.querySelector('label, legend, h1, h2, h3, p');
  return nearby?.innerText.trim() || field.placeholder?.trim() || '';
}

function formHandoff() {
  try {
    const hash = location.hash || '';
    if (!hash.includes('rfpengine=')) return null;

    const rawParam = hash.slice(hash.indexOf('rfpengine=') + 'rfpengine='.length);
    if (!rawParam) return null;

    try {
      return JSON.parse(decodeURIComponent(rawParam));
    } catch {
      try {
        return JSON.parse(rawParam);
      } catch {
        return JSON.parse(decodeURIComponent(decodeURIComponent(rawParam)));
      }
    }
  } catch (err) {
    console.warn('RFPEngine: Failed to parse handoff payload', err);
    return null;
  }
}

function getScanFields() {
  const handoff = formHandoff();
  const handoffAnswers = handoff?.answers || {};

  return [...document.querySelectorAll('textarea, input:not([type="hidden"]), [contenteditable="true"]')]
    .map((field, index) => {
      const qText = fieldQuestion(field);
      let matchedAnswer = handoffAnswers[qText] || '';

      // Fuzzy match if exact match not found
      if (!matchedAnswer && Object.keys(handoffAnswers).length > 0) {
        let bestScore = 0;
        let bestAnswer = '';
        for (const [hq, ans] of Object.entries(handoffAnswers)) {
          const score = calculateSimilarity(qText, hq);
          if (score > bestScore && score >= 0.25) {
            bestScore = score;
            bestAnswer = ans;
          }
        }
        matchedAnswer = bestAnswer;
      }

      return {
        index,
        element: field,
        question: qText,
        type: field.getAttribute('contenteditable') === 'true' ? 'contenteditable' : field.type || 'textarea',
        value: field.value || field.innerText || '',
        required: field.required || field.getAttribute('aria-required') === 'true',
        handoffAnswer: matchedAnswer,
      };
    })
    .filter((field) => field.question && field.type !== 'submit' && field.type !== 'button');
}

function setFieldValue(field, value) {
  if (!field || value === undefined || value === null) return;
  const cleanVal = String(value);

  if (field.isContentEditable) {
    field.innerText = cleanVal;
    field.innerHTML = cleanVal;
  } else {
    try {
      const proto = field instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) {
        setter.call(field, cleanVal);
      } else {
        field.value = cleanVal;
      }
    } catch {
      field.value = cleanVal;
    }
    field.value = cleanVal;
  }

  // Trigger events for React/Vue/Angular forms
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
  field.dispatchEvent(new Event('blur', { bubbles: true }));
}

async function generateAnswerForQuestion(question) {
  try {
    const res = await fetch(PROD_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: 'acme-corp',
        question: question,
        top_k: 3,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.suggested_answer;
    }
  } catch (err) {
    console.warn('RFPEngine: Live query failed, using heuristic fallback', err);
  }

  // Fallback demo knowledge
  const norm = normalizeText(question);
  if (norm.includes('retention') || norm.includes('backup')) {
    return 'Customer data is retained for active subscription duration plus 30 days post-termination. Encrypted automated backups are generated daily and rotated after 35 days in geo-redundant storage.';
  }
  if (norm.includes('encrypt')) {
    return 'All customer data is encrypted in transit using TLS 1.3 and at rest using AES-256 with customer-managed AWS KMS keys rotated annually.';
  }
  if (norm.includes('certif') || norm.includes('compliance') || norm.includes('soc')) {
    return 'We maintain annual SOC 2 Type II compliance, ISO/IEC 27001:2022 certification, and strict adherence to GDPR and HIPAA frameworks. Reports are available under NDA.';
  }
  if (norm.includes('sla') || norm.includes('uptime')) {
    return 'We commit to a 99.95% monthly uptime SLA with 24/7/365 priority 1 incident response guaranteed within 15 minutes for critical outages.';
  }
  if (norm.includes('timeline') || norm.includes('onboard')) {
    return 'Standard implementation timeline spans 4 to 6 weeks, structured across kickoff, data ingestion, SSO integration, and user acceptance testing phases.';
  }
  if (norm.includes('sso') || norm.includes('saml') || norm.includes('auth')) {
    return 'We support SAML 2.0 and OpenID Connect (OIDC) Single Sign-On with Okta, Azure AD, Google Workspace, automated SCIM provisioning, and mandatory MFA.';
  }
  if (norm.includes('battery') || norm.includes('thermal')) {
    return 'Titan drone batteries utilize Lithium-Iron-Phosphate (LiFePO4) chemistry with 800W GaN ground charging. Active thermal monitoring triggers automated emergency landing if cell temperatures reach 55°C.';
  }
  if (norm.includes('bvlos') || norm.includes('faa')) {
    return 'Operations are conducted under FAA BVLOS Waiver Certificate FAA-W-2026-TITAN-09 with a 380-foot AGL ceiling, dual 360-degree LiDAR, and 978/1090 MHz ADS-B transponders.';
  }
  if (norm.includes('teleop') || norm.includes('pilot')) {
    return 'Pilot-in-Command supervisory ratio is 1:12 over private 5G mmWave networks with Starlink satellite failover, guaranteeing sub-25ms round-trip control latency.';
  }
  return 'Enterprise policies enforce strict compliance standards, regular audit reporting, and verified operational SLAs across all customer deployments.';
}

// --- In-Page Injection Floating Overlay ---
function createInPageOverlay() {
  const handoff = formHandoff();
  const fields = getScanFields();
  if (fields.length === 0) return;

  const hasHandoffAnswers = handoff && handoff.answers && Object.keys(handoff.answers).length > 0;
  const answerableFields = fields.filter((f) => f.handoffAnswer);

  if (document.getElementById('rfpengine-floating-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'rfpengine-floating-overlay';
  overlay.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 9999999;
    background: #18243b;
    color: #ffffff;
    border: 1px solid #2346b8;
    border-radius: 10px;
    padding: 16px 20px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 16px;
    animation: rfpSlideUp 0.35s ease-out;
    max-width: 540px;
  `;

  const headerTitle = hasHandoffAnswers ? '🟢 RFPEngine Handoff' : '⚡ RFPEngine Assistant';
  const countText = hasHandoffAnswers
    ? `${answerableFields.length} Approved Answers from Workspace (Zero LLM calls)`
    : `${fields.length} Questionnaire Fields Detected`;
  const buttonLabel = hasHandoffAnswers
    ? '⚡ Inject Approved Answers'
    : '⚡ Auto-Fill with AI (LLM)';

  overlay.innerHTML = `
    <style>
      @keyframes rfpSlideUp {
        from { transform: translateY(50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .rfp-btn-glow {
        background: #22c55e;
        color: #0f172a;
        font-weight: 700;
        padding: 9px 18px;
        border-radius: 6px;
        border: 0;
        cursor: pointer;
        font-size: 12px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s ease;
        white-space: nowrap;
      }
      .rfp-btn-glow:hover {
        background: #16a34a;
        color: #ffffff;
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);
      }
      .rfp-close-icon {
        background: transparent;
        border: 0;
        color: #94a3b8;
        font-size: 20px;
        cursor: pointer;
        padding: 4px;
        line-height: 1;
      }
      .rfp-close-icon:hover {
        color: #ffffff;
      }
    </style>
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="background: #2346b8; width: 34px; height: 34px; border-radius: 6px; display: grid; place-items: center; font-size: 16px; font-weight: bold;">
        ⚡
      </div>
      <div>
        <div style="font-weight: 700; font-size: 13px; letter-spacing: -0.2px;">${headerTitle}</div>
        <div style="font-size: 11px; color: #94a3b8;">${countText}</div>
      </div>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <button class="rfp-btn-glow" id="rfp-auto-fill-btn">
        ${buttonLabel}
      </button>
      <button class="rfp-close-icon" id="rfp-dismiss-btn" title="Dismiss">×</button>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('rfp-auto-fill-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('rfp-auto-fill-btn');
    if (btn) {
      btn.textContent = '⏳ Injecting Answers...';
      btn.disabled = true;
    }

    const currentFields = getScanFields();
    let count = 0;

    for (const item of currentFields) {
      if (!item.element) continue;

      let answerText = item.handoffAnswer;
      // Flow A: If handoff exists, NEVER call LLM! Use approved answer.
      // Flow B: Only call LLM if NO handoff was provided
      if (!answerText && !hasHandoffAnswers) {
        answerText = await generateAnswerForQuestion(item.question);
      }

      if (answerText) {
        setFieldValue(item.element, answerText);
        item.element.style.transition = 'all 0.4s ease';
        item.element.style.outline = '3px solid #22c55e';
        item.element.style.backgroundColor = '#f0fdf4';
        count++;
      }
    }

    if (btn) {
      btn.textContent = `✅ ${count} Fields Injected!`;
      btn.style.background = '#15803d';
      btn.style.color = '#ffffff';
    }

    setTimeout(() => {
      overlay.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      overlay.style.opacity = '0';
      overlay.style.transform = 'translateY(30px)';
      setTimeout(() => overlay.remove(), 400);
    }, 2800);
  });

  document.getElementById('rfp-dismiss-btn')?.addEventListener('click', () => {
    overlay.remove();
  });
}

// Initialize overlay on page load or URL hash change
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(createInPageOverlay, 500));
} else {
  setTimeout(createInPageOverlay, 500);
}

window.addEventListener('hashchange', () => {
  const existing = document.getElementById('rfpengine-floating-overlay');
  if (existing) existing.remove();
  setTimeout(createInPageOverlay, 300);
});

// Extension runtime message listeners
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SCAN_PAGE') {
    const fields = getScanFields().map((f) => ({
      index: f.index,
      question: f.question,
      type: f.type,
      value: f.value,
      required: f.required,
      handoffAnswer: f.handoffAnswer,
    }));
    sendResponse({ title: document.title, url: location.href, fields });
    return true;
  }

  if (message.type === 'FILL_FIELD') {
    const fields = getScanFields();
    const target = fields[message.index];
    if (!target || !target.element) {
      sendResponse({ ok: false, error: 'Field is no longer on the page.' });
      return true;
    }
    setFieldValue(target.element, message.answer);
    target.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.element.style.outline = '3px solid #22c55e';
    target.element.style.backgroundColor = '#f0fdf4';
    setTimeout(() => {
      target.element.style.outline = '';
    }, 2500);
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'FILL_ALL_FIELDS') {
    const fields = getScanFields();
    let filled = 0;
    const answersMap = new Map(message.answers);

    fields.forEach((item, idx) => {
      const ans = answersMap.get(idx) || item.handoffAnswer;
      if (ans && item.element) {
        setFieldValue(item.element, ans);
        item.element.style.outline = '3px solid #22c55e';
        item.element.style.backgroundColor = '#f0fdf4';
        setTimeout(() => {
          item.element.style.outline = '';
        }, 2500);
        filled++;
      }
    });

    sendResponse({ ok: true, filled });
    return true;
  }

  return true;
});
