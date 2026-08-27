function fieldQuestion(field) {
  if (field.id) {
    const label = document.querySelector(`label[for="${CSS.escape(field.id)}"]`);
    if (label?.innerText.trim()) return label.innerText.trim();
  }
  const labelledBy = field.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.innerText).filter(Boolean).join(' ');
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
  try { return JSON.parse(value); } catch { return null; }
}

function scanFields() {
  const handoff = formHandoff();
  return [...document.querySelectorAll('textarea, input:not([type="hidden"]), [contenteditable="true"]')]
    .map((field, index) => ({
      index,
      question: fieldQuestion(field),
      type: field.getAttribute('contenteditable') === 'true' ? 'contenteditable' : field.type || 'textarea',
      value: field.value || field.innerText || '',
      required: field.required || field.getAttribute('aria-required') === 'true',
      handoffAnswer: handoff?.answers?.[fieldQuestion(field)] || '',
    }))
    .filter((field) => field.question && field.type !== 'submit');
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SCAN_PAGE') {
    sendResponse({ title: document.title, url: location.href, fields: scanFields() });
  }
  if (message.type === 'FILL_FIELD') {
    const fields = [...document.querySelectorAll('textarea, input:not([type="hidden"]), [contenteditable="true"]')]
      .filter((field) => fieldQuestion(field));
    const field = fields[message.index];
    if (!field) return sendResponse({ ok: false, error: 'Field is no longer on the page.' });
    setFieldValue(field, message.answer);
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    field.style.outline = '3px solid #d5f36b';
    window.setTimeout(() => { field.style.outline = ''; }, 1800);
    sendResponse({ ok: true });
  }
  return true;
});
