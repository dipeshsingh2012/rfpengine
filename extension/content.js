// RFPEngine Content Script — Form Scanner, Auto-Filler & In-Page Injection Overlay

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
  const value = new URLSearchParams(location.hash.slice(1)).get('rfpengine');
  if (!value) return null;
  try {
    return JSON.parse(decodeURIComponent(value));
  } catch {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
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
          if (score > bestScore && score >= 0.35) {
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
  if (field.isContentEditable) {
    field.innerText = value;
  } else {
    const setter = Object.getOwnPropertyDescriptor(field.constructor.prototype, 'value')?.set;
    setter ? setter.call(field, value) : (field.value = value);
  }
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
}

function fillAllHandoffFields() {
  const fields = getScanFields();
  let filledCount = 0;

  fields.forEach((item) => {
    if (item.handoffAnswer && item.element) {
      setFieldValue(item.element, item.handoffAnswer);
      item.element.style.transition = 'all 0.4s ease';
      item.element.style.outline = '3px solid #22c55e';
      item.element.style.backgroundColor = '#f0fdf4';
      setTimeout(() => {
        item.element.style.outline = '';
      }, 3000);
      filledCount++;
    }
  });

  return filledCount;
}

// --- In-Page Injection Floating Overlay ---
function createInPageOverlay() {
  const handoff = formHandoff();
  const fields = getScanFields();
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
    box-shadow: 0 10px 35px rgba(0,0,0,0.35);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 16px;
    animation: rfpSlideUp 0.35s ease-out;
    max-width: 480px;
  `;

  const countText = hasHandoffAnswers
    ? `${answerableFields.length} Approved Answers Ready`
    : `${fields.length} Questionnaire Fields Detected`;

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
        padding: 9px 16px;
        border-radius: 6px;
        border: 0;
        cursor: pointer;
        font-size: 12px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s ease;
      }
      .rfp-btn-glow:hover {
        background: #16a34a;
        color: #ffffff;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
      }
      .rfp-close-icon {
        background: transparent;
        border: 0;
        color: #94a3b8;
        font-size: 18px;
        cursor: pointer;
        padding: 4px;
        line-height: 1;
      }
      .rfp-close-icon:hover {
        color: #ffffff;
      }
    </style>
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="background: #2346b8; width: 32px; height: 32px; border-radius: 6px; display: grid; place-items: center; font-size: 16px; font-weight: bold;">
        ⚡
      </div>
      <div>
        <div style="font-weight: 700; font-size: 13px; letter-spacing: -0.2px;">RFPEngine Assistant</div>
        <div style="font-size: 11px; color: #94a3b8;">${countText}</div>
      </div>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <button class="rfp-btn-glow" id="rfp-auto-fill-btn">
        ⚡ Auto-Fill Form
      </button>
      <button class="rfp-close-icon" id="rfp-dismiss-btn" title="Dismiss">×</button>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('rfp-auto-fill-btn')?.addEventListener('click', () => {
    const filled = fillAllHandoffFields();
    const btn = document.getElementById('rfp-auto-fill-btn');
    if (btn) {
      btn.textContent = `✅ ${filled} Answers Injected!`;
      btn.style.background = '#15803d';
      btn.style.color = '#ffffff';
    }
    setTimeout(() => {
      overlay.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      overlay.style.opacity = '0';
      overlay.style.transform = 'translateY(30px)';
      setTimeout(() => overlay.remove(), 400);
    }, 2500);
  });

  document.getElementById('rfp-dismiss-btn')?.addEventListener('click', () => {
    overlay.remove();
  });
}

// Auto-check and initialize overlay on page load or hash change
window.addEventListener('load', () => {
  setTimeout(createInPageOverlay, 600);
});

window.addEventListener('hashchange', () => {
  createInPageOverlay();
});

// Extension runtime listener
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
  }

  if (message.type === 'FILL_FIELD') {
    const fields = getScanFields();
    const target = fields[message.index];
    if (!target || !target.element) {
      return sendResponse({ ok: false, error: 'Field is no longer on the page.' });
    }
    setFieldValue(target.element, message.answer);
    target.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.element.style.outline = '3px solid #22c55e';
    target.element.style.backgroundColor = '#f0fdf4';
    setTimeout(() => {
      target.element.style.outline = '';
    }, 2000);
    sendResponse({ ok: true });
  }

  if (message.type === 'FILL_ALL_HANDOFF') {
    const filled = fillAllHandoffFields();
    sendResponse({ ok: true, filled });
  }

  return true;
});
