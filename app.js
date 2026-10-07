const pdfjsLib = window.pdfjsLib;
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
const { PDFDocument } = window.PDFLib;
const elements = {
  fileInput: document.querySelector("#file-input"),
  dropZone: document.querySelector("#drop-zone"),
  fileList: document.querySelector("#file-list"),
  fileCount: document.querySelector("#file-count"),
  uploadStatus: document.querySelector("#upload-status"),
  workspace: document.querySelector("#page-workspace"),
  emptyState: document.querySelector("#empty-state"),
  caption: document.querySelector("#workspace-caption"),
  selectAll: document.querySelector("#select-all"),
  deselectAll: document.querySelector("#deselect-all"),
  pageRanges: document.querySelector("#page-ranges"),
  applyRanges: document.querySelector("#apply-ranges"),
  rangeError: document.querySelector("#range-error"),
  selectedList: document.querySelector("#selected-list"),
  selectedEmpty: document.querySelector("#selected-empty"),
  selectedCount: document.querySelector("#selected-count"),
  summaryCount: document.querySelector("#summary-count"),
  previewButton: document.querySelector("#preview-button"),
  downloadButton: document.querySelector("#download-button"),
  outputStatus: document.querySelector("#output-status"),
  previewDialog: document.querySelector("#preview-dialog"),
  previewFrame: document.querySelector("#preview-frame"),
  previewCaption: document.querySelector("#preview-caption"),
  closePreview: document.querySelector("#close-preview"),
  toast: document.querySelector("#toast"),
};

const documents = [];
const selectedPages = [];
let nextDocumentId = 1;
let activeObjectUrl = null;
let toastTimeout;

function pageKey(documentId, pageNumber) {
  return `${documentId}:${pageNumber}`;
}

function getDocument(documentId) {
  return documents.find((document) => document.id === documentId);
}

function showToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden", "bg-slate-900", "bg-rose-700");
  elements.toast.classList.add(isError ? "bg-rose-700" : "bg-slate-900");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => elements.toast.classList.add("hidden"), 3200);
}

function setStatus(element, message = "") {
  element.textContent = message;
  element.classList.toggle("hidden", !message);
}

function renderFileList() {
  elements.fileCount.textContent = `${documents.length} ${documents.length === 1 ? "file" : "files"}`;
  elements.fileList.replaceChildren();

  for (const document of documents) {
    const card = window.document.createElement("div");
    card.className = "flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3";
    const icon = window.document.createElement("span");
    icon.className = "grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-[10px] font-extrabold text-rose-600";
    icon.textContent = "PDF";
    const details = window.document.createElement("div");
    details.className = "min-w-0 flex-1";
    const name = window.document.createElement("p");
    name.className = "truncate text-xs font-semibold text-slate-800";
    name.title = document.file.name;
    name.textContent = document.file.name;
    const info = window.document.createElement("p");
    info.className = "mt-0.5 text-[11px] text-slate-500";
    info.textContent = document.loading ? "Reading pages…" : `${document.pageCount} ${document.pageCount === 1 ? "page" : "pages"}`;
    details.append(name, info);
    const remove = window.document.createElement("button");
    remove.type = "button";
    remove.className = "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600";
    remove.setAttribute("aria-label", `Remove ${document.file.name}`);
    remove.innerHTML = '<svg viewBox="0 0 24 24" fill="none" class="h-4 w-4" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 13h11l1-13M9 7V4h6v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    remove.addEventListener("click", () => removeDocument(document.id));
    card.append(icon, details, remove);
    elements.fileList.append(card);
  }
}

