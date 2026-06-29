// ============================================================
// DevStudio — Main Application Logic
// ============================================================

// ===== STATE =====
const state = {
  files: {
    'index.html': `<!DOCTYPE html>
<html lang="az">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mənim Saytım</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <header class="header">
    <h1>Salam Dünya! 👋</h1>
    <p>Bu mənim ilk saytımdır.</p>
  </header>

  <section class="hero">
    <div class="card">
      <h2>Başlamaq Asandır</h2>
      <p>Kodu dəyişdir, nəticəni dərhal gör!</p>
      <button class="btn">Klik Et</button>
    </div>
  </section>

  <script src="app.js"></script>
</body>
</html>`,
    'style.css': `/* Ana Stillər */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: #333;
}

.header {
  text-align: center;
  padding: 40px 20px 20px;
  color: white;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  text-shadow: 0 2px 10px rgba(0,0,0,0.3);
}

.hero {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.card {
  background: white;
  border-radius: 20px;
  padding: 30px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  text-align: center;
}

.card h2 {
  margin-bottom: 12px;
  color: #5a4fcf;
}

.card p {
  color: #666;
  margin-bottom: 20px;
}

.btn {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 50px;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.5);
}`,
    'app.js': `// JavaScript Kodu
document.querySelector('.btn').addEventListener('click', function() {
  alert('Salam! Düymə işləyir! 🎉');
});

console.log('DevStudio ilə hazırlandı ⚡');`
  },
  activeFile: 'index.html',
  activeTab: 'html',
  wordWrap: true,
  isDesktopMode: false,
  selectedElement: null,
  selectedElementCSS: {},
  searchState: { cursor: null },
  folders: { 'src': ['index.html', 'style.css', 'app.js'] },
  previewW: 430
};

let editor = null;
let previewUpdateTimer = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initEditor();
  initFileTree();
  initResizers();
  initKeyboardShortcuts();
  switchTab('html');
  renderPreview();
  createToast();
});

// ===== CODEMIRROR INIT =====
function initEditor() {
  const textarea = document.getElementById('editor');
  // matchTags requires addon-xml-fold.js (findMatchingTag). Only enable if available.
  const hasMatchTags = typeof CodeMirror.findMatchingTag === 'function';
  editor = CodeMirror.fromTextArea(textarea, {
    mode: 'htmlmixed',
    theme: 'monokai',
    lineNumbers: true,
    autoCloseBrackets: true,
    autoCloseTags: true,
    matchBrackets: true,
    matchTags: hasMatchTags ? { bothTags: true } : false,
    foldGutter: true,
    gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false,
    lineWrapping: state.wordWrap,
    extraKeys: {
      'Tab': cm => cm.execCommand('indentMore'),
      'Shift-Tab': cm => cm.execCommand('indentLess'),
      'Ctrl-/': cm => cm.execCommand('toggleComment'),
      'Cmd-/': cm => cm.execCommand('toggleComment'),
      'Ctrl-S': () => saveFile(),
      'Cmd-S': () => saveFile(),
      'Ctrl-D': cm => duplicateLine(cm),
      'Cmd-D': cm => duplicateLine(cm),
      'Alt-Up': cm => moveLine(cm, -1),
      'Alt-Down': cm => moveLine(cm, 1),
      'Ctrl-F': () => openSearch(),
      'Cmd-F': () => openSearch(),
      'Shift-Alt-F': () => formatCode(),
      'Alt-Z': () => toggleWrap(),
      'Ctrl-Z': cm => cm.execCommand('undo'),
      'Ctrl-Y': cm => cm.execCommand('redo'),
      'Ctrl-A': cm => cm.execCommand('selectAll'),
    }
  });

  editor.on('change', () => {
    state.files[state.activeFile] = editor.getValue();
    clearTimeout(previewUpdateTimer);
    previewUpdateTimer = setTimeout(renderPreview, 400);
    updateStatus('● Dəyişdirildi');
  });

  editor.on('cursorActivity', updateCursorPos);
  editor.on('cursorActivity', updateStatus);
}

