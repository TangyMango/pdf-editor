// Set worker path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// DOM elements
const fileInput = document.getElementById('fileInput');
const saveButton = document.getElementById('saveButton');
const thumbnailsContainer = document.getElementById('thumbnailsContainer');
const loader = document.getElementById('loader');
const infoText = document.getElementById('infoText');

// State variables
let pdfDocument = null;
let pdfName = '';
let pdfBytes = null; // Store the PDF as a Uint8Array
let totalPages = 0;
let deletedPages = new Set();
let fileBlob = null; // Store the original file blob

// Event listeners
fileInput.addEventListener('change', handleFileSelect);
saveButton.addEventListener('click', saveModifiedPDF);

// Function to handle file selection
async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
        alert('Please select a valid PDF file.');
        return;
    }

    // Reset state
    pdfDocument = null;
    pdfName = file.name;
    fileBlob = file; // Store the original file blob
    deletedPages.clear();
    thumbnailsContainer.innerHTML = '';

    // Show loader
    loader.classList.remove('hidden');
    infoText.textContent = 'Loading PDF...';

    try {
        // Read file as ArrayBuffer for PDF.js
        const arrayBuffer = await readFileAsArrayBuffer(file);

        // Store a copy of the bytes
        pdfBytes = new Uint8Array(arrayBuffer.slice(0));

        // Load PDF document
        pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        totalPages = pdfDocument.numPages;

        infoText.textContent = `PDF loaded successfully. Total pages: ${totalPages}`;
        saveButton.disabled = false;

        // Generate thumbnails
        await generateThumbnails(pdfDocument);
    } catch (error) {
        console.error('Error loading PDF:', error);
        infoText.textContent = 'Error loading PDF. Please try again.';
    } finally {
        loader.classList.add('hidden');
    }
}

// Function to read file as ArrayBuffer
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Function to generate thumbnails for all pages
async function generateThumbnails(pdfDoc) {
    thumbnailsContainer.innerHTML = '';
    loader.classList.remove('hidden');

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        try {
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 0.5 });

            // Create thumbnail container
            const thumbnailItem = document.createElement('div');
            thumbnailItem.className = 'thumbnail-item';
            thumbnailItem.dataset.pageNumber = i;

            // Create canvas for the thumbnail
            const canvas = document.createElement('canvas');
            canvas.className = 'thumbnail';
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            // Render page to canvas
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            // Create thumbnail footer
            const thumbnailFooter = document.createElement('div');
            thumbnailFooter.className = 'thumbnail-footer';

            const pageNumber = document.createElement('span');
            pageNumber.className = 'page-number';
            pageNumber.textContent = `Página ${i}`;

            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-btn';
            deleteButton.textContent = 'Eliminar';
            deleteButton.addEventListener('click', () => togglePageDeletion(i, thumbnailItem));

            thumbnailFooter.appendChild(pageNumber);
            thumbnailFooter.appendChild(deleteButton);

            thumbnailItem.appendChild(canvas);
            thumbnailItem.appendChild(thumbnailFooter);
            thumbnailsContainer.appendChild(thumbnailItem);
        } catch (error) {
            console.error(`Error rendering thumbnail for page ${i}:`, error);
        }
    }

    loader.classList.add('hidden');
}

// Function to toggle page deletion
function togglePageDeletion(pageNumber, thumbnailItem) {
    if (deletedPages.has(pageNumber)) {
        deletedPages.delete(pageNumber);

        // Remove overlay if it exists
        const overlay = thumbnailItem.querySelector('.thumbnail-overlay');
        if (overlay) {
            thumbnailItem.removeChild(overlay);
        }
    } else {
        deletedPages.add(pageNumber);

        // Add overlay
        const overlay = document.createElement('div');
        overlay.className = 'thumbnail-overlay';
        overlay.textContent = 'ELIMINADA';
        thumbnailItem.insertBefore(overlay, thumbnailItem.firstChild);
    }

    // Update info text
    if (deletedPages.size > 0) {
        infoText.textContent = `${deletedPages.size} páginas marcadas para eliminación`;
    } else {
        infoText.textContent = `PDF cargado con éxito. Total de páginas: ${totalPages}`;
    }
}

// Function to save modified PDF
async function saveModifiedPDF() {
    if (!pdfDocument || deletedPages.size === 0) {
        if (pdfDocument && deletedPages.size === 0) {
            alert('Ninguna página ha sido marcada.');
        }
        return;
    }

    loader.classList.remove('hidden');
    infoText.textContent = 'Crreando PDF moificado...';
    saveButton.disabled = true;

    try {
        // Read original file again for PDF-lib
        const fileArrayBuffer = await readFileAsArrayBuffer(fileBlob);

        // Create new PDF document
        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.load(fileArrayBuffer);

        // Get indices of pages to keep
        const pagesToKeep = [];
        for (let i = 0; i < totalPages; i++) {
            if (!deletedPages.has(i + 1)) {
                pagesToKeep.push(i);
            }
        }

        // Create new document with only kept pages
        const newPdfDoc = await PDFDocument.create();
        const copiedPages = await newPdfDoc.copyPages(pdfDoc, pagesToKeep);

        // Add copied pages to new document
        copiedPages.forEach(page => {
            newPdfDoc.addPage(page);
        });

        // Save the modified PDF
        const modifiedPdfBytes = await newPdfDoc.save();

        // Download the modified PDF
        const fileName = pdfName.replace('.pdf', '-modificado.pdf');
        downloadPDF(modifiedPdfBytes, fileName);

        infoText.textContent = 'Modificación exitosa';
    } catch (error) {
        console.error('Error saving modified PDF:', error);
        infoText.textContent = 'Error al guardar el PD modificado. Intente de nuevo.';
    } finally {
        loader.classList.add('hidden');
        saveButton.disabled = false;
    }
}

// Function to download the PDF
function downloadPDF(bytes, fileName) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function clearAll() {
    fileInput.value = ""; // Reset file input
    thumbnailsContainer.innerHTML = ""; // Clear thumbnails
    infoText.textContent = "Selecciona un PDF para comenzar"; // Reset text
    saveButton.disabled = true; // Disable save button

    // Reset internal state
    pdfDocument = null;
    pdfBytes = null;
    fileBlob = null;
    totalPages = 0;
    deletedPages.clear();
}

document.getElementById('clearButton').addEventListener('click', clearAll);