function renderWorkspace() {
  elements.workspace.querySelectorAll("[data-document-section]").forEach((section) => section.remove());
  elements.emptyState.classList.toggle("hidden", documents.length > 0);
  const readyDocuments = documents.filter((document) => !document.loading && !document.error);
  const totalPages = readyDocuments.reduce((total, document) => total + document.pageCount, 0);
  elements.caption.textContent = documents.length
    ? `${totalPages} ${totalPages === 1 ? "page" : "pages"} across ${documents.length} ${documents.length === 1 ? "PDF" : "PDFs"}`
    : "Upload a PDF to see its pages here.";
  elements.selectAll.disabled = totalPages === 0;
  elements.deselectAll.disabled = selectedPages.length === 0;

  for (const document of documents) {
    const section = window.document.createElement("section");
    section.dataset.documentSection = document.id;
    const heading = window.document.createElement("div");
    heading.className = "mb-3 flex items-center justify-between gap-3";
    const title = window.document.createElement("h3");
    title.className = "max-w-[75%] truncate text-xs font-bold text-slate-700";
    title.textContent = document.file.name;
    const tag = window.document.createElement("span");
    tag.className = "shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500";
    tag.textContent = document.loading ? "Preparing…" : document.error ? "Could not read" : `${document.pageCount} pages`;
    heading.append(title, tag);
    section.append(heading);

    if (document.error) {
      const error = window.document.createElement("p");
      error.className = "rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700";
      error.textContent = document.error;
      section.append(error);
    } else if (document.loading) {
      const loading = window.document.createElement("div");
      loading.className = "flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-xs text-slate-500";
      loading.innerHTML = '<span class="spinner h-4 w-4 rounded-full border-2 border-slate-300 border-t-indigo-600"></span>';
      const label = window.document.createElement("span");
      label.textContent = document.progress || "Preparing document…";
      loading.append(label);
      section.append(loading);
    } else {
      const grid = window.document.createElement("div");
      grid.className = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-5";
      for (let pageNumber = 1; pageNumber <= document.pageCount; pageNumber += 1) {
        const card = window.document.createElement("button");
        card.type = "button";
        card.dataset.pageKey = pageKey(document.id, pageNumber);
        card.setAttribute("aria-pressed", String(isSelected(document.id, pageNumber)));
        card.setAttribute("aria-label", `${isSelected(document.id, pageNumber) ? "Deselect" : "Select"} page ${pageNumber} from ${document.file.name}`);
        card.className = `page-card group overflow-hidden rounded-xl border bg-white text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md ${isSelected(document.id, pageNumber) ? "is-selected" : "border-slate-200"}`;
        const preview = window.document.createElement("div");
        preview.className = "relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-slate-100";
        const canvas = document.thumbnails[pageNumber - 1];
        if (canvas) {
          canvas.className = "h-full w-full object-contain";
          preview.append(canvas);
        } else {
          preview.innerHTML = '<span class="spinner h-5 w-5 rounded-full border-2 border-slate-300 border-t-indigo-600"></span>';
        }
        const check = window.document.createElement("span");
        check.className = "page-check absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-md border border-slate-300 bg-white text-[11px] font-bold text-transparent shadow-sm";
        check.textContent = "✓";
        preview.append(check);
        const footer = window.document.createElement("div");
        footer.className = "flex items-center justify-between gap-2 px-2.5 py-2";
        const pageLabel = window.document.createElement("span");
        pageLabel.className = "text-[11px] font-semibold text-slate-600";
        pageLabel.textContent = `Page ${pageNumber}`;
        const sourceLabel = window.document.createElement("span");
        sourceLabel.className = "text-[10px] text-slate-400";
        sourceLabel.textContent = `Doc ${documents.indexOf(document) + 1}`;
        footer.append(pageLabel, sourceLabel);
        card.append(preview, footer);
        card.addEventListener("click", () => togglePage(document.id, pageNumber));
        grid.append(card);
      }
      section.append(grid);
    }
    elements.workspace.append(section);
  }
}

