// MongoDB Web Manager - Frontend JavaScript

class MongoDBManager {
    constructor() {
        this.isConnected = false;
        this.currentDatabase = null;
        this.currentCollection = null;
        this.currentPage = 1;
        this.currentLimit = 20;
        this.databases = [];
        
        this.initializeEventListeners();
        this.initializeTabs();
    }

    // Document CRUD Operations
    async deleteDocument(docId) {
        if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(
                `/api/databases/${this.currentDatabase}/collections/${this.currentCollection}/documents/${docId}`,
                { method: 'DELETE' }
            );

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            this.showSuccess('Document deleted successfully');
            await this.loadDocuments(); // Refresh the list

        } catch (error) {
            this.showError(`Failed to delete document: ${error.message}`);
        }
    }

    async editDocument(docId) {
        const docElement = document.getElementById(`doc-${docId}`);
        const currentJson = docElement.textContent;

        // Create modal for editing
        this.showEditModal(docId, currentJson);
    }

    async duplicateDocument(docId) {
        const docElement = document.getElementById(`doc-${docId}`);
        const originalDoc = JSON.parse(docElement.textContent);
        
        // Remove _id to create a new document
        delete originalDoc._id;
        
        this.showInsertForm(originalDoc);
    }

    showEditModal(docId, currentJson) {
        const modal = this.createModal('Edit Document', `
            <div class="modal-body">
                <textarea id="editDocumentJson" rows="15" style="width: 100%; font-family: monospace;">${currentJson}</textarea>
                <div class="modal-actions">
                    <button class="btn" onclick="mongoManager.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="mongoManager.saveDocument('${docId}')">Save Changes</button>
                </div>
            </div>
        `);
        
        document.body.appendChild(modal);
    }

    showInsertForm(prefillData = null) {
        const defaultDoc = prefillData || {
            "name": "Example",
            "value": 123,
            "active": true
        };

        const modal = this.createModal('Add New Document', `
            <div class="modal-body">
                <textarea id="insertDocumentJson" rows="15" style="width: 100%; font-family: monospace;">${JSON.stringify(defaultDoc, null, 2)}</textarea>
                <div class="modal-actions">
                    <button class="btn" onclick="mongoManager.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="mongoManager.insertDocument()">Add Document</button>
                </div>
            </div>
        `);
        
        document.body.appendChild(modal);
    }

    async saveDocument(docId) {
        const jsonText = document.getElementById('editDocumentJson').value;
        
        try {
            const document = JSON.parse(jsonText);
            
            const response = await fetch(
                `/api/databases/${this.currentDatabase}/collections/${this.currentCollection}/documents/${docId}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ document })
                }
            );

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            this.showSuccess('Document updated successfully');
            this.closeModal();
            await this.loadDocuments();

        } catch (error) {
            this.showError(`Failed to save document: ${error.message}`);
        }
    }

    async insertDocument() {
        const jsonText = document.getElementById('insertDocumentJson').value;
        
        try {
            const document = JSON.parse(jsonText);
            
            const response = await fetch(
                `/api/databases/${this.currentDatabase}/collections/${this.currentCollection}/documents`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ document })
                }
            );

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            this.showSuccess('Document added successfully');
            this.closeModal();
            await this.loadDocuments();

        } catch (error) {
            this.showError(`Failed to add document: ${error.message}`);
        }
    }

    createModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="mongoManager.closeModal()">×</button>
                </div>
                ${content}
            </div>
        `;
        return modal;
    }

    closeModal() {
      const modal = document.querySelector('.modal-overlay');
      if (modal) {
        modal.remove();
      }
    }

    // Initialize event listeners
    initializeEventListeners() {
        // Connection
        document.getElementById('connectBtn').addEventListener('click', () => this.connect());
        
        // Browse controls
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshCurrentCollection());
        document.getElementById('limitSelect').addEventListener('change', (e) => this.changeLimitAndRefresh(e.target.value));
        
        // Pagination
        document.getElementById('prevPage').addEventListener('click', () => this.previousPage());
        document.getElementById('nextPage').addEventListener('click', () => this.nextPage());
        
        // Query
        document.getElementById('executeQuery').addEventListener('click', () => this.executeQuery());
        document.getElementById('queryDatabase').addEventListener('change', (e) => this.loadCollectionsForQuery(e.target.value));
        
        // Allow Enter key in connection form
        document.getElementById('connectionString').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.connect();
        });
        document.getElementById('databaseName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.connect();
        });
    }

    // Initialize tabs
    initializeTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Remove active class from all tabs and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                button.classList.add('active');
                document.getElementById(targetTab).classList.add('active');
            });
        });
    }

    // Connect to MongoDB
    async connect() {
        const connectionString = document.getElementById('connectionString').value.trim();
        const dbName = document.getElementById('databaseName').value.trim();
        
        if (!connectionString) {
            this.showError('Please enter a MongoDB connection string');
            return;
        }

        const connectBtn = document.getElementById('connectBtn');
        connectBtn.textContent = 'Connecting...';
        connectBtn.disabled = true;

        try {
            const response = await fetch('/api/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ connectionString, dbName })
            });

            const result = await response.json();
            
            if (result.success) {
                this.isConnected = true;
                this.databases = result.databases;
                this.updateConnectionStatus(true);
                this.loadDatabaseTree();
                this.populateQueryDatabaseSelect();
                this.showSuccess('Connected successfully!');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.showError(`Connection failed: ${error.message}`);
            this.updateConnectionStatus(false);
        } finally {
            connectBtn.textContent = 'Connect';
            connectBtn.disabled = false;
        }
    }

    // Update connection status indicator
    updateConnectionStatus(connected) {
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.status-text');
        
        if (connected) {
            statusIndicator.classList.add('connected');
            statusText.textContent = 'Connected';
        } else {
            statusIndicator.classList.remove('connected');
            statusText.textContent = 'Not Connected';
        }
    }

    // Load and display database tree
    async loadDatabaseTree() {
        const treeContent = document.getElementById('treeContent');
        
        if (!this.isConnected) {
            treeContent.innerHTML = '<p class="no-data">Connect to MongoDB to see databases</p>';
            return;
        }

        try {
            treeContent.innerHTML = '<p class="loading">Loading databases...</p>';
            
            // Use cached databases from connection
            const databases = this.databases;
            
            if (databases.length === 0) {
                treeContent.innerHTML = '<p class="no-data">No databases found</p>';
                return;
            }

            let html = '';
            for (const db of databases) {
                html += `
                    <div class="database-item">
                        <div class="database-name" onclick="mongoManager.toggleDatabase('${db.name}')">
                            📁 ${db.name}
                            <span class="db-size">(${this.formatBytes(db.sizeOnDisk)})</span>
                        </div>
                        <div class="collections-list" id="collections-${db.name}" style="display: none;"></div>
                    </div>
                `;
            }
            
            treeContent.innerHTML = html;
        } catch (error) {
            treeContent.innerHTML = `<p class="error">Error loading databases: ${error.message}</p>`;
        }
    }

    // Toggle database expansion and load collections
    async toggleDatabase(dbName) {
        const collectionsContainer = document.getElementById(`collections-${dbName}`);
        const databaseName = document.querySelector(`[onclick="mongoManager.toggleDatabase('${dbName}')"]`);
        
        if (collectionsContainer.style.display === 'none') {
            // Expand database
            databaseName.classList.add('expanded');
            collectionsContainer.style.display = 'block';
            
            // Load collections if not already loaded
            if (collectionsContainer.innerHTML === '') {
                await this.loadCollections(dbName, collectionsContainer);
            }
        } else {
            // Collapse database
            databaseName.classList.remove('expanded');
            collectionsContainer.style.display = 'none';
        }
    }

    // Load collections for a database
    async loadCollections(dbName, container) {
        try {
            container.innerHTML = '<p class="loading">Loading collections...</p>';
            
            const response = await fetch(`/api/databases/${dbName}/collections`);
            const collections = await response.json();
            
            if (collections.error) {
                throw new Error(collections.error);
            }
            
            if (collections.length === 0) {
                container.innerHTML = '<p class="no-data">No collections</p>';
                return;
            }
            
            let html = '';
            collections.forEach(collection => {
                html += `
                    <div class="collection-item" onclick="mongoManager.selectCollection('${dbName}', '${collection.name}')">
                        📄 ${collection.name}
                    </div>
                `;
            });
            
            container.innerHTML = html;
        } catch (error) {
            container.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        }
    }

    // Select a collection and load its documents
    async selectCollection(dbName, collectionName) {
        // Update active collection
        document.querySelectorAll('.collection-item').forEach(item => {
            item.classList.remove('active');
        });
        event.target.classList.add('active');
        
        this.currentDatabase = dbName;
        this.currentCollection = collectionName;
        this.currentPage = 1;
        
        // Update UI
        document.getElementById('currentPath').textContent = `${dbName} → ${collectionName}`;
        
        // Switch to browse tab if not already active
        if (!document.querySelector('[data-tab="browse"]').classList.contains('active')) {
            document.querySelector('[data-tab="browse"]').click();
        }
        
        // Load documents
        await this.loadDocuments();
    }

    // Load documents from current collection
    async loadDocuments() {
        if (!this.currentDatabase || !this.currentCollection) return;
        
        const documentsGrid = document.getElementById('documentsGrid');
        const pagination = document.getElementById('pagination');
        
        try {
            documentsGrid.innerHTML = '<p class="loading">Loading documents...</p>';
            
            const response = await fetch(
                `/api/databases/${this.currentDatabase}/collections/${this.currentCollection}/documents?page=${this.currentPage}&limit=${this.currentLimit}`
            );
            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            if (result.documents.length === 0) {
                documentsGrid.innerHTML = `
                    <div class="no-data-container">
                        <p class="no-data">No documents found</p>
                        <button class="btn btn-primary" onclick="mongoManager.showInsertForm()">
                            Add First Document
                        </button>
                    </div>
                `;
                pagination.style.display = 'none';
                return;
            }
            
            // Display documents with action buttons
            let html = `
                <div class="documents-header">
                    <button class="btn btn-primary" onclick="mongoManager.showInsertForm()">
                        + Add Document
                    </button>
                </div>
            `;
            
            result.documents.forEach((doc, index) => {
                const docId = doc._id;
                html += `
                    <div class="document-item" data-doc-id="${docId}">
                        <div class="document-actions">
                            <button class="btn btn-small" onclick="mongoManager.editDocument('${docId}')" title="Edit">
                                ✏️ Edit
                            </button>
                            <button class="btn btn-small" onclick="mongoManager.duplicateDocument('${docId}')" title="Duplicate">
                                📋 Copy
                            </button>
                            <button class="btn btn-small btn-danger" onclick="mongoManager.deleteDocument('${docId}')" title="Delete">
                                🗑️ Delete
                            </button>
                        </div>
                        <div class="document-content">
                            <pre id="doc-${docId}">${JSON.stringify(doc, null, 2)}</pre>
                        </div>
                    </div>
                `;
            });
            
            documentsGrid.innerHTML = html;
            
            // Update pagination
            this.updatePagination(result.page, result.totalPages, result.totalCount);
            
        } catch (error) {
            documentsGrid.innerHTML = `<p class="error">Error loading documents: ${error.message}</p>`;
            pagination.style.display = 'none';
        }
    }

    // Update pagination controls
    updatePagination(currentPage, totalPages, totalCount) {
        const pagination = document.getElementById('pagination');
        const pageInfo = document.getElementById('pageInfo');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        
        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }
        
        pagination.style.display = 'flex';
        pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${totalCount} total)`;
        
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
    }

    // Navigation methods
    async previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            await this.loadDocuments();
        }
    }

    async nextPage() {
        this.currentPage++;
        await this.loadDocuments();
    }

    async changeLimitAndRefresh(newLimit) {
        this.currentLimit = parseInt(newLimit);
        this.currentPage = 1;
        await this.loadDocuments();
    }

    async refreshCurrentCollection() {
        if (this.currentDatabase && this.currentCollection) {
            await this.loadDocuments();
        }
    }

    // Populate database select for query tab
    populateQueryDatabaseSelect() {
        const select = document.getElementById('queryDatabase');
        select.innerHTML = '<option value="">Select Database</option>';
        
        this.databases.forEach(db => {
            select.innerHTML += `<option value="${db.name}">${db.name}</option>`;
        });
    }

    // Load collections for query database select
    async loadCollectionsForQuery(dbName) {
        const collectionSelect = document.getElementById('queryCollection');
        
        if (!dbName) {
            collectionSelect.innerHTML = '<option value="">Select Collection</option>';
            return;
        }
        
        try {
            const response = await fetch(`/api/databases/${dbName}/collections`);
            const collections = await response.json();
            
            collectionSelect.innerHTML = '<option value="">Select Collection</option>';
            
            if (!collections.error) {
                collections.forEach(collection => {
                    collectionSelect.innerHTML += `<option value="${collection.name}">${collection.name}</option>`;
                });
            }
        } catch (error) {
            console.error('Error loading collections for query:', error);
        }
    }

    // Execute query
    async executeQuery() {
        const database = document.getElementById('queryDatabase').value;
        const collection = document.getElementById('queryCollection').value;
        const query = document.getElementById('queryInput').value.trim() || '{}';
        const operation = document.getElementById('queryOperation').value;
        const resultsElement = document.getElementById('queryResults');
        
        if (!database || !collection) {
            this.showError('Please select database and collection');
            return;
        }
        
        try {
            resultsElement.textContent = 'Executing query...';
            
            const response = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ database, collection, query, operation })
            });
            
            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            resultsElement.textContent = JSON.stringify(result.result, null, 2);
            
        } catch (error) {
            resultsElement.textContent = `Error: ${error.message}`;
            resultsElement.style.color = '#e53e3e';
        }
    }

    // Utility methods
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '1000';
        notification.style.padding = '1rem';
        notification.style.borderRadius = '4px';
        notification.style.fontWeight = '500';
        
        if (type === 'error') {
            notification.style.background = '#fed7d7';
            notification.style.color = '#e53e3e';
            notification.style.border = '1px solid #feb2b2';
        } else {
            notification.style.background = '#c6f6d5';
            notification.style.color = '#38a169';
            notification.style.border = '1px solid #9ae6b4';
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

// Initialize the application
const mongoManager = new MongoDBManager();

// Make it available globally for onclick handlers
window.mongoManager = mongoManager;