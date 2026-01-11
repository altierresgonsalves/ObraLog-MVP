// Load from LocalStorage or use Default
let db = { works: [], timeline: [] };
let unsubscribeWorks = null;

// Mobile Sidebar Toggle
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// Firestore Collection Reference
const worksCollection = dbFirestore.collection('works');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Auth Listener
    auth.onAuthStateChanged((user) => {
        const authScreen = document.getElementById('auth-screen');
        const appScreen = document.getElementById('app');

        if (user) {
            // User is signed in
            console.log("User logged in:", user.email);
            authScreen.style.display = 'none';
            appScreen.style.display = 'flex';

            // Set User Name in Sidebar
            document.getElementById('user-name').innerText = user.email.split('@')[0];

            init(); // Load Data
        } else {
            // User is signed out
            console.log("User logged out");
            authScreen.style.display = 'flex';
            appScreen.style.display = 'none';

            // Cleanup Data and Listeners
            db.works = [];
            if (unsubscribeWorks) {
                unsubscribeWorks();
                unsubscribeWorks = null;
            }
        }
    });
});

// Handle Login
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;

    btn.innerText = 'Autenticando...';
    btn.disabled = true;

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed in - Listener will handle UI switch
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error(errorCode, errorMessage);
            alert("Falha no login: " + errorMessage);
            btn.innerText = originalText;
            btn.disabled = false;
        });
}

// Handle Logout
function handleLogout() {
    auth.signOut().then(() => {
        // Sign-out successful.
    }).catch((error) => {
        console.error("Logout error", error);
    });
}

function init() {
    loadData();

    // Setup Global Event Listeners
    // (Modal outside click is handled separately)
}

function loadData() {
    // Avoid duplicate listeners
    if (unsubscribeWorks) {
        unsubscribeWorks();
    }

    // Real-time listener from Firestore
    unsubscribeWorks = worksCollection.orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
        db.works = [];
        snapshot.forEach((doc) => {
            db.works.push({ id: doc.id, ...doc.data() });
        });

        render();
        renderSidebar();
    }, (error) => {
        console.error("Error loading works: ", error);
        // Only alert if it's not a permission error caused by logging out mid-request
        if (error.code !== 'permission-denied') {
            alert("Erro ao carregar obras. Verifique sua conexão.");
        }
    });
}

// NOTE: saveData() is removed. We now write directly to Firestore.

// State
let currentState = {
    view: 'dashboard',
    activeWorkId: null,
    mode: 'admin' // 'admin' or 'client'
};

// Navigation
function navigateTo(viewId, workId = null) {
    currentState.view = viewId;
    if (workId) currentState.activeWorkId = workId;

    // Update Sidebar UI
    renderSidebar(); // Refresh sidebar active state

    // Render View
    render();
}

function setMode(mode) {
    currentState.mode = mode;

    // UI Updates for Mode Switcher
    const adminBtn = document.getElementById('btn-mode-admin');
    const clientBtn = document.getElementById('btn-mode-client');
    const avatar = document.getElementById('user-avatar');
    const name = document.getElementById('user-name');
    const role = document.getElementById('user-role');

    if (mode === 'admin') {
        adminBtn.style.background = 'var(--primary)';
        adminBtn.style.color = 'white';
        clientBtn.style.background = 'transparent';
        clientBtn.style.color = 'var(--text-muted)';

        avatar.innerText = 'AD';
        name.innerText = 'Admin';
        role.innerText = 'Engenheiro';
    } else {
        clientBtn.style.background = 'var(--primary)';
        clientBtn.style.color = 'white';
        adminBtn.style.background = 'transparent';
        adminBtn.style.color = 'var(--text-muted)';

        avatar.innerText = 'CL';
        name.innerText = 'Cliente';
        role.innerText = 'Visualização';
    }

    render(); // Re-render content based on mode
}

