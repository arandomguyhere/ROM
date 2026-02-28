(function () {
  'use strict';

  // --- State ---
  let romData = null;         // Uint8Array of the loaded file
  let originalData = null;    // Uint8Array snapshot for tracking modifications
  let fileName = '';
  let cursorPos = 0;          // byte offset under cursor
  let selectionStart = -1;
  let selectionEnd = -1;
  let scrollRow = 0;          // first visible row
  let visibleRows = 0;
  let bytesPerRow = 16;
  let editingNibble = false;  // true when user typed the first hex nibble
  let pendingNibble = 0;
  let searchMatches = [];
  let searchIndex = -1;

  // Plugin callback hooks
  let onFileLoadedCallbacks = [];
  let onBeforeSaveCallbacks = [];

  // Undo/redo
  let undoStack = [];
  let redoStack = [];

  // --- DOM refs ---
  const fileInput = document.getElementById('fileInput');
  const openBtn = document.getElementById('openBtn');
  const saveBtn = document.getElementById('saveBtn');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  const searchInput = document.getElementById('searchInput');
  const searchMode = document.getElementById('searchMode');
  const searchBtn = document.getElementById('searchBtn');
  const searchNextBtn = document.getElementById('searchNextBtn');
  const gotoBtn = document.getElementById('gotoBtn');
  const welcomeScreen = document.getElementById('welcomeScreen');
  const welcomeOpenBtn = document.getElementById('welcomeOpenBtn');
  const editorContainer = document.getElementById('editorContainer');
  const fileInfo = document.getElementById('fileInfo');
  const selectionInfo = document.getElementById('selectionInfo');
  const modifiedIndicator = document.getElementById('modifiedIndicator');
  const offsetGutter = document.getElementById('offsetGutter');
  const hexView = document.getElementById('hexView');
  const asciiView = document.getElementById('asciiView');
  const scrollRange = document.getElementById('scrollRange');
  const cursorOffset = document.getElementById('cursorOffset');
  const cursorValue = document.getElementById('cursorValue');
  const fileSize = document.getElementById('fileSize');
  const gotoDialog = document.getElementById('gotoDialog');
  const gotoInput = document.getElementById('gotoInput');
  const gotoCancelBtn = document.getElementById('gotoCancelBtn');
  const gotoOkBtn = document.getElementById('gotoOkBtn');

  // --- File loading ---
  function openFile() {
    fileInput.click();
  }

  fileInput.addEventListener('change', function () {
    const file = fileInput.files[0];
    if (!file) return;
    fileName = file.name;
    const reader = new FileReader();
    reader.onload = function (e) {
      romData = new Uint8Array(e.target.result);
      originalData = new Uint8Array(romData);
      undoStack = [];
      redoStack = [];
      cursorPos = 0;
      selectionStart = -1;
      selectionEnd = -1;
      scrollRow = 0;
      searchMatches = [];
      searchIndex = -1;
      editingNibble = false;
      initEditor();
    };
    reader.readAsArrayBuffer(file);
    fileInput.value = '';
  });

  function initEditor() {
    welcomeScreen.classList.add('hidden');
    editorContainer.classList.remove('hidden');

    fileInfo.textContent = fileName + ' (' + formatSize(romData.length) + ')';
    fileSize.textContent = 'Size: ' + romData.length.toString() + ' bytes (0x' + romData.length.toString(16).toUpperCase() + ')';

    // Enable controls
    saveBtn.disabled = false;
    searchInput.disabled = false;
    searchMode.disabled = false;
    searchBtn.disabled = false;
    searchNextBtn.disabled = false;
    gotoBtn.disabled = false;

    calculateVisibleRows();
    updateScrollRange();
    render();
    updateStatusBar();
    updateModifiedState();
    updateUndoRedoButtons();

    hexView.focus();

    // Notify plugins
    for (let i = 0; i < onFileLoadedCallbacks.length; i++) {
      onFileLoadedCallbacks[i](romData);
    }
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // --- Save ---
  function saveFile() {
    if (!romData) return;
    // Notify plugins before save
    for (let i = 0; i < onBeforeSaveCallbacks.length; i++) {
      onBeforeSaveCallbacks[i](romData);
    }
    const blob = new Blob([romData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'edited.rom';
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Layout ---
  function calculateVisibleRows() {
    const editorHeight = hexView.clientHeight;
    const rowHeight = 22; // matches CSS --row-height
    visibleRows = Math.floor(editorHeight / rowHeight);
    if (visibleRows < 1) visibleRows = 1;
  }

  function totalRows() {
    if (!romData) return 0;
    return Math.ceil(romData.length / bytesPerRow);
  }

  function updateScrollRange() {
    const maxScroll = Math.max(0, totalRows() - visibleRows);
    scrollRange.max = maxScroll;
    scrollRange.value = scrollRow;
  }

  // --- Rendering ---
  function render() {
    if (!romData) return;

    const searchSet = buildSearchSet();
    const currentSearchSet = buildCurrentSearchSet();
    const modifiedSet = buildModifiedSet();
    const selLow = Math.min(selectionStart, selectionEnd);
    const selHigh = Math.max(selectionStart, selectionEnd);

    let gutterHtml = '';
    let hexHtml = '';
    let asciiHtml = '';

    for (let row = 0; row < visibleRows; row++) {
      const rowOffset = (scrollRow + row) * bytesPerRow;
      if (rowOffset >= romData.length) break;

      // Gutter
      gutterHtml += rowOffset.toString(16).toUpperCase().padStart(8, '0') + '\n';

      // Hex + ASCII for this row
      let hexLine = '';
      let asciiLine = '';

      for (let col = 0; col < bytesPerRow; col++) {
        const offset = rowOffset + col;

        if (col === 8) {
          hexLine += '<span class="hex-group-space"></span>';
        }

        if (offset >= romData.length) {
          hexLine += '<span class="hex-byte">  </span>';
          asciiLine += '<span class="ascii-char"> </span>';
          continue;
        }

        const byte = romData[offset];
        const hexStr = byte.toString(16).toUpperCase().padStart(2, '0');

        // Build CSS classes for hex byte
        let cls = 'hex-byte';
        if (offset === cursorPos) cls += ' cursor';
        else if (selectionStart >= 0 && offset >= selLow && offset <= selHigh) cls += ' selected';
        if (modifiedSet.has(offset)) cls += ' modified';
        if (currentSearchSet.has(offset)) cls += ' search-current';
        else if (searchSet.has(offset)) cls += ' search-match';

        hexLine += '<span class="' + cls + '" data-offset="' + offset + '">' + hexStr + '</span>';

        // ASCII
        let asciiCls = 'ascii-char';
        if (offset === cursorPos || (selectionStart >= 0 && offset >= selLow && offset <= selHigh)) {
          asciiCls += ' selected';
        }
        if (byte >= 32 && byte <= 126) {
          const ch = String.fromCharCode(byte);
          const safe = ch.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
          asciiLine += '<span class="' + asciiCls + '">' + safe + '</span>';
        } else {
          asciiLine += '<span class="' + asciiCls + ' non-printable">.</span>';
        }
      }

      hexHtml += hexLine + '\n';
      asciiHtml += asciiLine + '\n';
    }

    offsetGutter.innerHTML = gutterHtml;
    hexView.innerHTML = hexHtml;
    asciiView.innerHTML = asciiHtml;
  }

  function buildSearchSet() {
    const set = new Set();
    for (const match of searchMatches) {
      for (let i = 0; i < match.length; i++) {
        set.add(match.offset + i);
      }
    }
    return set;
  }

  function buildCurrentSearchSet() {
    const set = new Set();
    if (searchIndex >= 0 && searchIndex < searchMatches.length) {
      const match = searchMatches[searchIndex];
      for (let i = 0; i < match.length; i++) {
        set.add(match.offset + i);
      }
    }
    return set;
  }

  function buildModifiedSet() {
    const set = new Set();
    if (!originalData || !romData) return set;
    // Only check visible range for performance
    const startOffset = scrollRow * bytesPerRow;
    const endOffset = Math.min(romData.length, startOffset + visibleRows * bytesPerRow);
    for (let i = startOffset; i < endOffset; i++) {
      if (romData[i] !== originalData[i]) {
        set.add(i);
      }
    }
    return set;
  }

  function updateStatusBar() {
    if (!romData) return;
    cursorOffset.textContent = 'Offset: 0x' + cursorPos.toString(16).toUpperCase().padStart(8, '0') + ' (' + cursorPos + ')';
    if (cursorPos < romData.length) {
      const v = romData[cursorPos];
      cursorValue.textContent = 'Value: 0x' + v.toString(16).toUpperCase().padStart(2, '0') + ' (' + v + ')';
    } else {
      cursorValue.textContent = 'Value: --';
    }
    if (selectionStart >= 0) {
      const low = Math.min(selectionStart, selectionEnd);
      const high = Math.max(selectionStart, selectionEnd);
      selectionInfo.textContent = 'Selection: 0x' + low.toString(16).toUpperCase() + ' - 0x' + high.toString(16).toUpperCase() + ' (' + (high - low + 1) + ' bytes)';
    } else {
      selectionInfo.textContent = '';
    }
  }

  function updateModifiedState() {
    if (!romData || !originalData) return;
    let modified = false;
    for (let i = 0; i < romData.length; i++) {
      if (romData[i] !== originalData[i]) {
        modified = true;
        break;
      }
    }
    if (modified) {
      modifiedIndicator.classList.remove('hidden');
    } else {
      modifiedIndicator.classList.add('hidden');
    }
  }

  function updateUndoRedoButtons() {
    undoBtn.disabled = undoStack.length === 0;
    redoBtn.disabled = redoStack.length === 0;
  }

  // --- Scroll ---
  function ensureCursorVisible() {
    const row = Math.floor(cursorPos / bytesPerRow);
    if (row < scrollRow) {
      scrollRow = row;
    } else if (row >= scrollRow + visibleRows) {
      scrollRow = row - visibleRows + 1;
    }
    scrollRow = Math.max(0, Math.min(scrollRow, totalRows() - visibleRows));
    scrollRange.value = scrollRow;
  }

  scrollRange.addEventListener('input', function () {
    scrollRow = parseInt(scrollRange.value);
    render();
  });

  // Mouse wheel on hex view
  function onWheel(e) {
    if (!romData) return;
    e.preventDefault();
    const delta = Math.sign(e.deltaY) * 3;
    scrollRow = Math.max(0, Math.min(scrollRow + delta, Math.max(0, totalRows() - visibleRows)));
    scrollRange.value = scrollRow;
    render();
  }

  hexView.addEventListener('wheel', onWheel, { passive: false });
  asciiView.addEventListener('wheel', onWheel, { passive: false });
  offsetGutter.addEventListener('wheel', onWheel, { passive: false });

  // --- Click handling ---
  hexView.addEventListener('mousedown', function (e) {
    const target = e.target;
    if (!target.classList.contains('hex-byte')) return;
    const offset = parseInt(target.dataset.offset);
    if (isNaN(offset)) return;

    editingNibble = false;

    if (e.shiftKey && selectionStart >= 0) {
      selectionEnd = offset;
      cursorPos = offset;
    } else {
      cursorPos = offset;
      selectionStart = offset;
      selectionEnd = offset;
    }

    ensureCursorVisible();
    render();
    updateStatusBar();
    hexView.focus();
  });

  // --- Keyboard handling ---
  hexView.addEventListener('keydown', function (e) {
    if (!romData) return;

    const key = e.key;

    // Arrow keys
    if (key === 'ArrowLeft') {
      e.preventDefault();
      editingNibble = false;
      moveCursor(-1, e.shiftKey);
      return;
    }
    if (key === 'ArrowRight') {
      e.preventDefault();
      editingNibble = false;
      moveCursor(1, e.shiftKey);
      return;
    }
    if (key === 'ArrowUp') {
      e.preventDefault();
      editingNibble = false;
      moveCursor(-bytesPerRow, e.shiftKey);
      return;
    }
    if (key === 'ArrowDown') {
      e.preventDefault();
      editingNibble = false;
      moveCursor(bytesPerRow, e.shiftKey);
      return;
    }
    if (key === 'PageUp') {
      e.preventDefault();
      editingNibble = false;
      moveCursor(-bytesPerRow * visibleRows, e.shiftKey);
      return;
    }
    if (key === 'PageDown') {
      e.preventDefault();
      editingNibble = false;
      moveCursor(bytesPerRow * visibleRows, e.shiftKey);
      return;
    }
    if (key === 'Home') {
      e.preventDefault();
      editingNibble = false;
      if (e.ctrlKey) {
        setCursor(0, e.shiftKey);
      } else {
        const rowStart = Math.floor(cursorPos / bytesPerRow) * bytesPerRow;
        setCursor(rowStart, e.shiftKey);
      }
      return;
    }
    if (key === 'End') {
      e.preventDefault();
      editingNibble = false;
      if (e.ctrlKey) {
        setCursor(romData.length - 1, e.shiftKey);
      } else {
        const rowEnd = Math.min(Math.floor(cursorPos / bytesPerRow) * bytesPerRow + bytesPerRow - 1, romData.length - 1);
        setCursor(rowEnd, e.shiftKey);
      }
      return;
    }

    // Ctrl+Z undo
    if (e.ctrlKey && key === 'z') {
      e.preventDefault();
      undo();
      return;
    }
    // Ctrl+Y or Ctrl+Shift+Z redo
    if ((e.ctrlKey && key === 'y') || (e.ctrlKey && e.shiftKey && key === 'Z')) {
      e.preventDefault();
      redo();
      return;
    }
    // Ctrl+G goto
    if (e.ctrlKey && key === 'g') {
      e.preventDefault();
      showGotoDialog();
      return;
    }
    // Ctrl+F find
    if (e.ctrlKey && key === 'f') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
      return;
    }
    // Ctrl+S save
    if (e.ctrlKey && key === 's') {
      e.preventDefault();
      saveFile();
      return;
    }
    // Ctrl+A select all
    if (e.ctrlKey && key === 'a') {
      e.preventDefault();
      selectionStart = 0;
      selectionEnd = romData.length - 1;
      render();
      updateStatusBar();
      return;
    }

    // Hex input
    if (/^[0-9a-fA-F]$/.test(key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      const nibbleVal = parseInt(key, 16);
      if (cursorPos < romData.length) {
        if (!editingNibble) {
          // First nibble: store it, wait for second
          pendingNibble = nibbleVal;
          editingNibble = true;
          // Show partial edit visually - set high nibble
          const oldByte = romData[cursorPos];
          const newByte = (nibbleVal << 4) | (oldByte & 0x0F);
          pushUndo(cursorPos, oldByte, newByte);
          romData[cursorPos] = newByte;
          render();
          updateStatusBar();
          updateModifiedState();
          updateUndoRedoButtons();
        } else {
          // Second nibble: combine and move to next byte
          const prevUndo = undoStack[undoStack.length - 1];
          const newByte = (pendingNibble << 4) | nibbleVal;
          // Update the last undo entry
          if (prevUndo && prevUndo.offset === cursorPos) {
            romData[cursorPos] = newByte;
            prevUndo.newValue = newByte;
          }
          editingNibble = false;
          selectionStart = -1;
          selectionEnd = -1;
          if (cursorPos < romData.length - 1) cursorPos++;
          ensureCursorVisible();
          render();
          updateStatusBar();
          updateModifiedState();
          updateUndoRedoButtons();
        }
      }
    }
  });

  function moveCursor(delta, shift) {
    const newPos = Math.max(0, Math.min(cursorPos + delta, romData.length - 1));
    setCursor(newPos, shift);
  }

  function setCursor(pos, shift) {
    var prevPos = cursorPos;
    cursorPos = pos;
    if (shift) {
      if (selectionStart < 0) selectionStart = prevPos;
      selectionEnd = cursorPos;
    } else {
      selectionStart = -1;
      selectionEnd = -1;
    }
    ensureCursorVisible();
    render();
    updateStatusBar();
  }

  // --- Undo/Redo ---
  function pushUndo(offset, oldValue, newValue) {
    undoStack.push({ offset: offset, oldValue: oldValue, newValue: newValue });
    redoStack = [];
  }

  function undo() {
    if (undoStack.length === 0) return;
    const entry = undoStack.pop();
    romData[entry.offset] = entry.oldValue;
    redoStack.push(entry);
    cursorPos = entry.offset;
    editingNibble = false;
    ensureCursorVisible();
    render();
    updateStatusBar();
    updateModifiedState();
    updateUndoRedoButtons();
  }

  function redo() {
    if (redoStack.length === 0) return;
    const entry = redoStack.pop();
    romData[entry.offset] = entry.newValue;
    undoStack.push(entry);
    cursorPos = entry.offset;
    editingNibble = false;
    ensureCursorVisible();
    render();
    updateStatusBar();
    updateModifiedState();
    updateUndoRedoButtons();
  }

  // --- Search ---
  function performSearch() {
    if (!romData) return;
    const query = searchInput.value.trim();
    if (!query) return;

    searchMatches = [];
    searchIndex = -1;

    let searchBytes;
    if (searchMode.value === 'hex') {
      searchBytes = parseHexSearch(query);
    } else {
      searchBytes = parseTextSearch(query);
    }

    if (!searchBytes || searchBytes.length === 0) return;

    // Find all matches
    for (let i = 0; i <= romData.length - searchBytes.length; i++) {
      let match = true;
      for (let j = 0; j < searchBytes.length; j++) {
        if (romData[i + j] !== searchBytes[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        searchMatches.push({ offset: i, length: searchBytes.length });
      }
    }

    if (searchMatches.length > 0) {
      // Find next match from cursor
      searchIndex = 0;
      for (let i = 0; i < searchMatches.length; i++) {
        if (searchMatches[i].offset >= cursorPos) {
          searchIndex = i;
          break;
        }
      }
      goToSearchMatch();
    }

    render();
    updateStatusBar();
  }

  function searchNext() {
    if (searchMatches.length === 0) return;
    searchIndex = (searchIndex + 1) % searchMatches.length;
    goToSearchMatch();
    render();
  }

  function goToSearchMatch() {
    if (searchIndex < 0 || searchIndex >= searchMatches.length) return;
    cursorPos = searchMatches[searchIndex].offset;
    ensureCursorVisible();
  }

  function parseHexSearch(str) {
    const cleaned = str.replace(/[^0-9a-fA-F]/g, '');
    if (cleaned.length % 2 !== 0) return null;
    const bytes = [];
    for (let i = 0; i < cleaned.length; i += 2) {
      bytes.push(parseInt(cleaned.substring(i, i + 2), 16));
    }
    return bytes;
  }

  function parseTextSearch(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i) & 0xFF);
    }
    return bytes;
  }

  // --- Go to offset ---
  function showGotoDialog() {
    gotoDialog.classList.remove('hidden');
    gotoInput.style.borderColor = '';
    gotoInput.value = cursorPos.toString(16).toUpperCase();
    gotoInput.focus();
    gotoInput.select();
  }

  function hideGotoDialog() {
    gotoDialog.classList.add('hidden');
    hexView.focus();
  }

  function doGoto() {
    const val = parseInt(gotoInput.value, 16);
    if (isNaN(val) || val < 0 || val >= romData.length) {
      gotoInput.style.borderColor = '#f38ba8';
      return;
    }
    cursorPos = val;
    selectionStart = -1;
    selectionEnd = -1;
    editingNibble = false;
    ensureCursorVisible();
    render();
    updateStatusBar();
    hideGotoDialog();
  }

  // --- Event bindings ---
  openBtn.addEventListener('click', openFile);
  welcomeOpenBtn.addEventListener('click', openFile);
  saveBtn.addEventListener('click', saveFile);
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);
  searchBtn.addEventListener('click', performSearch);
  searchNextBtn.addEventListener('click', searchNext);
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchMatches.length > 0) searchNext();
      else performSearch();
    }
  });
  gotoBtn.addEventListener('click', showGotoDialog);
  gotoCancelBtn.addEventListener('click', hideGotoDialog);
  gotoOkBtn.addEventListener('click', doGoto);
  gotoInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      doGoto();
    }
    if (e.key === 'Escape') {
      hideGotoDialog();
    }
  });

  // Resize handling
  window.addEventListener('resize', function () {
    if (!romData) return;
    calculateVisibleRows();
    updateScrollRange();
    render();
  });

  // Prevent default drag behavior
  document.addEventListener('dragover', function (e) {
    e.preventDefault();
  });

  // Drag-and-drop file loading
  document.addEventListener('drop', function (e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    fileName = file.name;
    const reader = new FileReader();
    reader.onload = function (ev) {
      romData = new Uint8Array(ev.target.result);
      originalData = new Uint8Array(romData);
      undoStack = [];
      redoStack = [];
      cursorPos = 0;
      selectionStart = -1;
      selectionEnd = -1;
      scrollRow = 0;
      searchMatches = [];
      searchIndex = -1;
      editingNibble = false;
      initEditor();
    };
    reader.readAsArrayBuffer(file);
  });

  // --- Plugin API ---
  window.RomEditor = {
    onFileLoaded: function (cb) { onFileLoadedCallbacks.push(cb); },
    onBeforeSave: function (cb) { onBeforeSaveCallbacks.push(cb); },
    getData: function () { return romData; },
    getFileName: function () { return fileName; },
    readUint8: function (offset) {
      return romData ? romData[offset] : 0;
    },
    readUint16: function (offset) {
      if (!romData) return 0;
      return (romData[offset] << 8) | romData[offset + 1];
    },
    readUint32: function (offset) {
      if (!romData) return 0;
      return ((romData[offset] << 24) | (romData[offset + 1] << 16) |
              (romData[offset + 2] << 8) | romData[offset + 3]) >>> 0;
    },
    writeByte: function (offset, value) {
      if (!romData || offset < 0 || offset >= romData.length) return;
      var old = romData[offset];
      if (old === value) return;
      pushUndo(offset, old, value);
      romData[offset] = value;
    },
    writeUint16: function (offset, value) {
      this.writeByte(offset, (value >> 8) & 0xFF);
      this.writeByte(offset + 1, value & 0xFF);
    },
    writeUint32: function (offset, value) {
      this.writeByte(offset, (value >>> 24) & 0xFF);
      this.writeByte(offset + 1, (value >> 16) & 0xFF);
      this.writeByte(offset + 2, (value >> 8) & 0xFF);
      this.writeByte(offset + 3, value & 0xFF);
    },
    refresh: function () {
      render();
      updateStatusBar();
      updateModifiedState();
      updateUndoRedoButtons();
    },
    goToOffset: function (offset) {
      if (!romData) return;
      cursorPos = Math.max(0, Math.min(offset, romData.length - 1));
      selectionStart = -1;
      selectionEnd = -1;
      editingNibble = false;
      ensureCursorVisible();
      render();
      updateStatusBar();
    }
  };
})();
