const DEFAULT_API_URL = 'https://rfpengine-api-714049712844.us-central1.run.app';
let API_URL = DEFAULT_API_URL;

if (typeof chrome !== 'undefined' && chrome.storage?.local) {
  chrome.storage.local.get(['rfpengine_api_url'], (res) => {
    if (res?.rfpengine_api_url) {
      API_URL = res.rfpengine_api_url.trim().replace(/\/$/, '');
    }
  });
}

const questions = document.querySelector('#questions');
const template = document.querySelector('#question-template');
const pageState = document.querySelector('#page-state');
const generateAllButton = document.querySelector('#generate-all');
const insertAllButton = document.querySelector('#insert-all');
let scannedFields = [];
const approvedAnswers = new Map();
const questionControls = new Map();

function demoAnswerFor(question) {
  const normalized = question.toLowerCase();
  if (normalized.includes('encrypt')) return 'Customer data is encrypted in transit using TLS 1.2 or higher and at rest using AES-256. Encryption keys are managed through a restricted key-management service.';
  if (normalized.includes('certif') || normalized.includes('compliance')) return 'Our security program is aligned with industry best practices, and we maintain current SOC 2 Type II and ISO 27001 certifications. Current reports are available under NDA.';
  if (normalized.includes('implement') || normalized.includes('timeline')) return 'A standard implementation typically takes 4 to 8 weeks, depending on integrations, data preparation, and stakeholder availability.';
  if (normalized.includes('support')) return 'The platform includes email support, a searchable help center, and an assigned customer success contact.';
  return 'Customer data is retained for 30 days after account termination. Encrypted backups are rotated after 35 days.';
}

function currentTab() {
  return new Promise((resolve) => chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0])));
}

function askTab(message) {
  return currentTab().then((tab) => new Promise((resolve, reject) => {
    if (!tab?.id) return reject(new Error('No active tab found.'));
    chrome.tabs.sendMessage(tab.id, message, (response) => {
      if (chrome.runtime.lastError) reject(new Error('This page cannot be scanned. Try a normal web page.'));
      else resolve(response);
    });
  }));
}

async function scan() {
  generateAllButton.hidden = false;
  generateAllButton.disabled = true;
  pageState.textContent = 'Scanning questionnaire fields...';
  try {
    const result = await askTab({ type: 'SCAN_PAGE' });
    scannedFields = result.fields;
    approvedAnswers.clear();
    questionControls.clear();
    insertAllButton.hidden = true;
    questions.replaceChildren();
    generateAllButton.disabled = scannedFields.length === 0;
    pageState.textContent = `${result.title || 'Current page'} · ${scannedFields.length} question${scannedFields.length === 1 ? '' : 's'} detected`;
    scannedFields.forEach((field, index) => renderQuestion(field, index));
  } catch (error) { scannedFields = []; pageState.innerHTML = `<span class="error">${error.message}</span>`; }
}

