let selectedPdfs = [];
let pdfNamesToMatch = [];

// Add PDF Names Input to the page dynamically
function addPdfNamesInput() {
    const container = document.querySelector('.joiner-container');
    const namesInputDiv = document.createElement('div');
    namesInputDiv.innerHTML = `
        <div class="pdf-names-input-section">
            <h3>Selector de PDFs por Nombre</h3>
            <textarea id="pdfNamesInput" placeholder="Pega el nombre de los PDFs, uno por cada renglón"></textarea>
            <input type="file" id="folderInput" webkitdirectory directory multiple>
            <button id="selectPdfsButton">Buscar PDFs</button>
        </div>
    `;
    container.insertBefore(namesInputDiv, container.firstChild.nextSibling);

    // Event listener for PDF names input
    document.getElementById('pdfNamesInput').addEventListener('input', function () {
        // Parse input into array of names, trimming whitespace and removing empty lines
        pdfNamesToMatch = this.value.split('\n')
            .map(name => name.trim())
            .filter(name => name !== '');
    });

    // Event listener for selecting PDFs
    document.getElementById('selectPdfsButton').addEventListener('click', function () {
        const folderInput = document.getElementById('folderInput');
        const files = folderInput.files;

        // Clear previous selections
        selectedPdfs = [];
        const selectedFilesList = document.createElement('ul');
        selectedFilesList.id = 'selectedFilesList';
        
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

        // Create container for selected files list and join button
        const selectionResultsDiv = document.createElement('div');
        selectionResultsDiv.className = 'selection-results';
        selectionResultsDiv.innerHTML = `
            <h3>PDFs Seleccionados</h3>
        `;
        selectionResultsDiv.appendChild(selectedFilesList);

        const joinPdfsButton = document.createElement('button');
        joinPdfsButton.id = 'joinPdfsButton';
        joinPdfsButton.textContent = 'Unir PDFs';
        joinPdfsButton.disabled = selectedPdfs.length < 2;
        selectionResultsDiv.appendChild(joinPdfsButton);

        // Remove any existing selection results
        const existingResults = document.querySelector('.selection-results');
        if (existingResults) {
            existingResults.remove();
        }

        // Add new selection results
        document.querySelector('.pdf-names-input-section').appendChild(selectionResultsDiv);

        // Add remove functionality to remove buttons
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const fileName = this.dataset.name;
                selectedPdfs = selectedPdfs.filter(file => file.name !== fileName);
                this.closest('li').remove();
                joinPdfsButton.disabled = selectedPdfs.length < 2;
            });
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

        // Show results
        if (selectedPdfs.length === 0) {
            alert('No se encontraron PDFs coincidentes. Verifica los nombres e intenta de nuevo.');
        } else {
            console.log(`Se encontraron ${selectedPdfs.length} PDFs coincidentes`);
        }
    });
}

// Call the function to add the PDF names input when the page loads
document.addEventListener('DOMContentLoaded', addPdfNamesInput);