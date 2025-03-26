// DOM elements for PDF joiner
let pdfsToJoin = [];
let joinedPdfName = "joined-document.pdf";

// Initialize joiner functionality
function initPdfJoiner() {

    // Add event listeners
    document.getElementById('addPdfButton').addEventListener('click', () => {

    });

    document.getElementById('joinPdfInput').addEventListener('change', handlePdfAdd);
    document.getElementById('joinButton').addEventListener('click', joinPdfs);
    document.getElementById('clearPdfsButton').addEventListener('click', clearPdfs);
}

// Handle PDF file addition
async function handlePdfAdd(event) {
    const files = event.target.files;

    if (files.length === 0) return;

    const pdfListInfo = document.getElementById('pdfListInfo');
    const pdfList = document.getElementById('pdfList');
    const joinButton = document.getElementById('joinButton');

    // Process each file
    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        if (file.type !== 'application/pdf') {
            continue;
        }

        try {
            // Read file
            const arrayBuffer = await readFileAsArrayBuffer(file);

            // Validate that it's a real PDF by trying to load it
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const pageCount = pdfDoc.getPageCount();

            // Add to our list of PDFs to join
            pdfsToJoin.push({
                name: file.name,
                size: formatFileSize(file.size),
                data: new Uint8Array(arrayBuffer),
                pageCount: pageCount
            });

            // Update UI
            updatePdfList();

            // Enable join button if we have at least 2 PDFs
            joinButton.disabled = pdfsToJoin.length < 2;

            // Update info text
            pdfListInfo.textContent = `${pdfsToJoin.length} PDF${pdfsToJoin.length !== 1 ? 's' : ''} listos para unir`;

        } catch (error) {
            console.error('Error adding PDF:', error);
        }
    }

    // Reset file input
    event.target.value = '';
}

// Update the PDF list in the UI
function updatePdfList() {
    const pdfList = document.getElementById('pdfList');
    pdfList.innerHTML = '';

    pdfsToJoin.forEach((pdf, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'pdf-list-item';

        listItem.innerHTML = `
            <div class="pdf-info">
                <span class="pdf-icon">📄</span>
                <span class="pdf-name">${pdf.name}</span>
                <span class="pdf-size">${pdf.size} (${pdf.pageCount} pages)</span>
            </div>
            <div class="pdf-actions">
                ${index > 0 ? `<button class="move-btn move-up" data-index="${index}">↑</button>` : ''}
                ${index < pdfsToJoin.length - 1 ? `<button class="move-btn move-down" data-index="${index}">↓</button>` : ''}
                <button class="remove-btn" data-index="${index}">Quitar</button>
            </div>
        `;

        pdfList.appendChild(listItem);
    });

    // Add event listeners to buttons
    document.querySelectorAll('.move-up').forEach(button => {
        button.addEventListener('click', () => movePdf(parseInt(button.dataset.index), 'up'));
    });

    document.querySelectorAll('.move-down').forEach(button => {
        button.addEventListener('click', () => movePdf(parseInt(button.dataset.index), 'down'));
    });

    document.querySelectorAll('.remove-btn').forEach(button => {
        button.addEventListener('click', () => removePdf(parseInt(button.dataset.index)));
    });
}

// Move a PDF up or down in the list
function movePdf(index, direction) {
    if (direction === 'up' && index > 0) {
        const temp = pdfsToJoin[index];
        pdfsToJoin[index] = pdfsToJoin[index - 1];
        pdfsToJoin[index - 1] = temp;
    } else if (direction === 'down' && index < pdfsToJoin.length - 1) {
        const temp = pdfsToJoin[index];
        pdfsToJoin[index] = pdfsToJoin[index + 1];
        pdfsToJoin[index + 1] = temp;
    }

    updatePdfList();
}

// Remove a PDF from the list
function removePdf(index) {
    pdfsToJoin.splice(index, 1);
    updatePdfList();

    const joinButton = document.getElementById('joinButton');
    joinButton.disabled = pdfsToJoin.length < 2;

    const pdfListInfo = document.getElementById('pdfListInfo');
    if (pdfsToJoin.length === 0) {
        pdfListInfo.textContent = 'Añade PDFs para unir';
    } else {
        pdfListInfo.textContent = `${pdfsToJoin.length} PDF${pdfsToJoin.length !== 1 ? 's' : ''} listos para unir`;
    }
}

// Clear all PDFs
function clearPdfs() {
    pdfsToJoin = [];
    updatePdfList();

    const joinButton = document.getElementById('joinButton');
    joinButton.disabled = true;

    const pdfListInfo = document.getElementById('pdfListInfo');
    pdfListInfo.textContent = 'Añade PDFs a unir';
}

// Join PDFs
async function joinPdfs() {
    if (pdfsToJoin.length < 2) {
        alert('Añade al menos 2 PDFs.');
        return;
    }

    const loader = document.getElementById('loader');
    const infoText = document.getElementById('pdfListInfo');

    loader.classList.remove('hidden');
    infoText.textContent = 'Creando joined PDF...';

    try {
        // Create a new PDF document
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        // Add pages from each PDF
        for (const pdf of pdfsToJoin) {
            const pdfDoc = await PDFDocument.load(pdf.data);
            const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
        }

        // Save the merged PDF
        const mergedPdfBytes = await mergedPdf.save();

        // Determine a good name for the joined PDF
        if (pdfsToJoin.length === 2) {
            // If only 2 files, name based on them
            const name1 = pdfsToJoin[0].name.replace('.pdf', '');
            const name2 = pdfsToJoin[1].name.replace('.pdf', '');
            joinedPdfName = `${name1}_${name2}.pdf`;
        } else {
            // Try to find common prefix or use default
            const baseName = findCommonPrefix(pdfsToJoin.map(pdf => pdf.name));
            joinedPdfName = baseName ? `${baseName}-joined.pdf` : 'joined-document.pdf';
        }

        // Download the joined PDF
        downloadPDF(mergedPdfBytes, joinedPdfName);

        infoText.textContent = 'PDFs joined successfully!';
    } catch (error) {
        console.error('Error joining PDFs:', error);
        infoText.textContent = 'Error joining PDFs. Please try again.';
    } finally {
        loader.classList.add('hidden');
    }
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

// Helper function to find common prefix in filenames
function findCommonPrefix(filenames) {
    if (filenames.length === 0) return '';

    // Remove .pdf extension and get the shortest name
    const names = filenames.map(name => name.replace('.pdf', ''));
    let minLength = Math.min(...names.map(name => name.length));

    // Find common prefix length
    let prefixLength = 0;
    for (let i = 0; i < minLength; i++) {
        const char = names[0][i];
        if (names.every(name => name[i] === char)) {
            prefixLength++;
        } else {
            break;
        }
    }

    // Return common prefix if meaningful (at least 3 chars)
    const prefix = names[0].substring(0, prefixLength);
    return prefix.length >= 3 ? prefix : '';
}

// Initialize joiner functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', initPdfJoiner);