function renderSelectedPages() {
  elements.selectedList.querySelectorAll("[data-selected-key]").forEach((item) => item.remove());
  elements.selectedEmpty.classList.toggle("hidden", selectedPages.length > 0);
  const count = selectedPages.length;
  elements.selectedCount.textContent = `${count} ${count === 1 ? "page" : "pages"}`;
  elements.summaryCount.textContent = String(count);
  elements.previewButton.disabled = count === 0;
  elements.downloadButton.disabled = count === 0;
  elements.deselectAll.disabled = count === 0;

  selectedPages.forEach((page, index) => {
    const source = getDocument(page.documentId);
    if (!source) return;
    const item = document.createElement("div");
    item.dataset.selectedKey = pageKey(page.documentId, page.pageNumber);
    item.draggable = true;
    item.className = "flex cursor-grab items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 active:cursor-grabbing";
    item.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", item.dataset.selectedKey);
      event.dataTransfer.effectAllowed = "move";
      item.classList.add("opacity-50");
    });
    item.addEventListener("dragend", () => item.classList.remove("opacity-50"));
    item.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    });
    item.addEventListener("drop", (event) => {
      event.preventDefault();
      const draggedKey = event.dataTransfer.getData("text/plain");
      const targetKey = item.dataset.selectedKey;
      const from = selectedPages.findIndex((entry) => pageKey(entry.documentId, entry.pageNumber) === draggedKey);
      const to = selectedPages.findIndex((entry) => pageKey(entry.documentId, entry.pageNumber) === targetKey);
      if (from < 0 || to < 0 || from === to) return;
      const [moved] = selectedPages.splice(from, 1);
      selectedPages.splice(to, 0, moved);
      renderSelectedPages();
    });

    const order = document.createElement("span");
    order.className = "grid h-6 w-6 shrink-0 place-items-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-500";
    order.textContent = String(index + 1);
    const thumb = document.createElement("div");
    thumb.className = "h-12 w-9 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-100";
    const canvas = source.thumbnails[page.pageNumber - 1];
    if (canvas) {
      const image = document.createElement("img");
      image.src = canvas.toDataURL("image/jpeg", 0.65);
      image.alt = "";
      image.className = "h-full w-full object-contain";
      thumb.append(image);
    }
    const details = document.createElement("div");
    details.className = "min-w-0 flex-1";
    const label = document.createElement("p");
    label.className = "text-xs font-semibold text-slate-700";
    label.textContent = `Page ${page.pageNumber}`;
    const filename = document.createElement("p");
    filename.className = "truncate text-[10px] text-slate-400";
    filename.textContent = source.file.name;
    details.append(label, filename);
    const controls = document.createElement("div");
    controls.className = "flex shrink-0 items-center";
    const up = document.createElement("button");
    up.type = "button";
    up.className = "grid h-7 w-6 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25";
    up.setAttribute("aria-label", `Move page ${page.pageNumber} up`);
    up.disabled = index === 0;
    up.textContent = "↑";
    up.addEventListener("click", () => movePage(index, index - 1));
    const down = document.createElement("button");
    down.type = "button";
    down.className = "grid h-7 w-6 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25";
    down.setAttribute("aria-label", `Move page ${page.pageNumber} down`);
    down.disabled = index === selectedPages.length - 1;
    down.textContent = "↓";
    down.addEventListener("click", () => movePage(index, index + 1));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "ml-1 grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600";
    remove.setAttribute("aria-label", `Remove page ${page.pageNumber}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => togglePage(page.documentId, page.pageNumber, false));
    controls.append(up, down, remove);
    item.append(order, thumb, details, controls);
    elements.selectedList.append(item);
  });
}

function isSelected(documentId, pageNumber) {
  return selectedPages.some((page) => page.documentId === documentId && page.pageNumber === pageNumber);
}

function togglePage(documentId, pageNumber, forceState) {
  const selectedIndex = selectedPages.findIndex((page) => page.documentId === documentId && page.pageNumber === pageNumber);
  const shouldSelect = forceState ?? selectedIndex < 0;
  if (shouldSelect && selectedIndex < 0) selectedPages.push({ documentId, pageNumber });
  if (!shouldSelect && selectedIndex >= 0) selectedPages.splice(selectedIndex, 1);
  const card = elements.workspace.querySelector(`[data-page-key="${pageKey(documentId, pageNumber)}"]`);
  if (card) {
    card.classList.toggle("is-selected", shouldSelect);
    card.setAttribute("aria-pressed", String(shouldSelect));
    card.setAttribute("aria-label", `${shouldSelect ? "Deselect" : "Select"} page ${pageNumber} from ${getDocument(documentId)?.file.name || "document"}`);
  }
  renderSelectedPages();
}

function movePage(from, to) {
  if (to < 0 || to >= selectedPages.length) return;
  const [page] = selectedPages.splice(from, 1);
  selectedPages.splice(to, 0, page);
  renderSelectedPages();
}

function selectAllPages() {
  for (const document of documents) {
    if (document.loading || document.error) continue;
    for (let pageNumber = 1; pageNumber <= document.pageCount; pageNumber += 1) {
      if (!isSelected(document.id, pageNumber)) selectedPages.push({ documentId: document.id, pageNumber });
    }
  }
  renderWorkspace();
  renderSelectedPages();
}

function clearSelection() {
  selectedPages.splice(0, selectedPages.length);
  renderWorkspace();
  renderSelectedPages();
}

function removeDocument(documentId) {
  const index = documents.findIndex((document) => document.id === documentId);
  if (index < 0) return;
  documents.splice(index, 1);
  for (let pageIndex = selectedPages.length - 1; pageIndex >= 0; pageIndex -= 1) {
    if (selectedPages[pageIndex].documentId === documentId) selectedPages.splice(pageIndex, 1);
  }
  renderFileList();
  renderWorkspace();
  renderSelectedPages();
}

async function renderThumbnails(document) {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(document.bytes) });
  const pdf = await loadingTask.promise;
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    if (!getDocument(document.id)) {
      await loadingTask.destroy();
      return;
    }
    document.progress = `Rendering page ${pageNumber} of ${pdf.numPages}…`;
    renderWorkspace();
    const page = await pdf.getPage(pageNumber);
    const initialViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(1.25, 240 / initialViewport.width);
    const viewport = page.getViewport({ scale });
    const canvas = window.document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    document.thumbnails[pageNumber - 1] = canvas;
    renderWorkspace();
  }
  await loadingTask.destroy();
  document.loading = false;
  document.progress = "";
  renderFileList();
  renderWorkspace();
}

async function addFile(file) {
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    showToast(`${file.name} is not a PDF file.`, true);
    return;
  }
  const document = {
    id: nextDocumentId++,
    file,
    bytes: null,
    pdf: null,
    pageCount: 0,
    thumbnails: [],
    loading: true,
    progress: "Reading PDF…",
    error: "",
  };
  documents.push(document);
  renderFileList();
  renderWorkspace();
  setStatus(elements.uploadStatus, `Reading ${file.name}…`);
  try {
    document.bytes = new Uint8Array(await file.arrayBuffer());
    document.pdf = await PDFDocument.load(new Uint8Array(document.bytes));
    document.pageCount = document.pdf.getPageCount();
    if (document.pageCount === 0) throw new Error("This PDF does not contain any pages.");
    document.progress = `Preparing ${document.pageCount} pages…`;
    renderFileList();
    renderWorkspace();
    await renderThumbnails(document);
    if (getDocument(document.id)) showToast(`Added ${file.name}`);
  } catch (error) {
    if (!getDocument(document.id)) return;
    document.loading = false;
    document.error = error?.message?.includes("password")
      ? "This PDF is password-protected and cannot be opened."
      : `Could not read this PDF. ${error?.message || "Check that the file is valid and try again."}`;
    renderFileList();
    renderWorkspace();
    showToast(`Couldn't open ${file.name}.`, true);
  } finally {
    if (documents.every((entry) => !entry.loading)) setStatus(elements.uploadStatus);
  }
}

