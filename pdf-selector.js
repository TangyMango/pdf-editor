let selectedPdfs = [];
let pdfNamesToMatch = [];

function initPdfSelector() {
    const pdfNamesInput = document.getElementById('pdfNamesInput');
    const folderInput = document.getElementById('folderInput');
    const selectPdfsButton = document.getElementById('selectPdfsButton');
    const selectedFilesList = document.getElementById('selectedFilesList');
    const joinPdfsButton = document.getElementById('joinPdfsButton');
    const buttonFlexContainer = document.getElementById('button-flex-container');

    // Create Error Display Area
    const errorContainer = document.createElement('div');
    errorContainer.id = 'pdfSelectionErrors';
    errorContainer.classList.add('error-container');
    errorContainer.style.color = 'red';
    errorContainer.style.marginTop = '10px';
    selectedFilesList.parentNode.insertBefore(errorContainer, selectedFilesList);

    // Create Clear All button
    const clearAllButton = document.createElement('button');
    clearAllButton.id = 'clearAllPdfsButton';
    clearAllButton.textContent = 'Borrar Todo';
    clearAllButton.classList.add('clear-btn');
    clearAllButton.style.marginLeft = '10px';
    clearAllButton.style.display = 'none';

    // Add Clear All button to the button-flex-container
    buttonFlexContainer.appendChild(clearAllButton);

    // Event listener for Clear All button
    clearAllButton.addEventListener('click', function() {
        selectedPdfs = [];
        selectedFilesList.innerHTML = '';
        errorContainer.innerHTML = '';
        joinPdfsButton.disabled = true;
        clearAllButton.style.display = 'none';
    });

    // Event listener for PDF names input
    pdfNamesInput.addEventListener('input', function () {
        pdfNamesToMatch = this.value.split('\n')
            .map(name => name.trim())
            .filter(name => name !== '');
    });

    // Function to create a markdown-style list from an array of names
    function createMarkdownList(names) {
        return [...new Set(names)].map(name => `* ${name}`).join('<br>');
    }

    // Event listener for selecting PDFs
    selectPdfsButton.addEventListener('click', function () {
        const files = folderInput.files;

        // Reset everything
        selectedPdfs = [];
        selectedFilesList.innerHTML = '';
        errorContainer.innerHTML = '';
        joinPdfsButton.disabled = true;
        clearAllButton.style.display = 'none';

        // If no PDF names are provided, alert user
        if (pdfNamesToMatch.length === 0) {
            errorContainer.textContent = 'Por favor, pega los nombres de los PDFs primero';
            return;
        }

        // Check for duplicate input names
        const inputNameCounts = new Map();
        pdfNamesToMatch.forEach(name => {
            const normalizedName = name.replace(/\.pdf$/i, '');
            inputNameCounts.set(normalizedName, 
                (inputNameCounts.get(normalizedName) || 0) + 1
            );
        });

        const duplicateNames = Array.from(inputNameCounts.entries())
            .filter(([_, count]) => count > 1)
            .map(([name]) => name);

        // Validate input
        let hasErrors = false;
        let errorMessages = [];

        // Track matched and unmatched names
        const matchedNames = new Set();
        const unmatchedNames = [];
        const duplicateUnmatchedNames = [];

        // Collect matching files
        const processedNames = new Set();
        pdfNamesToMatch.forEach(targetName => {
            // Remove .pdf extension from target name
            const normalizedTargetName = targetName.replace(/\.pdf$/i, '');

            // Skip if already processed
            if (processedNames.has(normalizedTargetName)) return;

            const matchedFiles = Array.from(files).filter(file => {
                const normalizedFileName = file.name.replace(/\.pdf$/i, '');
                return normalizedFileName.toLowerCase() === normalizedTargetName.toLowerCase()
                    && !matchedNames.has(normalizedFileName);
            });

            // Check for multiple matches or no matches
            if (matchedFiles.length > 1) {
                hasErrors = true;
                errorMessages.push(`Múltiples archivos coinciden con: ${normalizedTargetName}`);
            } else if (matchedFiles.length === 0) {
                // If it's a duplicate name, add to duplicate unmatched names
                if (duplicateNames.includes(normalizedTargetName)) {
                    hasErrors = true;
                    duplicateUnmatchedNames.push(normalizedTargetName);
                    unmatchedNames.push(normalizedTargetName);
                } else {
                    // Otherwise, add to unmatched names
                    hasErrors = true;
                    unmatchedNames.push(normalizedTargetName);
                }
            } else if (matchedFiles.length === 1) {
                const matchedFile = matchedFiles[0];
                selectedPdfs.push(matchedFile);
                matchedNames.add(matchedFile.name.replace(/\.pdf$/i, ''));
            }

            processedNames.add(normalizedTargetName);
        });

        // Check for duplicate input names
        if (duplicateNames.length > 0) {
            hasErrors = true;
            errorMessages.push(`Nombres duplicados en la entrada:<br>${createMarkdownList(duplicateNames)}`);
        }

        // Add unmatched names to error messages
        if (unmatchedNames.length > 0) {
            errorMessages.push(`Nombres no encontrados:<br>${createMarkdownList(unmatchedNames)}`);
        }

        // Display errors or show matched files
        if (hasErrors) {
            // Show errors
            errorContainer.innerHTML = errorMessages.map(msg => `<p>${msg}</p>`).join('');
            selectedFilesList.innerHTML = '';
            selectedPdfs = [];
            joinPdfsButton.disabled = true;
            clearAllButton.style.display = 'none';
        } else {
            // Show matched files
            selectedPdfs.forEach(matchedFile => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `
                    ${matchedFile.name}
                    <button class="remove-btn" data-name="${matchedFile.name}">Quitar</button>
                `;
                selectedFilesList.appendChild(listItem);
            });

            // Update join button state
            joinPdfsButton.disabled = selectedPdfs.length < 2;
            clearAllButton.style.display = selectedPdfs.length > 0 ? 'inline-block' : 'none';

            // Add remove functionality to remove buttons
            document.querySelectorAll('.remove-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    const fileName = this.dataset.name;
                    selectedPdfs = selectedPdfs.filter(file => file.name !== fileName);
                    this.closest('li').remove();
                    joinPdfsButton.disabled = selectedPdfs.length < 2;
                    clearAllButton.style.display = selectedPdfs.length > 0 ? 'inline-block' : 'none';
                });
            });
        }
    });

    // Join functionality remains the same as in previous version
    joinPdfsButton.addEventListener('click', async function () {
        // ... (rest of the code remains unchanged)
    });
}

// Initialize PDF selector when the page loads
document.addEventListener('DOMContentLoaded', initPdfSelector);