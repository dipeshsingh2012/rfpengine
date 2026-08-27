const API_URL = 'http://localhost:8000';
const questions = document.querySelector('#questions');
const template = document.querySelector('#question-template');
const pageState = document.querySelector('#page-state');
let scannedFields = [];

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
  try {
    const result = await askTab({ type: 'SCAN_PAGE' });
    scannedFields = result.fields;
    questions.replaceChildren();
    pageState.textContent = `${result.title || 'Current page'} · ${scannedFields.length} question${scannedFields.length === 1 ? '' : 's'} detected`;
    scannedFields.forEach((field, index) => renderQuestion(field, index));
  } catch (error) { pageState.innerHTML = `<span class="error">${error.message}</span>`; }
}

function renderQuestion(field, index) {
  const card = template.content.cloneNode(true);
  card.querySelector('.number').textContent = `Q${String(index + 1).padStart(2, '0')}`;
  card.querySelector('.status').textContent = field.required ? 'REQUIRED' : 'OPTIONAL';
  card.querySelector('.question').textContent = field.question;
  const answer = card.querySelector('.answer');
  const generate = card.querySelector('.generate');
  const insert = card.querySelector('.insert');
  const confidence = card.querySelector('.confidence');
  const sourceBox = card.querySelector('.sources');
  generate.addEventListener('click', async () => {
    generate.disabled = true;
    generate.textContent = 'Searching...';
    try {
      const result = await fetch(`${API_URL}/api/v1/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant_id: document.querySelector('#tenant').value, question: field.question, top_k: Number(document.querySelector('#top-k').value) }) });
      if (!result.ok) throw new Error('API returned an error.');
      const data = await result.json();
      answer.value = data.suggested_answer;
      confidence.textContent = `${Math.round(data.confidence_score * 100)}% confidence`;
      sourceBox.innerHTML = data.sources.map((source) => `<div class="source-line"><strong>${source.id}</strong> ${source.question}</div>`).join('');
      sourceBox.hidden = false;
      insert.hidden = false;
      generate.textContent = 'Regenerate';
    } catch (error) { confidence.textContent = 'API unavailable'; sourceBox.innerHTML = `<span class="error">${error.message} Start the backend or use the main app.</span>`; sourceBox.hidden = false; generate.textContent = 'Retry'; }
    generate.disabled = false;
  });
  insert.addEventListener('click', async () => { const result = await askTab({ type: 'FILL_FIELD', index, answer: answer.value }); if (result.ok) { insert.textContent = 'Inserted'; insert.disabled = true; } });
  questions.append(card);
}

document.querySelector('#scan').addEventListener('click', scan);