async function handleFiles(fileList) {
  const files = Array.from(fileList);
  if (!files.length) return;
  await Promise.all(files.map(addFile));
}

function parsePageRanges(input) {
  const tokens = input.split(",").map((part) => part.trim());
  if (!input.trim() || tokens.some((token) => !/^\d+(?:\s*-\s*\d+)?$/.test(token))) {
    throw new Error("Enter page numbers or ranges, separated by commas (for example: 1-3, 5).");
  }
  const ranges = [];
  for (const token of tokens) {
    const [startText, endText] = token.split("-").map((value) => Number(value.trim()));
    const start = startText;
    const end = endText ?? startText;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start) {
      throw new Error("Page ranges must use valid positive page numbers and end after they start.");
    }
    ranges.push([start, end]);
  }
  return ranges;
}

function applyPageRanges() {
  elements.rangeError.classList.add("hidden");
  if (!documents.some((document) => !document.loading && !document.error)) {
    elements.rangeError.textContent = "Add a readable PDF before choosing page numbers.";
    elements.rangeError.classList.remove("hidden");
    return;
  }
  try {
    const ranges = parsePageRanges(elements.pageRanges.value);
    for (const document of documents) {
      if (document.loading || document.error) continue;
      for (let pageNumber = 1; pageNumber <= document.pageCount; pageNumber += 1) {
        if (ranges.some(([start, end]) => pageNumber >= start && pageNumber <= end) && !isSelected(document.id, pageNumber)) {
          selectedPages.push({ documentId: document.id, pageNumber });
        }
      }
    }
    renderWorkspace();
    renderSelectedPages();
  } catch (error) {
    elements.rangeError.textContent = error.message;
    elements.rangeError.classList.remove("hidden");
  }
}