async function generateAnswer(field, controls) {
  if (field.handoffAnswer) {
    controls.answer.value = field.handoffAnswer;
    controls.confidence.textContent = 'Approved workspace draft';
    controls.sourceBox.innerHTML = '<div class="source-line"><strong>rfpengine</strong> Draft handed off from the seller workspace</div>';
    controls.sourceBox.hidden = false;
    controls.approve.hidden = false;
    controls.reject.hidden = false;
    return;
  }
  try {
    const result = await fetch(`${API_URL}/api/v1/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant_id: document.querySelector('#tenant').value, question: field.question, top_k: Number(document.querySelector('#top-k').value) }) });
    if (!result.ok) throw new Error('API returned an error.');
    const data = await result.json();
    controls.answer.value = data.suggested_answer;
    controls.confidence.textContent = `${Math.round(data.confidence_score * 100)}% confidence`;
    controls.sourceBox.innerHTML = data.sources.map((source) => `<div class="source-line"><strong>${source.id}</strong> ${source.question}</div>`).join('');
    controls.sourceBox.hidden = false;
    controls.approve.hidden = false;
    controls.reject.hidden = false;
  } catch (error) {
    controls.answer.value = demoAnswerFor(field.question);
    controls.confidence.textContent = '84% demo confidence';
    controls.sourceBox.innerHTML = '<div class="source-line"><strong>demo-kb</strong> Sample approved seller knowledge (API not connected)</div>';
    controls.sourceBox.hidden = false;
    controls.approve.hidden = false;
    controls.reject.hidden = false;
  }
}

function renderQuestion(field, index) {
  const card = template.content.cloneNode(true);
  card.querySelector('.number').textContent = `Q${String(index + 1).padStart(2, '0')}`;
  card.querySelector('.status').textContent = field.required ? 'REQUIRED' : 'OPTIONAL';
  card.querySelector('.question').textContent = field.question;
  const answer = card.querySelector('.answer');
  const approve = card.querySelector('.approve');
  const reject = card.querySelector('.reject');
  const insert = card.querySelector('.insert');
  const confidence = card.querySelector('.confidence');
  const sourceBox = card.querySelector('.sources');
  const controls = { answer, approve, reject, insert, confidence, sourceBox };
  insert.hidden = true;
  approve.hidden = true;
  reject.hidden = true;
  approve.addEventListener('click', () => { approve.disabled = true; approve.textContent = 'Approved'; insert.hidden = field.canInsert === false; });
  approve.addEventListener('click', () => { approvedAnswers.set(index, answer.value); insertAllButton.hidden = false; });
  reject.addEventListener('click', () => { reject.disabled = true; reject.textContent = 'Rejected'; approve.hidden = true; approvedAnswers.delete(index); insertAllButton.hidden = approvedAnswers.size === 0; });
  questionControls.set(index, { answer, insert });
  insert.addEventListener('click', async () => { const result = await askTab({ type: 'FILL_FIELD', index, answer: answer.value }); if (result.ok) { insert.textContent = 'Inserted'; insert.disabled = true; } });
  questions.append(card);
}

document.querySelector('#scan').addEventListener('click', scan);

generateAllButton.addEventListener('click', async () => {
  generateAllButton.disabled = true;
  for (let index = 0; index < scannedFields.length; index += 1) {
    pageState.textContent = `Generating answer ${index + 1} of ${scannedFields.length}...`;
    const card = questions.children[index];
    const answer = card.querySelector('.answer');
    const insert = card.querySelector('.insert');
    const confidence = card.querySelector('.confidence');
    const sourceBox = card.querySelector('.sources');
    const approve = card.querySelector('.approve');
    await generateAnswer(scannedFields[index], { answer, insert, confidence, sourceBox, approve });
    approvedAnswers.set(index, answer.value);
    insert.hidden = false;
  }
  pageState.textContent = `${scannedFields.length} answers ready for injection`;
  generateAllButton.disabled = false;
  insertAllButton.hidden = false;
  insertAllButton.textContent = '⚡ Insert All Answers into Form';
});

insertAllButton.addEventListener('click', async () => {
  insertAllButton.disabled = true;
  insertAllButton.textContent = 'Injecting...';
  
  // Ensure all answers in cards are gathered
  for (let index = 0; index < scannedFields.length; index += 1) {
    const card = questions.children[index];
    const answer = card?.querySelector('.answer');
    if (answer?.value) {
      approvedAnswers.set(index, answer.value);
    }
  }

  const result = await askTab({
    type: 'FILL_ALL_FIELDS',
    answers: Array.from(approvedAnswers.entries()),
  });

  if (result?.ok) {
    pageState.textContent = `✅ ${result.filled || approvedAnswers.size} answers inserted into form fields!`;
    insertAllButton.textContent = '✅ All Answers Inserted';
    questions.querySelectorAll('.insert').forEach((btn) => {
      btn.textContent = 'Inserted';
      btn.disabled = true;
    });
  } else {
    // Fallback item by item
    let inserted = 0;
    for (const [index, answer] of approvedAnswers) {
      const res = await askTab({ type: 'FILL_FIELD', index, answer });
      if (res?.ok) {
        questionControls.get(index)?.insert && (questionControls.get(index).insert.textContent = 'Inserted');
        inserted += 1;
      }
    }
    pageState.textContent = `✅ ${inserted} answers inserted into the form!`;
    insertAllButton.textContent = '✅ Answers Inserted';
  }
});
