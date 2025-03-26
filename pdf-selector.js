let selectedPdfs = [];
let pdfNamesToMatch = [];

// Function to initialize PDF selector functionality
function initPdfSelector() {
    const pdfNamesInput = document.getElementById('pdfNamesInput');
    const folderInput = document.getElementById('folderInput');
    const selectPdfsButton = document.getElementById('selectPdfsButton');
    const selectedFilesList = document.getElementById('selectedFilesList');
    const joinPdfsButton = document.getElementById('joinPdfsButton');

    // Create Clear All button
    const clearAllButton = document.createElement('button');
    clearAllButton.id = 'clearAllPdfsButton';
    clearAllButton.textContent = 'Eliminar Todos';
    clearAllButton.classList.add('clear-btn');
    clearAllButton.style.marginLeft = '10px';
    clearAllButton.style.display = 'none'; // Initially hidden

    // Add Clear All button to the container
    const selectedPdfsContainer = document.getElementById('selectedPdfsContainer');
    selectedPdfsContainer.insertBefore(clearAllButton, selectedFilesList);

    // Event listener for Clear All button
    clearAllButton.addEventListener('click', function() {
        // Clear the selectedPdfs array
        selectedPdfs = [];

        // Clear the list of selected files
        selectedFilesList.innerHTML = '';

        // Disable join button
        joinPdfsButton.disabled = true;

        // Hide Clear All button
        clearAllButton.style.display = 'none';
    });

    // Event listener for PDF names input
    pdfNamesInput.addEventListener('input', function () {
        // Parse input into array of names, trimming whitespace and removing empty lines
        pdfNamesToMatch = this.value.split('\n')
            .map(name => name.trim())
            .filter(name => name !== '');
    });

    // Event listener for selecting PDFs
    selectPdfsButton.addEventListener('click', function () {
        const files = folderInput.files;

        // Clear previous selections
        selectedPdfs = [];
        selectedFilesList.innerHTML = '';

        // If no PDF names are provided, alert user
        if (pdfNamesToMatch.length === 0) {
            alert('Por favor, pega los nombres de los PDFs primero');
            return;
        }

        // Track which names have been matched
        const matchedNames = new Set();

        // Collect matching files in the order of pasted names
        pdfNamesToMatch.forEach(targetName => {
            const matchedFile = Array.from(files).find(file => {
                // Remove .pdf extension from both target name and file name
                const normalizedTargetName = targetName.replace(/\.pdf$/i, '');
                const normalizedFileName = file.name.replace(/\.pdf$/i, '');

                // Compare names case-insensitively and ensure no previous match
                return normalizedFileName.toLowerCase() === normalizedTargetName.toLowerCase()
                    && !matchedNames.has(normalizedFileName);
            });

            if (matchedFile) {
                selectedPdfs.push(matchedFile);
                // Use filename without extension to prevent duplicate tracking
                matchedNames.add(matchedFile.name.replace(/\.pdf$/i, ''));

                // Create list item for selected file
                const listItem = document.createElement('li');
                listItem.innerHTML = `
                    ${matchedFile.name}
                    <button class="remove-btn" data-name="${matchedFile.name}">Quitar</button>
                `;
                selectedFilesList.appendChild(listItem);
            }
        });

        // Update join button state
        joinPdfsButton.disabled = selectedPdfs.length < 2;

        // Show/hide Clear All button based on selections
        clearAllButton.style.display = selectedPdfs.length > 0 ? 'inline-block' : 'none';

        // Add remove functionality to remove buttons
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const fileName = this.dataset.name;
                selectedPdfs = selectedPdfs.filter(file => file.name !== fileName);
                this.closest('li').remove();
                joinPdfsButton.disabled = selectedPdfs.length < 2;

                // Update Clear All button visibility
                clearAllButton.style.display = selectedPdfs.length > 0 ? 'inline-block' : 'none';
            });
        });

        // Show results
        if (selectedPdfs.length === 0) {
            alert('No se encontraron PDFs coincidentes. Verifica los nombres e intenta de nuevo.');
        } else {
            console.log(`Se encontraron ${selectedPdfs.length} PDFs coincidentes`);
        }
    });

    // Add join functionality
    joinPdfsButton.addEventListener('click', async function () {
        if (selectedPdfs.length < 2) {
            alert('Selecciona al menos dos PDFs para unir.');
            return;
        }

        try {
            const { PDFDocument } = PDFLib;
            const mergedPdf = await PDFDocument.create();

            // Add pages from each PDF
            for (const pdfFile of selectedPdfs) {
                const arrayBuffer = await pdfFile.arrayBuffer();
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));
            }

            // Save the merged PDF
            const mergedPdfBytes = await mergedPdf.save();

            // Generate filename based on first two PDFs
            const baseName = selectedPdfs.slice(0, 2)
                .map(file => file.name.replace('.pdf', ''))
                .join('_');
            const joinedPdfName = `${baseName}_joined.pdf`;

            // Trigger download
            const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = joinedPdfName;
            link.click();

        } catch (error) {
            console.error('Error uniendo PDFs:', error);
            alert('Error al unir PDFs. Intenta de nuevo.');
        }
    });
}

// Initialize PDF selector when the page loads
document.addEventListener('DOMContentLoaded', initPdfSelector);