// ===== FILE TREE =====
function initFileTree() {
  renderFileTree();
}

function renderFileTree() {
  const tree = document.getElementById('file-tree');
  tree.innerHTML = '';

  const fileIcons = {
    html: '🌐', css: '🎨', js: '⚡', json: '📋',
    txt: '📄', svg: '🖼', md: '📝', default: '📄'
  };

  Object.keys(state.files).forEach(filename => {
    const ext = filename.split('.').pop().toLowerCase();
    const icon = fileIcons[ext] || fileIcons.default;

    const item = document.createElement('div');
    item.className = 'tree-item' + (filename === state.activeFile ? ' active' : '');
    item.dataset.file = filename;
    item.innerHTML = `
      <span class="tree-icon">${icon}</span>
      <span class="tree-name">${filename}</span>
      <div class="tree-actions">
        <button class="tree-act-btn" onclick="renameFile(event,'${filename}')" title="Adını dəyiş">✏</button>
        <button class="tree-act-btn" onclick="deleteFile(event,'${filename}')" title="Sil">🗑</button>
      </div>
    `;
    item.addEventListener('click', () => openFileFromTree(filename));
    tree.appendChild(item);
  });
}

function openFileFromTree(filename) {
  saveCurrentFile();
  state.activeFile = filename;

  const ext = filename.split('.').pop().toLowerCase();
  const tabMap = { html: 'html', css: 'css', js: 'js' };
  const tab = tabMap[ext] || 'html';
  switchTab(tab, filename);

  document.querySelectorAll('.tree-item').forEach(i => {
    i.classList.toggle('active', i.dataset.file === filename);
  });
}

// ===== TAB SWITCHING =====
function switchTab(tab, filename = null) {
  state.activeTab = tab;

  document.querySelectorAll('[id^="tab-"]').forEach(b => b.classList.remove('active-tab'));
  const tabBtn = document.getElementById('tab-' + tab);
  if (tabBtn) tabBtn.classList.add('active-tab');

  if (!filename) {
    const extMap = { html: '.html', css: '.css', js: '.js' };
    const ext = extMap[tab];
    const found = Object.keys(state.files).find(f => f.endsWith(ext));
    if (found) filename = found;
    else filename = state.activeFile;
  }

  state.activeFile = filename;
  loadFileToEditor(filename);
  renderFileTree();
}

function loadFileToEditor(filename) {
  if (!editor) return;
  const content = state.files[filename] || '';
  editor.setValue(content);

  const ext = filename.split('.').pop().toLowerCase();
  const modeMap = {
    html: 'htmlmixed',
    css: 'css',
    js: 'javascript',
    json: 'javascript',
    txt: 'null'
  };

  editor.setOption('mode', modeMap[ext] || 'htmlmixed');

  const langMap = { html: 'HTML', css: 'CSS', js: 'JavaScript', json: 'JSON', txt: 'Text' };
  document.getElementById('lang-label').textContent = langMap[ext] || ext.toUpperCase();
  document.getElementById('current-file-path').textContent = filename;

  editor.refresh();
  setTimeout(() => editor.focus(), 50);
}

function saveCurrentFile() {
  if (editor && state.activeFile) {
    state.files[state.activeFile] = editor.getValue();
  }
}