function setProcessing(isProcessing, message = "") {
  elements.downloadButton.disabled = isProcessing || selectedPages.length === 0;
  elements.previewButton.disabled = isProcessing || selectedPages.length === 0;
  elements.downloadButton.innerHTML = isProcessing
    ? '<span class="spinner h-4 w-4 rounded-full border-2 border-indigo-300 border-t-white"></span>Building PDF…'
    : '<svg viewBox="0 0 24 24" fill="none" class="h-4 w-4" aria-hidden="true"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Download PDF';
  setStatus(elements.outputStatus, message);
}

async function buildPdf() {
  if (!selectedPages.length) throw new Error("Select at least one page to create a PDF.");
  const output = await PDFDocument.create();
  for (const page of selectedPages) {
    const source = getDocument(page.documentId);
    if (!source?.pdf) throw new Error("A selected source PDF is no longer available.");
  }

  for (const page of selectedPages) {
    const source = getDocument(page.documentId);
    const [copiedPage] = await output.copyPages(source.pdf, [page.pageNumber - 1]);
    output.addPage(copiedPage);
  }
  return output.save();
}

async function previewDocument() {
  setProcessing(true, "Assembling preview…");
  try {
    const bytes = await buildPdf();
    if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    elements.previewFrame.src = activeObjectUrl;
    elements.previewCaption.textContent = `${selectedPages.length} ${selectedPages.length === 1 ? "page" : "pages"}`;
    elements.previewDialog.showModal();
  } catch (error) {
    showToast(error.message || "The preview could not be created.", true);
  } finally {
    setProcessing(false);
  }
}

async function downloadDocument() {
  setProcessing(true, "Building merged_document.pdf…");
  try {
    const bytes = await buildPdf();
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const link = window.document.createElement("a");
    link.href = url;
    link.download = "merged_document.pdf";
    window.document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(elements.outputStatus, "Your download is ready.");
  } catch (error) {
    showToast(error.message || "The PDF could not be generated.", true);
    setStatus(elements.outputStatus);
  } finally {
    setProcessing(false, elements.outputStatus.textContent === "Your download is ready." ? "Your download is ready." : "");
  }
}

elements.fileInput.addEventListener("change", (event) => {
  handleFiles(event.target.files);
  event.target.value = "";
});
elements.dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  elements.dropZone.classList.add("drop-active");
});
elements.dropZone.addEventListener("dragleave", (event) => {
  if (!elements.dropZone.contains(event.relatedTarget)) elements.dropZone.classList.remove("drop-active");
});
elements.dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  elements.dropZone.classList.remove("drop-active");
  handleFiles(event.dataTransfer.files);
});
elements.selectAll.addEventListener("click", selectAllPages);
elements.deselectAll.addEventListener("click", clearSelection);
elements.applyRanges.addEventListener("click", applyPageRanges);
elements.pageRanges.addEventListener("keydown", (event) => {
  if (event.key === "Enter") applyPageRanges();
});
elements.previewButton.addEventListener("click", previewDocument);
elements.downloadButton.addEventListener("click", downloadDocument);
elements.closePreview.addEventListener("click", () => elements.previewDialog.close());
elements.previewDialog.addEventListener("close", () => {
  elements.previewFrame.removeAttribute("src");
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
});

renderFileList();
renderWorkspace();
renderSelectedPages();