function renderSidebar() {
    const activeList = document.getElementById('active-works-list');

    // Render list of active works
    const activeWorks = db.works.filter(w => w.status === 'Em Andamento');
    activeList.innerHTML = activeWorks.length ? activeWorks.map(w => `
        <li class="${currentState.activeWorkId === w.id && currentState.view === 'timeline' ? 'active' : ''}" 
            onclick="navigateTo('timeline', '${w.id}')">
            • ${w.client}
        </li>
    `).join('') : '<li style="padding:0.5rem; font-style:italic;">Nenhuma obra ativa</li>';

    // Handle main Dashboard link active state
    const dashLink = document.querySelector('[data-view="dashboard"]');
    if (currentState.view === 'dashboard') {
        dashLink.classList.add('active');
    } else {
        dashLink.classList.remove('active');
    }
}

function render() {
    const contentArea = document.getElementById('content-area');
    const pageTitle = document.getElementById('page-title');
    const topBarBtn = document.querySelector('.top-bar .btn-primary'); // The header 'Nova Obra' button

    contentArea.innerHTML = '';

    // Handle Header Button Visibility
    if (currentState.mode === 'client') {
        if (topBarBtn) topBarBtn.style.display = 'none';
    } else {
        if (topBarBtn) topBarBtn.style.display = 'flex';
    }

    if (currentState.view === 'dashboard') {
        pageTitle.innerText = 'Visão Geral das Obras';
        contentArea.innerHTML = renderDashboard();
    } else if (currentState.view === 'timeline') {
        const work = db.works.find(w => w.id === currentState.activeWorkId) || db.works[0];
        // Safety check if work exists (e.g. if db was cleared or changed)
        if (work) {
            pageTitle.innerText = `Linha do Tempo: ${work.client}`;
            contentArea.innerHTML = renderTimeline(work);
        } else {
            // Fallback
            pageTitle.innerText = `Linha do Tempo`;
            contentArea.innerHTML = '<p>Obra não encontrada.</p>';
        }
    }

    // Animate content entrance
    contentArea.animate([
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' }
    ], {
        duration: 300,
        easing: 'ease-out'
    });
}

// Templates
function renderDashboard() {
    return `
        <div class="grid">
            ${db.works.map(work => `
                <div class="card">
                    <div class="meta" style="margin-top:0; padding-top:0; border:none; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <span class="status-badge status-active">${work.status}</span>
                            <span style="font-size:0.8rem; color:var(--text-muted)">${formatDate(work.startDate)}</span>
                        </div>
                        ${currentState.mode === 'admin' ? `
                        <button onclick="requestDelete('${work.id}', event)" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:4px;" title="Excluir Obra">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>` : ''}
                    </div>
                    <h3>${work.client}</h3>
                    <p>${work.address}</p>
                    
                    <div style="margin-top: 1rem;">
                        <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.25rem;">
                            <span>Progresso Geral</span>
                            <span>${work.progress}%</span>
                        </div>
                        <div style="width:100%; height:8px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden;">
                            <div style="width:${work.progress}%; height:100%; background:var(--primary); border-radius:4px;"></div>
                        </div>
                    </div>

                    <div class="meta">
                        <button class="btn-secondary" style="width:100%; justify-content:center; padding: 0.5rem;" onclick="navigateTo('timeline', '${work.id}')">
                            Ver Detalhes
                        </button>
                    </div>
                </div>
            `).join('')}
            
            ${currentState.mode === 'admin' ? `
             <div class="card" style="border-style: dashed; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; min-height:200px; opacity:0.7" onclick="openModal('create-work-modal')">
                <div style="width:50px; height:50px; background:rgba(255,255,255,0.05); border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:1rem;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </div>
                <h3>Adicionar Nova Obra</h3>
            </div>` : ''}
        </div>
    `;
}