// ===== PREVIEW =====
function renderPreview() {
  saveCurrentFile();

  const html = state.files[Object.keys(state.files).find(f => f.endsWith('.html')) || 'index.html'] || '';
  const css  = state.files[Object.keys(state.files).find(f => f.endsWith('.css')) || 'style.css'] || '';
  const js = state.files[Object.keys(state.files).find(f => f.endsWith('.js')) || 'app.js'] || '';

  // Wrap user JS in DOMContentLoaded so DOM is ready
  const safeJs = `document.addEventListener('DOMContentLoaded', function() {\ntry {\n${js}\n} catch(e) { console.error('Preview JS error:', e); }\n});`;

  const combined = html
    .replace(/<link[^>]+href=["'][^"']*\.css["'][^>]*>/gi, `<style>${css}</style>`)
    .replace(/<script[^>]+src=["'][^"']*\.js["'][^>]*><\/script>/gi, `<script>${safeJs}<\/script>`);

  const frame = document.getElementById('preview-frame');
  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write(combined);
  doc.close();

  // Inject right-click handler into iframe
  setTimeout(() => {
    try {
      const iframeDoc = frame.contentDocument;
      iframeDoc.addEventListener('contextmenu', handlePreviewRightClick);
    } catch (e) { /* cross-origin */ }
  }, 300);
}

function refreshPreview() { renderPreview(); showToast('Preview yeniləndi ↺'); }

function handlePreviewRightClick(e) {
  e.preventDefault();
  const el = e.target;
  state.selectedElement = el;
  showContextMenu(e.clientX, e.clientY, el);
}

// ===== CONTEXT MENU =====
function showContextMenu(x, y, el) {
  const menu = document.getElementById('context-menu');
  menu.style.display = 'block';

  // Load current styles
  if (el) {
    const cs = el.style;
    document.getElementById('ctx-display').value = cs.display || 'block';
    document.getElementById('ctx-width').value = cs.width || '';
    document.getElementById('ctx-height').value = cs.height || '';
    document.getElementById('ctx-padding').value = cs.padding || '';
    document.getElementById('ctx-margin').value = cs.margin || '';
    document.getElementById('ctx-border').value = cs.border || '';
    document.getElementById('ctx-shadow').value = cs.boxShadow || '';

    const bg = rgbToHex(cs.backgroundColor);
    if (bg) {
      document.getElementById('ctx-bgcolor').value = bg;
      document.getElementById('ctx-bgcolor-text').value = bg;
    }
    const color = rgbToHex(cs.color);
    if (color) {
      document.getElementById('ctx-color').value = color;
      document.getElementById('ctx-color-text').value = color;
    }

    const fs = parseInt(cs.fontSize) || 16;
    document.getElementById('ctx-fontsize').value = fs;
    document.getElementById('ctx-fontsize-val').textContent = fs + 'px';

    const op = Math.round((parseFloat(cs.opacity) || 1) * 100);
    document.getElementById('ctx-opacity').value = op;
    document.getElementById('ctx-opacity-val').textContent = op + '%';

    const br = parseInt(cs.borderRadius) || 0;
    document.getElementById('ctx-radius').value = br;
    document.getElementById('ctx-radius-val').textContent = br + 'px';

    // Show element tag
    let tagEl = menu.querySelector('.ctx-element-tag');
    if (!tagEl) {
      tagEl = document.createElement('div');
      tagEl.className = 'ctx-element-tag';
      menu.querySelector('.ctx-header').after(tagEl);
    }
    tagEl.textContent = `<${el.tagName.toLowerCase()}${el.id ? '#'+el.id : ''}${el.className ? '.'+el.className.split(' ').join('.') : ''}>`;
    tagEl.style.display = 'block';

    state.selectedElementCSS = {};
  }

  // Position menu (keep in viewport)
  const rect = menu.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let mx = x + 8, my = y + 8;
  if (mx + 300 > vw) mx = x - 308;
  if (my + 500 > vh) my = Math.max(10, vh - 510);
  menu.style.left = mx + 'px';
  menu.style.top = my + 'px';
}

function applyCSS(prop, value) {
  if (!state.selectedElement) return;
  state.selectedElement.style[prop] = value;
  state.selectedElementCSS[prop] = value;
}

function closeContextMenu() {
  document.getElementById('context-menu').style.display = 'none';
  state.selectedElement = null;
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeContextMenu();
    closeSearch();
  }
});

