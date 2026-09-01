const DEFAULT_API_URL = 'https://rfpengine-api-fwwnzie4dq-uc.a.run.app';
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

function currentTab() {
  return new Promise((resolve) =>
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0]))
  );
}

function askTab(message) {
  return currentTab().then(
    (tab) =>
      new Promise((resolve, reject) => {
        if (!tab?.id) return reject(new Error('No active tab found.'));
        chrome.tabs.sendMessage(tab.id, message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error('This page cannot be scanned. Refresh the page or try a standard web page.'));
          } else {
            resolve(response);
          }
        });
      })
  );
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

    const handoffCount = scannedFields.filter((f) => f.handoffAnswer).length;
    const isHandoffMode = handoffCount > 0;

    if (isHandoffMode) {
      pageState.innerHTML = `🟢 <strong>Workspace Handoff Active:</strong> ${handoffCount} answer${
        handoffCount === 1 ? '' : 's'
      } loaded from workspace (No LLM calls required)`;
      generateAllButton.hidden = true; // No need to generate, answers are already loaded
      insertAllButton.hidden = false;
      insertAllButton.textContent = '⚡ Insert Workspace Answers';
    } else {
      pageState.textContent = `${result.title || 'Current page'} · ${scannedFields.length} question${
        scannedFields.length === 1 ? '' : 's'
      } detected`;
      generateAllButton.hidden = false;
      generateAllButton.disabled = scannedFields.length === 0;
      generateAllButton.textContent = '⚡ Generate All Answers (AI)';
    }

    scannedFields.forEach((field, index) => renderQuestion(field, index, isHandoffMode));
  } catch (error) {
    scannedFields = [];
    pageState.innerHTML = `<span class="error">${error.message}</span>`;
  }
}

async function generateAnswer(field, controls) {
  // Flow A: User came from Web App -> Zero LLM call, use handoff draft directly
  if (field.handoffAnswer) {
    controls.answer.value = field.handoffAnswer;
    controls.confidence.textContent = 'Workspace draft';
    controls.sourceBox.innerHTML =
      '<div class="source-line"><strong>rfpengine</strong> Draft from seller workspace (Zero LLM call)</div>';
    controls.sourceBox.hidden = false;
    controls.approve.hidden = false;
    controls.reject.hidden = false;
    return;
  }

  // Flow B: Standalone Direct Form -> Query Live Backend LLM API
  try {
    const result = await fetch(`${API_URL}/api/v1/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: document.querySelector('#tenant').value || 'acme-corp',
        question: field.question,
        top_k: Number(document.querySelector('#top-k').value) || 3,
      }),
    });
    if (!result.ok) throw new Error(`API returned HTTP ${result.status} ${result.statusText}`);
    const data = await result.json();
    controls.answer.value = data.suggested_answer;
    controls.confidence.textContent = `✍️ Proposal Drafter (${Math.round(data.confidence_score * 100)}%)`;
    controls.sourceBox.innerHTML = data.sources
      .map((source) => `<div class="source-line"><strong>${source.id}</strong> ${source.question}</div>`)
      .join('');
    controls.sourceBox.hidden = false;
    controls.approve.hidden = false;
    controls.reject.hidden = false;
  } catch (err) {
    controls.answer.value = `[Error] Unable to reach RFPEngine API at ${API_URL}.\nPlease check backend server status.`;
    controls.confidence.textContent = 'Connection Error';
    controls.sourceBox.innerHTML =
      `<div class="source-line" style="color:#dc2626"><strong>API Error</strong> ${err.message || 'Failed to fetch from backend'}</div>`;
    controls.sourceBox.hidden = false;
    controls.approve.hidden = true;
    controls.reject.hidden = true;
    controls.insert.hidden = true;
  }
}

function renderQuestion(field, index, isHandoffMode) {
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

  // If handoff answer exists from web app, populate immediately!
  if (field.handoffAnswer) {
    answer.value = field.handoffAnswer;
    confidence.textContent = 'Workspace draft';
    sourceBox.innerHTML =
      '<div class="source-line"><strong>rfpengine</strong> Draft from seller workspace (No LLM call needed)</div>';
    sourceBox.hidden = false;
    approve.textContent = 'Ready';
    approve.disabled = true;
    approve.hidden = false;
    reject.hidden = true;
    insert.hidden = false;
    approvedAnswers.set(index, field.handoffAnswer);
  } else {
    insert.hidden = true;
    approve.hidden = true;
    reject.hidden = true;
  }

  approve.addEventListener('click', () => {
    approve.disabled = true;
    approve.textContent = 'Approved';
    insert.hidden = field.canInsert === false;
    approvedAnswers.set(index, answer.value);
    insertAllButton.hidden = false;
  });

  reject.addEventListener('click', () => {
    reject.disabled = true;
    reject.textContent = 'Rejected';
    approve.hidden = true;
    approvedAnswers.delete(index);
    insertAllButton.hidden = approvedAnswers.size === 0;
  });

  questionControls.set(index, { answer, insert });

  insert.addEventListener('click', async () => {
    const result = await askTab({ type: 'FILL_FIELD', index, answer: answer.value });
    if (result.ok) {
      insert.textContent = 'Inserted';
      insert.disabled = true;
    }
  });

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
  }
});

// Auto-scan on sidepanel load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(scan, 200);
});