function renderTimeline(work) {
    if (!work) work = db.works[0];
    const projectImage = 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1000&auto=format&fit=crop';

    // Generate Stage Progress HTML
    let stagesHtml = '';
    if (work.stages) {
        stagesHtml = Object.entries(work.stages).map(([key, stage]) => {
            if (!stage.active) return '';
            return `
                <div style="margin-bottom: 0.75rem;">
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.25rem;">
                        <span>${stage.label}</span>
                        <span style="color:var(--primary);">${stage.progress}%</span>
                    </div>
                    <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
                        <div style="width:${stage.progress}%; height:100%; background:var(--primary); border-radius:3px;"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    return `
        <div class="timeline-view-split">
            <!-- Left: Persistent Project Reference -->
            <aside class="project-reference-panel">
                <h4 style="margin-bottom:0.5rem; font-size:0.9rem; color:var(--text-muted);">Progresso por Etapa</h4>
                <div class="card" style="background:rgba(0,0,0,0.2); border:1px solid var(--border); padding:1rem; margin-bottom:1.5rem;">
                    ${stagesHtml || '<p style="font-size:0.8rem; color:var(--text-muted);">Nenhuma etapa definida.</p>'}
                </div>

                <h3>Referência do Projeto</h3>
                <div class="project-image-container">
                    <img src="${projectImage}" alt="Planta/Projeto">
                    <div style="position:absolute; bottom:10px; left:10px; background:rgba(0,0,0,0.7); padding:5px 10px; border-radius:4px; font-size:0.8rem;">
                        Planta Geral
                    </div>
                </div>
                
                <h4 style="margin-bottom:0.5rem; font-size:0.9rem; color:var(--text-muted);">Arquivos do Projeto</h4>
                <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
                     ${work.projectFiles && work.projectFiles.length > 0 ? work.projectFiles.map(file => `
                        <a href="${file.url}" target="_blank" class="doc-badge">📄 ${file.name}</a>
                     `).join('') : '<span style="font-size:0.8rem; color:var(--text-muted)">Nenhum arquivo anexado.</span>'}
                </div>
            </aside>

            <!-- Right: Scrollable Timeline -->
            <div class="timeline-scroll-area">
                <div class="timeline-actions">
                   <h3 style="margin:0;">Diário de Obra</h3>
                   ${currentState.mode === 'admin' ? `
                   <button class="btn-primary" onclick="openModal('new-update-modal')">
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                       Nova Atualização
                   </button>` : ''}
                </div>

                <div class="timeline-container">
                    ${(work.updates || []).sort((a, b) => new Date(b.date) - new Date(a.date)).map(item => `
                        <div class="timeline-item">
                            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                                <div class="timeline-date" style="min-width:auto;">${formatDate(item.date)}</div>
                                <span class="status-badge" style="background:rgba(255,255,255,0.05); color:var(--text-muted); padding:2px 8px;">${item.type === 'milestone' ? 'Marco' : 'Progresso'}</span>
                            </div>
                            
                            <div class="timeline-content" style="width: 100%;">
                                ${item.role ? `<span class="timeline-role-tag ${item.role}">
                                    ${getRoleIcon(item.role)} ${getRoleName(item.role)}
                                </span>` : ''}
                                <h4>${item.title}</h4>
                                <p>${item.description}</p>
                                ${item.hasMedia ? `
                                    <div class="timeline-media-grid">
                                        ${item.photos ? item.photos.map(url => `
                                            <div class="media-item">
                                                <img src="${url}" alt="Foto da obra" onclick="window.open(this.src, '_blank')" style="cursor:pointer">
                                            </div>
                                        `).join('') :
                Array(item.mediaCount || 0).fill(0).map((_, i) => `
                                            <div class="media-item">
                                                <img src="https://source.unsplash.com/random/200x200?construction,site&sig=${item.id}${i}" alt="Foto da obra">
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('') || '<div class="timeline-item" style="justify-content:center; opacity:0.7"><p>Nenhuma atualização registrada nesta obra.</p></div>'}
                     <div class="timeline-item" style="border-style:dashed; opacity:0.5; justify-content:center;">
                        <p>Início da Obra</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Helpers
function getRoleName(role) {
    const roles = {
        'architect': 'Arquiteto',
        'electrician': 'Eletricista',
        'plumber': 'Encanador',
        'bricklayer': 'Pedreiro',
        'painter': 'Pintor',
        'carpenter': 'Marceneiro',
        'plasterer': 'Gesseiro',
        'glazier': 'Vidraceiro',
        'locksmith': 'Serralheiro'
    };
    return roles[role] || role; // Return role key if no match, instead of just 'Profissional'
}

function getRoleIcon(role) {
    const icons = {
        'architect': '📐',
        'electrician': '⚡',
        'plumber': '💧',
        'bricklayer': '🧱',
        'painter': '🖌️',
        'carpenter': '🪚',
        'plasterer': '🏗️',
        'glazier': '🪟',
        'locksmith': '🔐'
    };
    return icons[role] || '👤';
}

// Helpers
function formatDate(dateStr) {
    if (!dateStr) return '';
    try { const [y, m, d] = dateStr.split('-'); const date = new Date(y, m - 1, d); return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return dateStr; }
}

// Custom Stage Logic
function addCustomStage() {
    const input = document.getElementById('new-stage-name');
    const name = input.value.trim();
    if (!name) return;

    const id = 'custom_' + Date.now();
    const container = document.getElementById('stages-container');

    const label = document.createElement('label');
    label.style.cssText = "display:flex; align-items:center; gap:0.5rem; background:rgba(255,255,255,0.05); padding:0.5rem; border-radius:4px; cursor:pointer;";
    label.innerHTML = `<input type="checkbox" name="stage" value="${id}" data-label="${name}" checked> ${name}`;

    container.appendChild(label);

    input.value = '';
    document.getElementById('custom-stage-input-group').style.display = 'none';
}

function populateRoleDropdown() {
    const work = db.works.find(w => w.id === currentState.activeWorkId);
    const select = document.getElementById('update-role');

    // Base roles
    const baseRoles = [
        { val: 'architect', label: 'Arquiteto / Eng. Responsável' },
        { val: 'bricklayer', label: 'Pedreiro / Alvenaria' },
        { val: 'electrician', label: 'Eletricista' },
        { val: 'plumber', label: 'Encanador / Hidráulica' },
        { val: 'painter', label: 'Pintor' },
        { val: 'carpenter', label: 'Marceneiro / Carpinteiro' },
        { val: 'plasterer', label: 'Gesseiro' },
        { val: 'glazier', label: 'Vidraceiro' },
        { val: 'locksmith', label: 'Serralheiro' }
    ];

    // Clear and re-add default empty option
    select.innerHTML = '<option value="" disabled selected>Quem está postando?</option>';

    const addedKeys = new Set();

    // 1. Add roles from the Project Stages (This includes Custom ones!)
    if (work && work.stages) {
        Object.entries(work.stages).forEach(([key, stage]) => {
            if (stage.active) {
                const opt = document.createElement('option');
                opt.value = key;
                opt.innerText = stage.label;
                select.appendChild(opt);
                addedKeys.add(key);
            }
        });
    }

    // 2. Add remaining base roles if not already added (fallback)
    baseRoles.forEach(role => {
        if (!addedKeys.has(role.val)) {
            const opt = document.createElement('option');
            opt.value = role.val;
            opt.innerText = role.label;
            select.appendChild(opt);
        }
    });

    // Reset progress input display
    document.getElementById('stage-progress-container').style.display = 'none';
}


// Modified Modal Logic to Trigger Dropdown Population
function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
    const dateInput = document.querySelector(`#${modalId} input[type="date"]`);
    if (dateInput && !dateInput.value) {
        dateInput.valueAsDate = new Date();
    }

    if (modalId === 'new-update-modal') {
        populateRoleDropdown();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// Close modal when clicking outside
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
}

// Handle Work Deletion
// Handle Work Deletion
let pendingDeleteId = null;

function requestDelete(id, event) {
    if (event) event.stopPropagation(); // Prevent card click

    pendingDeleteId = id;
    const work = db.works.find(w => w.id === id);
    if (work) {
        document.getElementById('delete-target-name').innerText = work.client;
        openModal('delete-modal');
    }
}

function confirmDelete() {
    if (!pendingDeleteId) return;

    worksCollection.doc(pendingDeleteId).delete().then(() => {
        closeModal('delete-modal');
        if (currentState.view === 'timeline' && currentState.activeWorkId === pendingDeleteId) {
            navigateTo('dashboard');
        }
        pendingDeleteId = null;
    }).catch((error) => {
        console.error("Error removing document: ", error);
        alert("Erro ao excluir obra: " + error.message);
    });
}

// Handle Update with Stage Progress
// FIX: Function name matches HTML (handleAddUpdate)
function handleAddUpdate(e) {
    e.preventDefault();
    if (!currentState.activeWorkId) return;

    const form = e.target;
    // Get Elements
    // FIX: Input ID matches HTML (update-media)
    const fileInput = document.getElementById('update-media');
    const files = Array.from(fileInput.files);
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerText;

    // Get Details
    const roleSelect = document.getElementById('update-role'); // Changed from update-stage
    const role = roleSelect.value;
    // For description
    const description = form.querySelector('textarea').value;

    if (!role) {
        alert("Selecione quem está postando.");
        return;
    }
    if (!description) {
        alert("Adicione uma descrição.");
        return;
    }

    const work = db.works.find(w => w.id === currentState.activeWorkId);
    if (!work) return;

    // UI Feedback
    btn.disabled = true;
    btn.innerText = "Enviando...";

    // 1. Upload Files Promise
    const uploadPromises = files.map(file => {
        // Path: works/{workId}/{timestamp}_{filename}
        const filePath = `works/${currentState.activeWorkId}/${Date.now()}_${file.name}`;
        const ref = storage.ref(filePath);
        return ref.put(file).then(snapshot => snapshot.ref.getDownloadURL());
    });

    Promise.all(uploadPromises).then(downloadURLs => {
        // 2. Prepare Update Object
        // Get stage progress if applicable
        const progressInput = document.getElementById('update-progress');
        const newProgressVal = parseInt(progressInput.value) || 0;

        let container = document.getElementById('stage-progress-container');
        let isStageUpdate = container.style.display !== 'none';

        const newUpdate = {
            id: Date.now(),
            date: document.getElementById('update-date').value || new Date().toISOString().split('T')[0],
            role: role,
            title: isStageUpdate ? `Atualização de ${work.stages[role]?.label || role}` : 'Diário de Obra',
            description: description,
            photos: downloadURLs, // Real URLs from Storage
            mediaCount: downloadURLs.length,
            hasMedia: downloadURLs.length > 0,
            type: 'progress'
        };

        // 3. Firestore Update Object
        let updateData = {
            updates: firebase.firestore.FieldValue.arrayUnion(newUpdate)
        };

        // 4. Update Progress if applicable
        if (isStageUpdate && work.stages[role]) {
            // Update the specific stage
            updateData[`stages.${role}.progress`] = newProgressVal;

            // Recalculate Global Progress
            let updatedStages = { ...work.stages };
            updatedStages[role].progress = newProgressVal;

            let total = 0;
            let count = 0;
            Object.values(updatedStages).forEach(s => {
                if (s.active) {
                    total += s.progress;
                    count++;
                }
            });
            updateData['progress'] = count > 0 ? Math.round(total / count) : 0;
        }

        return worksCollection.doc(currentState.activeWorkId).update(updateData);
    })
        .then(() => {
            console.log("Update sent successfully!");
            closeModal('new-update-modal');
            form.reset();
            // Clear preview
            document.getElementById('media-preview').innerHTML = '';
            alert("Atualização publicada com sucesso!");
        })
        .catch((error) => {
            console.error("Error in update flow: ", error);
            alert("Erro ao enviar: " + error.message);
        })
        .finally(() => {
            btn.disabled = false;
            btn.innerText = originalText;
        });
}

function handleCreateWork(e) {
    e.preventDefault();
    const form = e.target;
    // Use try-catch for immediate synchronous errors
    try {
        // 1. Basic Info
        const clientName = form.querySelector('input[placeholder="Ex: João Silva"]').value;
        const address = form.querySelector('input[placeholder="Ex: Rua das Flores, 123"]').value;
        const startDate = form.querySelector('input[type="date"]').value;

        if (!clientName || !address || !startDate) {
            alert("Preencha as informações básicas.");
            return;
        }

        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = "Criando Obra...";

        // 2. Custom Stages
        const checkedBoxes = Array.from(document.querySelectorAll('input[name="stage"]:checked'));
        let stages = {};

        if (checkedBoxes.length === 0) {
            // Default fallback
            stages = { 'bricklayer': { label: 'Alvenaria', active: true, progress: 0 } };
        } else {
            checkedBoxes.forEach(box => {
                const label = box.parentElement.innerText.trim();
                const key = box.value;
                stages[key] = {
                    label: label,
                    active: true,
                    progress: 0
                };
            });
        }

        // 3. Prepare Data
        const newWork = {
            client: clientName,
            address: address,
            startDate: startDate,
            status: 'Planejamento',
            progress: 0,
            stages: stages,
            updates: [],
            projectFiles: [], // To be populated
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // 4. Create Document FIRST to get ID
        worksCollection.add(newWork)
            .then((docRef) => {
                console.log("Document written with ID: ", docRef.id);

                // 5. Upload Files (if any)
                const fileInput = document.getElementById('project-files');
                const files = Array.from(fileInput.files);

                if (files.length > 0) {
                    btn.innerText = "Enviando Arquivos...";

                    const uploadPromises = files.map(file => {
                        const filePath = `works/${docRef.id}/project_${Date.now()}_${file.name}`;
                        return storage.ref(filePath).put(file).then(s => s.ref.getDownloadURL().then(url => ({
                            name: file.name,
                            url: url
                        })));
                    });

                    return Promise.all(uploadPromises).then(uploadedFiles => {
                        // Update the doc with files
                        return docRef.update({
                            projectFiles: uploadedFiles,
                            status: 'Em Andamento' // Switch to active once setup is done
                        });
                    });
                }
            })
            .then(() => {
                closeModal('create-work-modal');
                form.reset();
                document.getElementById('selected-project-files').innerText = '';
                // Remove custom inputs
                const container = document.getElementById('stages-container');
                const customs = container.querySelectorAll('input[value^="custom_"]');
                customs.forEach(el => el.parentElement.remove());

                alert("Obra criada com sucesso!");
                btn.disabled = false;
                btn.innerText = originalText;
            })
            .catch((error) => {
                console.error("Error adding document: ", error);
                alert("Erro ao criar obra: " + error.message);
                btn.disabled = false;
                btn.innerText = originalText;
            });

    } catch (err) {
        alert("Erro inesperado: " + err.message);
    }
}

// Handle Update with Stage Progress
function updateStageProgressInput(role) {
    const container = document.getElementById('stage-progress-container');
    const label = document.getElementById('stage-label');
    const range = document.getElementById('update-progress');
    const valDisplay = document.getElementById('stage-value');

    const work = db.works.find(w => w.id === currentState.activeWorkId);

    // Check if the selected role corresponds to a tracked stage
    if (work && work.stages && work.stages[role]) {
        container.style.display = 'block';
        label.innerText = work.stages[role].label;
        range.value = work.stages[role].progress;
        valDisplay.innerText = range.value + '%';
    } else {
        container.style.display = 'none';
    }
}

// Media Preview Helper
function previewFiles(input, previewId) {
    const container = document.getElementById(previewId);
    container.innerHTML = '';
    const files = Array.from(input.files);

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.cssText = "width:60px; height:60px; object-fit:cover; border-radius:4px; border:1px solid var(--border);";
            container.appendChild(img);
        }
        reader.readAsDataURL(file);
    });
}

function displaySelectedFiles(input) {
    const container = document.getElementById('selected-project-files');
    if (input.files && input.files.length > 0) {
        container.innerHTML = `✅ ${input.files.length} arquivo(s) selecionado(s)`;
    } else {
        container.innerHTML = '';
    }
}

// End of App Logic