// Apply CSS changes back to code
function applyCSSToCode() {
  if (!state.selectedElement || Object.keys(state.selectedElementCSS).length === 0) {
    showToast('Heç bir dəyişiklik edilməyib');
    closeContextMenu();
    return;
  }

  // Build inline style string
  const cssProps = Object.entries(state.selectedElementCSS)
    .map(([k, v]) => `${camelToKebab(k)}: ${v}`)
    .join('; ');

  // Find the CSS file and try to add/update a rule
  const cssFile = Object.keys(state.files).find(f => f.endsWith('.css'));
  if (!cssFile) {
    showToast('CSS faylı tapılmadı');
    return;
  }

  // Try to determine selector from element
  const el = state.selectedElement;
  let selector = el.tagName.toLowerCase();
  if (el.id) selector = '#' + el.id;
  else if (el.className && typeof el.className === 'string') {
    const cls = el.className.trim().split(/\s+/)[0];
    if (cls) selector = '.' + cls;
  }

  const cssRule = `\n/* DevStudio Edit */\n${selector} {\n  ${cssProps.replace(/; /g, ';\n  ')};\n}\n`;

  state.files[cssFile] += cssRule;

  // If CSS tab is active, update editor
  if (state.activeFile === cssFile) {
    editor.setValue(state.files[cssFile]);
  }

  renderPreview();
  closeContextMenu();
  showToast(`✓ "${selector}" koda tətbiq edildi`);
}

function syncColor(type, val) {
  if (!/^#[0-9a-f]{6}$/i.test(val) && !/^rgb/i.test(val)) return;
  if (type === 'bgcolor') {
    document.getElementById('ctx-bgcolor').value = val;
    applyCSS('backgroundColor', val);
  } else {
    document.getElementById('ctx-color').value = val;
    applyCSS('color', val);
  }
}

// ===== FILE OPERATIONS =====
function newFile() {
  document.getElementById('modal-overlay').style.display = 'block';
  document.getElementById('new-file-modal').style.display = 'block';
  setTimeout(() => document.getElementById('new-filename').focus(), 50);
}

function createNewFile() {
  const name = document.getElementById('new-filename').value.trim();
  if (!name) return;

  const ext = name.split('.').pop().toLowerCase();
  const defaults = {
    html: '<!DOCTYPE html>\n<html lang="az">\n<head>\n  <meta charset="UTF-8">\n  <title>Yeni Səhifə</title>\n</head>\n<body>\n  \n</body>\n</html>',
    css: '/* Yeni CSS Faylı */\n',
    js: '// Yeni JavaScript Faylı\n'
  };

  state.files[name] = defaults[ext] || '';
  closeModal();
  renderFileTree();
  openFileFromTree(name);
  showToast(`✓ "${name}" yaradıldı`);
}

function addFile() { newFile(); }

function addFolder() {
  const name = prompt('Qovluq adı:');
  if (!name) return;
  showToast(`📁 "${name}" qovluğu (local saxlama üçün simvol)`);
}

function renameFile(e, filename) {
  e.stopPropagation();
  const newName = prompt('Yeni ad:', filename);
  if (!newName || newName === filename) return;
  state.files[newName] = state.files[filename];
  delete state.files[filename];
  if (state.activeFile === filename) state.activeFile = newName;
  renderFileTree();
  showToast(`✓ "${filename}" → "${newName}"`);
}

function deleteFile(e, filename) {
  e.stopPropagation();
  if (Object.keys(state.files).length <= 1) { showToast('Son faylı silmək olmaz'); return; }
  if (!confirm(`"${filename}" faylını silmək istəyirsiniz?`)) return;
  delete state.files[filename];
  if (state.activeFile === filename) {
    state.activeFile = Object.keys(state.files)[0];
    loadFileToEditor(state.activeFile);
  }
  renderFileTree();
  showToast(`🗑 "${filename}" silindi`);
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
  document.getElementById('new-filename').value = '';
}

document.getElementById('new-filename').addEventListener('keydown', e => {
  if (e.key === 'Enter') createNewFile();
  if (e.key === 'Escape') closeModal();
});

// ===== SAVE / DOWNLOAD =====
function saveFile() {
  saveCurrentFile();
  updateStatus('✓ Saxlanıldı');
  showToast('✓ Saxlanıldı (local)');
}

function downloadFile() {
  saveCurrentFile();
  const filename = state.activeFile;
  const content = state.files[filename];
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  showToast(`⬇ "${filename}" endirildi`);
}

function downloadZip() {
  saveCurrentFile();
  showToast('📦 ZIP üçün JSZip kitabxanası lazımdır (növbəti addım)');
  // ZIP functionality requires JSZip - stub for now
  // Full implementation in next step
  const files = state.files;
  let readme = '# DevStudio Layihəsi\n\nFayllar:\n';
  Object.keys(files).forEach(f => { readme += `- ${f}\n`; });

  // Download all files individually as fallback
  Object.entries(files).forEach(([name, content]) => {
    setTimeout(() => {
      const blob = new Blob([content], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
    }, Object.keys(files).indexOf(name) * 300);
  });
}

function openFile() {
  document.getElementById('upload-input').click();
}

function uploadFile() {
  document.getElementById('upload-input').click();
}

function handleUpload(input) {
  const files = Array.from(input.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      state.files[file.name] = e.target.result;
      renderFileTree();
      openFileFromTree(file.name);
      showToast(`⬆ "${file.name}" yükləndi`);
    };
    reader.readAsText(file);
  });
  input.value = '';
}

