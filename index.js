// Research Grant Management System - Frontend Logic
document.addEventListener("DOMContentLoaded", () => {
    const display = document.getElementById("display");
    const btnInsert = document.getElementById("option1");
    const btnSearch = document.getElementById("option2");
    const btnUpdate = document.getElementById("option3");
    const btnDelete = document.getElementById("option4");

    const navButtons = [btnInsert, btnSearch, btnUpdate, btnDelete];

    function setActiveButton(activeBtn) {
        navButtons.forEach(btn => btn.classList.remove("active"));
        if (activeBtn) activeBtn.classList.add("active");
    }

    // Helper: format currency
    function formatCurrency(amount) {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
        }).format(amount || 0);
    }

    // Helper: format date for display
    function formatDate(dateStr) {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? dateStr : date.toISOString().split("T")[0];
    }

    // Helper: status badge class
    function getStatusBadge(status) {
        const clean = (status || "").toLowerCase().replace(/\s+/g, "-");
        let badgeClass = "badge-pending";
        if (clean.includes("approved") || clean.includes("active")) {
            badgeClass = "badge-approved";
        } else if (clean.includes("complete")) {
            badgeClass = "badge-completed";
        } else if (clean.includes("reject")) {
            badgeClass = "badge-rejected";
        }
        return `<span class="badge ${badgeClass}">${status || "Unknown"}</span>`;
    }

    // Check DB status on startup
    async function checkStatus() {
        try {
            const res = await fetch("/api/status");
            const data = await res.json();
            if (!data.connected) {
                return `
                    <div class="alert alert-warning">
                        <span class="material-symbols-outlined">warning</span>
                        <div>
                            <strong>MySQL Notice:</strong> ${data.message}
                        </div>
                    </div>
                `;
            }
        } catch (err) {
            return `
                <div class="alert alert-error">
                    <span class="material-symbols-outlined">error</span>
                    <div><strong>Server Notice:</strong> Backend server is unreachable at port 3000.</div>
                </div>
            `;
        }
        return "";
    }

    // ==========================================
    // 1. SEARCH / VIEW ALL GRANTS
    // ==========================================
    async function renderSearchGrants(searchTerm = "") {
        setActiveButton(btnSearch);
        const noticeHtml = await checkStatus();

        display.innerHTML = `
            ${noticeHtml}
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">
                        <span class="material-symbols-outlined">search</span> Search Existing Grants
                    </h2>
                    <button class="btn btn-primary btn-sm" id="refreshGrantsBtn">
                        <span class="material-symbols-outlined" style="font-size:1.1rem;">refresh</span> Refresh
                    </button>
                </div>

                <div class="search-bar">
                    <input 
                        type="text" 
                        id="grantSearchInput" 
                        class="search-input" 
                        placeholder="Search by Grant ID, Application ID, Status, Project, or Researcher..." 
                        value="${searchTerm}"
                    />
                    <button class="btn btn-primary" id="doSearchBtn">Search</button>
                    ${searchTerm ? `<button class="btn btn-secondary" id="clearSearchBtn">Clear</button>` : ""}
                </div>

                <div id="tableContainer">
                    <div class="empty-state">Loading grants...</div>
                </div>
            </div>
        `;

        // Bind search events
        const searchInput = document.getElementById("grantSearchInput");
        const doSearchBtn = document.getElementById("doSearchBtn");
        const refreshBtn = document.getElementById("refreshGrantsBtn");
        const clearBtn = document.getElementById("clearSearchBtn");

        const triggerSearch = () => renderSearchGrants(searchInput.value.trim());

        doSearchBtn.addEventListener("click", triggerSearch);
        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") triggerSearch();
        });
        if (refreshBtn) refreshBtn.addEventListener("click", triggerSearch);
        if (clearBtn) clearBtn.addEventListener("click", () => renderSearchGrants(""));

        // Fetch data
        try {
            const url = searchTerm 
                ? `/api/grants?search=${encodeURIComponent(searchTerm)}` 
                : `/api/grants`;
            const res = await fetch(url);
            const result = await res.json();

            const tableContainer = document.getElementById("tableContainer");

            if (!result.success) {
                tableContainer.innerHTML = `
                    <div class="alert alert-error">
                        <span class="material-symbols-outlined">error</span>
                        <span>${result.error || "Failed to load grants."}</span>
                    </div>
                `;
                return;
            }

            const grants = result.data || [];
            if (grants.length === 0) {
                tableContainer.innerHTML = `
                    <div class="empty-state">
                        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No grants found.</p>
                        <p style="font-size: 0.9rem; color: #64748b;">${searchTerm ? "Try searching for a different keyword or click Clear." : "Use 'INSERT NEW GRANT' above to add your first grant record."}</p>
                    </div>
                `;
                return;
            }

            let html = `
                <div class="table-responsive">
                    <table class="grants-table">
                        <thead>
                            <tr>
                                <th>Grant ID</th>
                                <th>App ID</th>
                                <th>Project / Title</th>
                                <th>Researcher</th>
                                <th>Agency</th>
                                <th>Approved Amount</th>
                                <th>Approval Date</th>
                                <th>Status</th>
                                <th style="text-align: center;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            grants.forEach(g => {
                html += `
                    <tr>
                        <td><strong>#${g.grant_id}</strong></td>
                        <td>${g.application_id}</td>
                        <td>${g.project_title || `<span style="color:#94a3b8;">-</span>`}</td>
                        <td>${g.researcher_name || g.reseacrher_name || `<span style="color:#94a3b8;">-</span>`}</td>
                        <td>${g.agency_name || `<span style="color:#94a3b8;">-</span>`}</td>
                        <td><strong>${formatCurrency(g.approved_amount)}</strong></td>
                        <td>${formatDate(g.approval_date)}</td>
                        <td>${getStatusBadge(g.grant_status)}</td>
                        <td style="text-align: center; white-space: nowrap;">
                            <button class="btn btn-secondary btn-sm edit-grant-btn" data-id="${g.grant_id}" title="Update Grant">
                                <span class="material-symbols-outlined" style="font-size:1rem;">edit</span>
                            </button>
                            <button class="btn btn-danger btn-sm delete-grant-btn" data-id="${g.grant_id}" title="Delete Grant">
                                <span class="material-symbols-outlined" style="font-size:1rem;">delete</span>
                            </button>
                        </td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
                <div style="margin-top: 1rem; font-size: 0.85rem; color: #64748b; text-align: right;">
                    Total grants shown: <strong>${grants.length}</strong>
                </div>
            `;

            tableContainer.innerHTML = html;

            // Bind actions in rows
            document.querySelectorAll(".edit-grant-btn").forEach(btn => {
                btn.addEventListener("click", () => renderUpdateGrant(btn.getAttribute("data-id")));
            });
            document.querySelectorAll(".delete-grant-btn").forEach(btn => {
                btn.addEventListener("click", () => renderDeleteGrant(btn.getAttribute("data-id")));
            });

        } catch (err) {
            document.getElementById("tableContainer").innerHTML = `
                <div class="alert alert-error">
                    <span class="material-symbols-outlined">error</span>
                    <span>Error connecting to server: ${err.message}</span>
                </div>
            `;
        }
    }

    // ==========================================
    // 2. INSERT NEW GRANT
    // ==========================================
    async function renderInsertGrant() {
        setActiveButton(btnInsert);
        const noticeHtml = await checkStatus();

        // Fetch existing applications for dropdown/reference helper
        let appOptionsHtml = `<option value="">-- Select or enter manually below --</option>`;
        try {
            const res = await fetch("/api/applications");
            const appData = await res.json();
            if (appData.success && appData.data.length > 0) {
                appData.data.forEach(app => {
                    const title = app.project_title ? ` (${app.project_title})` : "";
                    appOptionsHtml += `<option value="${app.application_id}">App #${app.application_id}${title} - Req: $${Number(app.requested_amount).toLocaleString()}</option>`;
                });
            }
        } catch (_) {}

        display.innerHTML = `
            ${noticeHtml}
            <div class="card" style="max-width: 800px; margin: 0 auto;">
                <div class="card-header">
                    <h2 class="card-title">
                        <span class="material-symbols-outlined">add_circle</span> Insert New Grant
                    </h2>
                </div>

                <div id="insertAlert"></div>

                <form id="insertGrantForm">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="grant_id">Grant ID *</label>
                            <input type="number" id="grant_id" class="form-control" placeholder="e.g. 505" required min="1" />
                            <small style="color:#64748b; font-size:0.75rem;">Unique primary key identifier</small>
                        </div>

                        <div class="form-group">
                            <label for="application_select">Existing Application (Reference)</label>
                            <select id="application_select" class="form-control">
                                ${appOptionsHtml}
                            </select>
                            <small style="color:#64748b; font-size:0.75rem;">Select from GRANT_APPLICATION table</small>
                        </div>

                        <div class="form-group">
                            <label for="application_id">Application ID *</label>
                            <input type="number" id="application_id" class="form-control" placeholder="e.g. 401" required min="1" />
                            <small style="color:#64748b; font-size:0.75rem;">Foreign key matching GRANT_APPLICATION</small>
                        </div>

                        <div class="form-group">
                            <label for="approved_amount">Approved Amount (₹) *</label>
                            <input type="number" step="0.01" id="approved_amount" class="form-control" placeholder="e.g. 75000.00" required min="0" />
                        </div>

                        <div class="form-group">
                            <label for="approval_date">Approval Date *</label>
                            <input type="date" id="approval_date" class="form-control" required value="${new Date().toISOString().split('T')[0]}" />
                        </div>

                        <div class="form-group">
                            <label for="grant_status">Grant Status *</label>
                            <select id="grant_status" class="form-control" required>
                                <option value="Approved" selected>Approved</option>
                                <option value="Active">Active</option>
                                <option value="Pending">Pending</option>
                                <option value="Completed">Completed</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancelInsertBtn">Cancel</button>
                        <button type="submit" class="btn btn-primary" id="submitInsertBtn">
                            <span class="material-symbols-outlined" style="font-size:1.1rem;">save</span> Save Grant
                        </button>
                    </div>
                </form>
            </div>
        `;

        const appSelect = document.getElementById("application_select");
        const appIdInput = document.getElementById("application_id");
        appSelect.addEventListener("change", () => {
            if (appSelect.value) {
                appIdInput.value = appSelect.value;
            }
        });

        document.getElementById("cancelInsertBtn").addEventListener("click", () => renderSearchGrants());

        const form = document.getElementById("insertGrantForm");
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const alertDiv = document.getElementById("insertAlert");
            alertDiv.innerHTML = "";

            const payload = {
                grant_id: Number(document.getElementById("grant_id").value),
                application_id: Number(document.getElementById("application_id").value),
                approved_amount: Number(document.getElementById("approved_amount").value),
                approval_date: document.getElementById("approval_date").value,
                grant_status: document.getElementById("grant_status").value,
            };

            try {
                const res = await fetch("/api/grants", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const result = await res.json();

                if (!result.success) {
                    alertDiv.innerHTML = `
                        <div class="alert alert-error">
                            <span class="material-symbols-outlined">error</span>
                            <span>${result.error || "Failed to insert grant"}</span>
                        </div>
                    `;
                    return;
                }

                alertDiv.innerHTML = `
                    <div class="alert alert-success">
                        <span class="material-symbols-outlined">check_circle</span>
                        <span>${result.message} Loading table...</span>
                    </div>
                `;

                setTimeout(() => renderSearchGrants(), 1200);

            } catch (err) {
                alertDiv.innerHTML = `
                    <div class="alert alert-error">
                        <span class="material-symbols-outlined">error</span>
                        <span>Server error: ${err.message}</span>
                    </div>
                `;
            }
        });
    }

    // ==========================================
    // 3. UPDATE EXISTING GRANT
    // ==========================================
    async function renderUpdateGrant(prefillGrantId = null) {
        setActiveButton(btnUpdate);
        const noticeHtml = await checkStatus();

        display.innerHTML = `
            ${noticeHtml}
            <div class="card" style="max-width: 800px; margin: 0 auto;">
                <div class="card-header">
                    <h2 class="card-title">
                        <span class="material-symbols-outlined">update</span> Update Existing Grant
                    </h2>
                </div>

                <div id="updateAlert"></div>

                <div class="search-bar" style="max-width: 450px;">
                    <input 
                        type="number" 
                        id="lookupGrantId" 
                        class="search-input" 
                        placeholder="Enter Grant ID to update..." 
                        value="${prefillGrantId || ""}"
                        min="1"
                    />
                    <button class="btn btn-primary" id="lookupGrantBtn">Load</button>
                </div>

                <form id="updateGrantForm" style="display: none; margin-top: 1.5rem;">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="update_grant_id">Grant ID (Locked)</label>
                            <input type="number" id="update_grant_id" class="form-control" readonly style="background:#f1f5f9; cursor:not-allowed;" />
                        </div>

                        <div class="form-group">
                            <label for="update_application_id">Application ID *</label>
                            <input type="number" id="update_application_id" class="form-control" required min="1" />
                        </div>

                        <div class="form-group">
                            <label for="update_approved_amount">Approved Amount (₹) *</label>
                            <input type="number" step="0.01" id="update_approved_amount" class="form-control" required min="0" />
                        </div>

                        <div class="form-group">
                            <label for="update_approval_date">Approval Date *</label>
                            <input type="date" id="update_approval_date" class="form-control" required />
                        </div>

                        <div class="form-group">
                            <label for="update_grant_status">Grant Status *</label>
                            <select id="update_grant_status" class="form-control" required>
                                <option value="Approved">Approved</option>
                                <option value="Active">Active</option>
                                <option value="Pending">Pending</option>
                                <option value="Completed">Completed</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancelUpdateBtn">Cancel</button>
                        <button type="submit" class="btn btn-primary" id="submitUpdateBtn">
                            <span class="material-symbols-outlined" style="font-size:1.1rem;">save</span> Update Grant
                        </button>
                    </div>
                </form>
            </div>
        `;

        const lookupInput = document.getElementById("lookupGrantId");
        const lookupBtn = document.getElementById("lookupGrantBtn");
        const updateForm = document.getElementById("updateGrantForm");
        const alertDiv = document.getElementById("updateAlert");

        async function fetchAndPopulate(id) {
            alertDiv.innerHTML = "";
            if (!id) {
                alertDiv.innerHTML = `<div class="alert alert-warning">Please enter a valid Grant ID.</div>`;
                return;
            }

            try {
                const res = await fetch(`/api/grants/${id}`);
                const result = await res.json();

                if (!result.success || !result.data) {
                    updateForm.style.display = "none";
                    alertDiv.innerHTML = `
                        <div class="alert alert-error">
                            <span class="material-symbols-outlined">error</span>
                            <span>${result.error || `Grant #${id} was not found.`}</span>
                        </div>
                    `;
                    return;
                }

                const g = result.data;
                document.getElementById("update_grant_id").value = g.grant_id;
                document.getElementById("update_application_id").value = g.application_id;
                document.getElementById("update_approved_amount").value = Number(g.approved_amount);
                document.getElementById("update_approval_date").value = formatDate(g.approval_date);
                document.getElementById("update_grant_status").value = g.grant_status;

                updateForm.style.display = "block";

            } catch (err) {
                alertDiv.innerHTML = `
                    <div class="alert alert-error">
                        <span class="material-symbols-outlined">error</span>
                        <span>Error fetching grant details: ${err.message}</span>
                    </div>
                `;
            }
        }

        lookupBtn.addEventListener("click", () => fetchAndPopulate(lookupInput.value.trim()));
        lookupInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") fetchAndPopulate(lookupInput.value.trim());
        });

        document.getElementById("cancelUpdateBtn").addEventListener("click", () => renderSearchGrants());

        updateForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            alertDiv.innerHTML = "";
            const grantId = document.getElementById("update_grant_id").value;

            const payload = {
                application_id: Number(document.getElementById("update_application_id").value),
                approved_amount: Number(document.getElementById("update_approved_amount").value),
                approval_date: document.getElementById("update_approval_date").value,
                grant_status: document.getElementById("update_grant_status").value,
            };

            try {
                const res = await fetch(`/api/grants/${grantId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const result = await res.json();

                if (!result.success) {
                    alertDiv.innerHTML = `
                        <div class="alert alert-error">
                            <span class="material-symbols-outlined">error</span>
                            <span>${result.error || "Failed to update grant"}</span>
                        </div>
                    `;
                    return;
                }

                alertDiv.innerHTML = `
                    <div class="alert alert-success">
                        <span class="material-symbols-outlined">check_circle</span>
                        <span>${result.message} Returning to table...</span>
                    </div>
                `;

                setTimeout(() => renderSearchGrants(), 1200);

            } catch (err) {
                alertDiv.innerHTML = `
                    <div class="alert alert-error">
                        <span class="material-symbols-outlined">error</span>
                        <span>Server error: ${err.message}</span>
                    </div>
                `;
            }
        });

        if (prefillGrantId) {
            fetchAndPopulate(prefillGrantId);
        }
    }

    // ==========================================
    // 4. DELETE EXISTING GRANT
    // ==========================================
    async function renderDeleteGrant(prefillGrantId = null) {
        setActiveButton(btnDelete);
        const noticeHtml = await checkStatus();

        display.innerHTML = `
            ${noticeHtml}
            <div class="card" style="max-width: 650px; margin: 0 auto;">
                <div class="card-header">
                    <h2 class="card-title" style="color: #dc2626;">
                        <span class="material-symbols-outlined">delete_forever</span> Delete Existing Grant
                    </h2>
                </div>

                <div id="deleteAlert"></div>

                <p style="margin-bottom: 1.25rem; font-size: 0.95rem; color: #475569;">
                    Enter the ID of the grant you wish to permanently remove from the database:
                </p>

                <div class="search-bar" style="max-width: 400px;">
                    <input 
                        type="number" 
                        id="deleteGrantIdInput" 
                        class="search-input" 
                        placeholder="Grant ID (e.g. 501)" 
                        value="${prefillGrantId || ""}"
                        min="1"
                    />
                </div>

                <div id="deletePreviewArea" style="margin-top: 1rem;"></div>

                <div class="form-actions" style="margin-top: 1.5rem;">
                    <button type="button" class="btn btn-secondary" id="cancelDeleteBtn">Cancel</button>
                    <button type="button" class="btn btn-danger" id="confirmDeleteBtn">
                        <span class="material-symbols-outlined" style="font-size:1.1rem;">delete</span> Delete Grant
                    </button>
                </div>
            </div>
        `;

        const deleteInput = document.getElementById("deleteGrantIdInput");
        const confirmBtn = document.getElementById("confirmDeleteBtn");
        const cancelBtn = document.getElementById("cancelDeleteBtn");
        const alertDiv = document.getElementById("deleteAlert");

        cancelBtn.addEventListener("click", () => renderSearchGrants());

        confirmBtn.addEventListener("click", async () => {
            const id = deleteInput.value.trim();
            alertDiv.innerHTML = "";

            if (!id) {
                alertDiv.innerHTML = `<div class="alert alert-warning">Please enter a valid Grant ID to delete.</div>`;
                return;
            }

            const confirmed = window.confirm(`Are you sure you want to permanently delete Grant #${id}?`);
            if (!confirmed) return;

            try {
                const res = await fetch(`/api/grants/${id}`, {
                    method: "DELETE",
                });
                const result = await res.json();

                if (!result.success) {
                    alertDiv.innerHTML = `
                        <div class="alert alert-error">
                            <span class="material-symbols-outlined">error</span>
                            <span>${result.error || `Failed to delete Grant #${id}`}</span>
                        </div>
                    `;
                    return;
                }

                alertDiv.innerHTML = `
                    <div class="alert alert-success">
                        <span class="material-symbols-outlined">check_circle</span>
                        <span>${result.message} Returning to table...</span>
                    </div>
                `;

                setTimeout(() => renderSearchGrants(), 1200);

            } catch (err) {
                alertDiv.innerHTML = `
                    <div class="alert alert-error">
                        <span class="material-symbols-outlined">error</span>
                        <span>Server error: ${err.message}</span>
                    </div>
                `;
            }
        });
    }

    // ==========================================
    // Attach top navigation button events
    // ==========================================
    btnInsert.addEventListener("click", () => renderInsertGrant());
    btnSearch.addEventListener("click", () => renderSearchGrants());
    btnUpdate.addEventListener("click", () => renderUpdateGrant());
    btnDelete.addEventListener("click", () => renderDeleteGrant());

    // Default view: Search / View Table
    renderSearchGrants();
});
