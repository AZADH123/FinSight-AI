const reports = JSON.parse(document.getElementById('reportData').textContent);
const workspace = document.getElementById('workspace');
const reportSelect = document.getElementById('companySelect');
const reportButtons = document.querySelectorAll('.report-link');

function renderInsightList(id, entries, emptyMessage) {
    const list = document.getElementById(id);
    const items = entries.map(entry => entry.trim()).filter(Boolean);
    list.classList.toggle('no-insights', items.length === 0);
    list.replaceChildren(...(items.length ? items : [emptyMessage]).map(text => {
        const item = document.createElement('li');
        item.textContent = text;
        return item;
    }));
}

function selectReport(index) {
    const report = reports[index];
    reportSelect.value = index;
    document.getElementById('inspectorCompanyName').textContent = report.company;
    document.getElementById('inspectorYear').textContent =
        report.year == null ? 'Fiscal year unavailable' : `Fiscal year ${report.year}`;
    renderInsightList('growthDriversList', report.growthDrivers, 'No growth drivers extracted');
    renderInsightList('riskFactorsList', report.riskFactors, 'No risk factors extracted');
    reportButtons.forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.reportIndex === String(index)));
    });
}

if (reportSelect) {
    reportSelect.addEventListener('change', () => selectReport(reportSelect.value));
    reportButtons.forEach(button => button.addEventListener('click', () => {
        selectReport(button.dataset.reportIndex);
        document.getElementById('insights').scrollIntoView({ block: 'start' });
        reportSelect.focus({ preventScroll: true });
    }));
    selectReport(reportSelect.value);
}

const dropzone = document.getElementById('dropzone');
const uploadButton = document.getElementById('uploadButton');
const emptyUpload = document.getElementById('emptyUpload');
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');
const progressStatus = document.getElementById('progressStatus');
const uploadProgress = document.getElementById('uploadProgress');

uploadButton.addEventListener('click', () => fileInput.click());
emptyUpload?.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
    const [file] = fileInput.files;
    fileInput.value = '';
    if (file) uploadReport(file);
});

dropzone.addEventListener('dragover', event => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = uploadButton.disabled ? 'none' : 'copy';
    dropzone.classList.toggle('is-dragging', !uploadButton.disabled);
});
dropzone.addEventListener('dragleave', event => {
    if (!dropzone.contains(event.relatedTarget)) dropzone.classList.remove('is-dragging');
});
dropzone.addEventListener('drop', event => {
    event.preventDefault();
    dropzone.classList.remove('is-dragging');
    const [file] = event.dataTransfer.files;
    if (file) uploadReport(file);
});

function uploadReport(file) {
    if (uploadButton.disabled) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Choose a PDF financial report', 'error');
        return;
    }

    uploadButton.disabled = true;
    if (emptyUpload) emptyUpload.disabled = true;
    uploadStatus.hidden = false;
    progressStatus.textContent = `Uploading ${file.name}`;
    uploadProgress.removeAttribute('value');

    const request = new XMLHttpRequest();
    const data = new FormData();
    data.append('file', file);
    request.open('POST', '/api/upload');

    request.upload.addEventListener('progress', event => {
        if (event.lengthComputable && event.total > 0) {
            uploadProgress.value = (event.loaded / event.total) * 100;
        }
    });
    request.upload.addEventListener('load', () => {
        progressStatus.textContent = 'Analyzing report';
        uploadProgress.removeAttribute('value');
    });

    function uploadFailed(message) {
        uploadStatus.hidden = true;
        uploadButton.disabled = false;
        if (emptyUpload) emptyUpload.disabled = false;
        showToast(message, 'error');
    }

    request.responseType = 'json';
    request.addEventListener('load', () => {
        if (request.status < 200 || request.status >= 300) {
            uploadFailed(errorMessage(request.response, 'The report could not be analyzed. Try uploading it again.'));
            return;
        }
        progressStatus.textContent = 'Report processed';
        uploadProgress.value = 100;
        window.setTimeout(() => window.location.reload(), 1000);
    });
    request.addEventListener('error', () => uploadFailed('Upload failed. Check your connection and try again.'));
    request.send(data);
}

const chatPanel = document.getElementById('chatPanel');
const openChat = document.getElementById('openChat');
const closeChat = document.getElementById('closeChat');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatContext = document.getElementById('chatCompanySelect');
const chatMessages = document.getElementById('chatMessages');
const sendButton = document.getElementById('sendBtn');

function setChatOpen(open, moveFocus = false) {
    chatPanel.hidden = !open;
    workspace.classList.toggle('chat-open', open);
    openChat.setAttribute('aria-expanded', String(open));
    if (moveFocus) (open ? chatInput : openChat).focus();
}

if (matchMedia('(min-width: 72rem)').matches) setChatOpen(true);
openChat.addEventListener('click', () => setChatOpen(chatPanel.hidden, true));
closeChat.addEventListener('click', () => setChatOpen(false, true));
chatPanel.addEventListener('keydown', event => {
    if (event.key === 'Escape') setChatOpen(false, true);
});

chatForm.addEventListener('submit', async event => {
    event.preventDefault();
    const question = chatInput.value.trim();
    if (!question || sendButton.disabled) return;

    const report = reports[chatContext.value];
    const payload = { question };
    if (report) {
        payload.company = report.company;
        payload.year = Number(report.year);
    }

    const context = chatContext.selectedOptions[0].textContent.trim();
    appendMessage(`You · ${context}`, question, 'question');
    chatInput.value = '';
    chatInput.focus();
    sendButton.disabled = true;
    const pending = appendMessage('Analyst', 'Reading the reports…', 'pending');

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json().catch(() => null);
        pending.remove();
        if (!response.ok) {
            appendMessage('Analyst', errorMessage(data, 'The question could not be answered. Try again.'), 'answer');
        } else {
            appendMessage('Analyst', data?.answer || 'No answer was returned. Try rephrasing the question.', 'answer');
        }
    } catch {
        pending.remove();
        appendMessage('Analyst', 'The chat service could not be reached. Check your connection and try again.', 'answer');
    } finally {
        sendButton.disabled = false;
    }
});

function appendMessage(label, text, kind) {
    const message = document.createElement('div');
    const heading = document.createElement('span');
    const body = document.createElement('p');
    message.className = `message ${kind}`;
    heading.textContent = label;
    body.textContent = text;
    message.append(heading, body);
    chatMessages.append(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return message;
}

function errorMessage(response, fallback) {
    const message = response?.detail || response?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
}

function showToast(message, kind) {
    const toast = document.createElement('div');
    toast.className = `toast ${kind}`;
    toast.textContent = message;
    document.getElementById('toastContainer').append(toast);
    window.setTimeout(() => toast.remove(), 7000);
}