// ===== EDITOR ACTIONS =====
function toggleWrap() {
  state.wordWrap = !state.wordWrap;
  editor.setOption('lineWrapping', state.wordWrap);
  showToast('Word Wrap: ' + (state.wordWrap ? 'Açıq' : 'Bağlı'));
}

function toggleComment() {
  if (!editor) return;
  editor.execCommand('toggleComment');
}

function formatCode() {
  const val = editor.getValue();
  const ext = state.activeFile.split('.').pop().toLowerCase();
  let formatted = val;

  if (ext === 'js') {
    try { formatted = js_beautify(val, { indent_size: 2 }); } catch (e) { formatted = val; }
  } else if (ext === 'html') {
    try { formatted = html_beautify(val, { indent_size: 2 }); } catch (e) { formatted = val; }
  } else if (ext === 'css') {
    try { formatted = css_beautify(val, { indent_size: 2 }); } catch (e) { formatted = val; }
  }

  editor.setValue(formatted);
  showToast('⚙ Kod formatlandı');
}

function duplicateLine(cm) {
  const cursor = cm.getCursor();
  const line = cm.getLine(cursor.line);
  cm.replaceRange('\n' + line, { line: cursor.line, ch: line.length });
  cm.setCursor({ line: cursor.line + 1, ch: cursor.ch });
}

function moveLine(cm, direction) {
  const cursor = cm.getCursor();
  const line = cursor.line;
  const targetLine = line + direction;
  if (targetLine < 0 || targetLine >= cm.lineCount()) return;

  const currentContent = cm.getLine(line);
  const targetContent = cm.getLine(targetLine);

  cm.replaceRange(currentContent, { line: targetLine, ch: 0 }, { line: targetLine, ch: targetContent.length });
  cm.replaceRange(targetContent, { line: line, ch: 0 }, { line: line, ch: currentContent.length });
  cm.setCursor({ line: targetLine, ch: cursor.ch });
}

// ===== SEARCH =====
function openSearch() {
  const bar = document.getElementById('search-bar');
  bar.classList.add('visible');
  document.getElementById('search-input').focus();
}

function closeSearch() {
  document.getElementById('search-bar').classList.remove('visible');
}

function doSearch() {
  const query = document.getElementById('search-input').value;
  if (!query) return;
  editor.execCommand('find');
}

function doReplace() {
  const from = document.getElementById('search-input').value;
  const to = document.getElementById('replace-input').value;
  if (!from) return;
  const cursor = editor.getSearchCursor(from, editor.getCursor());
  if (cursor.findNext()) {
    cursor.replace(to);
    showToast('Əvəzləndi');
  } else {
    showToast('Tapılmadı');
  }
}

