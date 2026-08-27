const API_URL = 'http://localhost:8000';
const questions = document.querySelector('#questions');
const template = document.querySelector('#question-template');
const pageState = document.querySelector('#page-state');
const generateAllButton = document.querySelector('#generate-all');
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
  generateAllButton.hidden = false;
  generateAllButton.disabled = true;
  pageState.textContent = 'Scanning questionnaire fields...';
  try {
    const result = await askTab({ type: 'SCAN_PAGE' });
    scannedFields = result.fields;
    questions.replaceChildren();
    generateAllButton.disabled = scannedFields.length === 0;
    pageState.textContent = `${result.title || 'Current page'} · ${scannedFields.length} question${scannedFields.length === 1 ? '' : 's'} detected`;
    scannedFields.forEach((field, index) => renderQuestion(field, index));
  } catch (error) { scannedFields = []; pageState.innerHTML = `<span class="error">${error.message}</span>`; }
}

async function generateAnswer(field, controls) {
  try {
    const result = await fetch(`${API_URL}/api/v1/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant_id: document.querySelector('#tenant').value, question: field.question, top_k: Number(document.querySelector('#top-k').value) }) });
    if (!result.ok) throw new Error('API returned an error.');
    const data = await result.json();
    controls.answer.value = data.suggested_answer;
    controls.confidence.textContent = `${Math.round(data.confidence_score * 100)}% confidence`;
    controls.sourceBox.innerHTML = data.sources.map((source) => `<div class="source-line"><strong>${source.id}</strong> ${source.question}</div>`).join('');
    controls.sourceBox.hidden = false;
    controls.insert.hidden = false;
  } catch (error) {
    controls.confidence.textContent = 'API unavailable';
    controls.sourceBox.innerHTML = `<span class="error">${error.message} Start the backend or use the main app.</span>`;
    controls.sourceBox.hidden = false;
  }
}

function renderQuestion(field, index) {
  const card = template.content.cloneNode(true);
  card.querySelector('.number').textContent = `Q${String(index + 1).padStart(2, '0')}`;
  card.querySelector('.status').textContent = field.required ? 'REQUIRED' : 'OPTIONAL';
  card.querySelector('.question').textContent = field.question;
  const answer = card.querySelector('.answer');
  const insert = card.querySelector('.insert');
  const confidence = card.querySelector('.confidence');
  const sourceBox = card.querySelector('.sources');
  const controls = { answer, insert, confidence, sourceBox };
  insert.hidden = field.canInsert === false;
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
    await generateAnswer(scannedFields[index], { answer, insert, confidence, sourceBox });
  }
  pageState.textContent = `${scannedFields.length} answers ready for review`;
  generateAllButton.disabled = false;
});