function doReplaceAll() {
  const from = document.getElementById('search-input').value;
  const to = document.getElementById('replace-input').value;
  if (!from) return;
  let count = 0;
  const cursor = editor.getSearchCursor(from);
  while (cursor.findNext()) { cursor.replace(to); count++; }
  showToast(`${count} yer əvəzləndi`);
}

// ===== DEVICE TOGGLE =====
function togglePreviewDevice() {
  state.isDesktopMode = !state.isDesktopMode;
  const frame = document.getElementById('phone-frame');
  const sizeLabel = document.getElementById('preview-size-label');
  const btn = document.getElementById('device-btn');

  if (state.isDesktopMode) {
    frame.classList.add('desktop-mode');
    sizeLabel.textContent = 'Desktop';
    btn.textContent = '🖥';
  } else {
    frame.classList.remove('desktop-mode');
    sizeLabel.textContent = '375×667';
    btn.textContent = '📱';
  }
}

// ===== STATUS / CURSOR =====
function updateCursorPos() {
  const cursor = editor.getCursor();
  document.getElementById('cursor-pos').textContent = `Ln ${cursor.line + 1}, Col ${cursor.ch + 1}`;
}

function updateStatus(msg = null) {
  if (typeof msg === 'string') {
    document.getElementById('status-left').textContent = msg;
    setTimeout(() => {
      document.getElementById('status-left').textContent = '✓ Hazır';
    }, 2000);
  }
}

function changeFontSize(size) {
  document.querySelector('.CodeMirror').style.fontSize = size + 'px';
  document.getElementById('zoomVal').textContent = size + 'px';
}

// ===== RESIZERS =====
function initResizers() {
  // Sidebar resizer
  const sidebarResizer = document.getElementById('sidebar-resizer');
  const sidebar = document.getElementById('sidebar');
  let isDraggingSidebar = false;

  sidebarResizer.addEventListener('mousedown', e => {
    isDraggingSidebar = true;
    sidebarResizer.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });

  // Preview resizer
  const previewResizer = document.getElementById('preview-resizer');
  const previewPanel = document.getElementById('preview-panel');
  let isDraggingPreview = false;
  let startX, startW;

  previewResizer.addEventListener('mousedown', e => {
    isDraggingPreview = true;
    previewResizer.classList.add('dragging');
    startX = e.clientX;
    startW = previewPanel.offsetWidth;
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (isDraggingSidebar) {
      const newW = Math.min(400, Math.max(120, e.clientX));
      sidebar.style.width = newW + 'px';
    }

    if (isDraggingPreview) {
      const delta = startX - e.clientX;
      const newW = Math.min(800, Math.max(200, startW + delta));
      previewPanel.style.width = newW + 'px';
      const size = document.getElementById('phone-frame');
      if (!state.isDesktopMode) {
        document.getElementById('preview-size-label').textContent = `${newW}px`;
      }
    }
  });

  document.addEventListener('mouseup', () => {
    isDraggingSidebar = false;
    isDraggingPreview = false;
    sidebarResizer.classList.remove('dragging');
    previewResizer.classList.remove('dragging');
    document.body.style.cursor = '';
  });
}

// ===== KEYBOARD SHORTCUTS =====
function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveFile();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      openSearch();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      newFile();
    }
  });
}

// ===== TOAST =====
function createToast() {
  if (!document.getElementById('toast')) {
    const t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ===== UTILS =====
function rgbToHex(rgb) {
  if (!rgb || rgb === 'transparent' || rgb === '') return null;
  if (rgb.startsWith('#')) return rgb;
  const m = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!m) return null;
  return '#' + [m[1], m[2], m[3]].map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
}

function camelToKebab(str) {
  return str.replace(/([A-Z])/g, match => '-' + match.toLowerCase());
}
