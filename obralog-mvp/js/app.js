// Mock Data Initial State (Fallback)
const defaultDb = {
    works: [
        {
            id: 1,
            client: 'Residência Família Silva',
            address: 'Rua das Magnólias, 45 - Jardins',
            status: 'Em Andamento',
            progress: 65,
            startDate: '2023-11-15',
            stages: {
                bricklayer: { label: 'Alvenaria', active: true, progress: 100 },
                electrician: { label: 'Elétrica', active: true, progress: 60 },
                plumber: { label: 'Hidráulica', active: true, progress: 40 },
                painter: { label: 'Pintura', active: true, progress: 10 }
            }
        },
        {
            id: 2,
            client: 'Reforma Apto 502',
            address: 'Av. Paulista, 1000',
            status: 'Planejamento',
            progress: 10,
            startDate: '2024-02-01',
            stages: {
                bricklayer: { label: 'Alvenaria', active: true, progress: 0 },
                painter: { label: 'Pintura', active: true, progress: 0 }
            }
        },
        {
            id: 3,
            client: 'Área Gourmet Oliveira',
            address: 'R. Vergueiro, 780',
            status: 'Concluído',
            progress: 100,
            startDate: '2023-08-10',
            stages: {
                bricklayer: { label: 'Alvenaria', active: true, progress: 100 }
            }
        }
    ],
    timeline: [
        {
            id: 1,
            date: '2024-01-09',
            title: 'Instalação Elétrica',
            description: 'Conclusão da passagem de fios no segundo andar e instalação de caixas de passagem.',
            type: 'progress',
            hasMedia: true,
            mediaCount: 3,
            author: 'Carlos Eletricista',
            role: 'electrician'
        },
        {
            id: 2,
            date: '2024-01-05',
            title: 'Revestimento Banheiros',
            description: 'Início do assentamento de porcelanato nos banheiros da suíte master.',
            type: 'progress',
            hasMedia: true,
            mediaCount: 2,
            author: 'Marcos Pedreiro',
            role: 'bricklayer'
        },
        {
            id: 3,
            date: '2023-12-20',
            title: 'Alvenaria Concluída',
            description: 'Finalização de todas as paredes divisórias do primeiro pavimento.',
            type: 'milestone',
            hasMedia: false,
            author: 'Eng. Ana',
            role: 'architect'
        }
    ]
};

// Load from LocalStorage or use Default
// With Firestore, `db.works` will be populated by the listener. `db.timeline` will remain as mock for now.
// With Firestore, `db.works` will be populated by the listener. `db.timeline` will remain as mock for now.
let db = { works: [], timeline: defaultDb.timeline };

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
            db.works = []; // Clear local data
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
    // Real-time listener from Firestore
    worksCollection.orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
        db.works = [];
        snapshot.forEach((doc) => {
            db.works.push({ id: doc.id, ...doc.data() });
        });

        render();
        renderSidebar();
    }, (error) => {
        console.error("Error loading works: ", error);
        alert("Erro ao carregar obras. Verifique sua conexão.");
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
            onclick="navigateTo('timeline', ${w.id})">
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
                        <button onclick="requestDelete(${work.id}, event)" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:4px;" title="Excluir Obra">
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
                        <button class="btn-secondary" style="width:100%; justify-content:center; padding: 0.5rem;" onclick="navigateTo('timeline', ${work.id})">
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
                     <a href="#" class="doc-badge">📄 Planta Baixa.pdf</a>
                     <a href="#" class="doc-badge">📐 Croqui Inicial.png</a>
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
                    ${db.timeline.map(item => `
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
                                        ${Array(item.mediaCount).fill(0).map((_, i) => `
                                            <div class="media-item">
                                                <img src="https://source.unsplash.com/random/200x200?construction,site&sig=${item.id}${i}" alt="Foto da obra">
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
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
    const roles = { 'architect': 'Arquiteto', 'electrician': 'Eletricista', 'plumber': 'Encanador', 'bricklayer': 'Pedreiro', 'painter': 'Pintor', 'carpenter': 'Marceneiro' };
    return roles[role] || 'Profissional';
}

function getRoleIcon(role) {
    const icons = { 'architect': '📐', 'electrician': '⚡', 'plumber': '💧', 'bricklayer': '🧱', 'painter': '🖌️', 'carpenter': '🪚' };
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
        { val: 'painter', label: 'Pintor' }
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
function handleNewUpdate(e) {
    e.preventDefault();
    if (!currentState.activeWorkId) return;

    const form = e.target;
    // Get Elements
    const fileInput = document.getElementById('update-photos');
    const files = Array.from(fileInput.files);
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerText;

    // Get Details
    const stageSelect = document.getElementById('update-stage');
    const stageKey = stageSelect.value;
    const stageLabel = stageSelect.options[stageSelect.selectedIndex].text;
    const progressInput = document.getElementById('update-progress');
    const newProgressVal = parseInt(progressInput.value);
    const description = form.querySelector('textarea').value;

    if (!description) {
        alert("Adicione uma descrição.");
        return;
    }

    const work = db.works.find(w => w.id === currentState.activeWorkId);
    if (!work) return;

    // UI Feedback
    btn.disabled = true;
    btn.innerText = "Enviando (" + files.length + " fotos)...";

    // 1. Upload Files Promise
    const uploadPromises = files.map(file => {
        // Path: works/{workId}/{timestamp}_{filename}
        const filePath = `works/${currentState.activeWorkId}/${Date.now()}_${file.name}`;
        const ref = storage.ref(filePath);
        return ref.put(file).then(snapshot => snapshot.ref.getDownloadURL());
    });

    Promise.all(uploadPromises).then(downloadURLs => {
        // 2. Prepare Update Object
        const newUpdate = {
            id: Date.now(),
            date: new Date().toISOString(),
            stageKey: stageKey,
            stageLabel: stageLabel,
            description: description,
            photos: downloadURLs, // Real URLs from Storage
            progressSnapshot: newProgressVal
        };

        // 3. Calculate Global Progress
        let updatedStages = { ...work.stages };
        if (updatedStages[stageKey]) {
            updatedStages[stageKey].progress = newProgressVal;
        }

        const totalStages = Object.keys(updatedStages).length;
        let totalProgressSum = 0;
        Object.values(updatedStages).forEach(s => totalProgressSum += s.progress);
        const newGlobalProgress = Math.round(totalProgressSum / totalStages);

        // 4. Firestore Update
        let updateData = {
            progress: newGlobalProgress,
            updates: firebase.firestore.FieldValue.arrayUnion(newUpdate)
        };

        // Dynamic nested update for stage progress
        updateData[`stages.${stageKey}.progress`] = newProgressVal;

        return worksCollection.doc(currentState.activeWorkId).update(updateData);
    })
        .then(() => {
            console.log("Update sent successfully!");
            closeModal('new-update-modal');
            form.reset();
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

    // 1. Basic Info
    const clientName = form.querySelector('input[placeholder="Nome do Cliente"]').value;
    const address = form.querySelector('input[placeholder="Endereço Completo"]').value;
    const startDate = form.querySelector('input[type="date"]').value;

    if (!clientName || !address || !startDate) {
        alert("Preencha as informações básicas.");
        return;
    }

    // 2. Custom Stages
    // Get all checked checkboxes
    const checkedBoxes = Array.from(document.querySelectorAll('input[name="stage"]:checked'));

    // Build stages object
    let stages = {};

    if (checkedBoxes.length === 0) {
        // Fallback default
        stages = {
            'foundation': { label: 'Fundação', active: true, progress: 0 },
            'masonry': { label: 'Alvenaria', active: true, progress: 0 },
            'roofing': { label: 'Cobertura', active: true, progress: 0 },
            'finishing': { label: 'Acabamento', active: true, progress: 0 }
        };
    } else {
        checkedBoxes.forEach(box => {
            const label = box.value; // e.g., 'Alvenaria'
            // Create a simple key from the label (e.g., 'Alvenaria' -> 'alvenaria')
            const key = label.toLowerCase().replace(/\s+/g, '_');
            stages[key] = {
                label: label,
                active: true,
                progress: 0
            };
        });
    }

    const newWork = {
        // ID is generated by Firestore
        client: clientName,
        address: address,
        startDate: startDate,
        status: 'Planejamento',
        progress: 0,
        stages: stages,
        updates: [], // Initialize empty updates array
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Save to Firestore
    worksCollection.add(newWork)
        .then((docRef) => {
            console.log("Document written with ID: ", docRef.id);
            closeModal('create-work-modal');
            form.reset();
            // Reset checkboxes
            populateStagesList();
        })
        .catch((error) => {
            console.error("Error adding document: ", error);
            alert("Erro ao criar obra: " + error.message);
        });
    // We might need to manually remove custom inputs from DOM if we want a clean slate visually, 
    // but form.reset() unchecked them. We should remove the DOM elements for custom ones.
    const container = document.getElementById('stages-container');
    // Remove any input with value starting with custom_
    const customs = container.querySelectorAll('input[value^="custom_"]');
    customs.forEach(el => el.parentElement.remove());
}

// Handle Update with Stage Progress
function updateStageProgressInput(role) {
    const container = document.getElementById('stage-progress-container');
    const label = document.getElementById('stage-label');
    const range = document.getElementById('update-progress');
    const valDisplay = document.getElementById('stage-value');

    // Find if this role matches a stage in the CURRENT active work
    const work = db.works.find(w => w.id === currentState.activeWorkId);
    let stageKey = role; // simplified matching

    if (work && work.stages && work.stages[stageKey]) {
        container.style.display = 'block';
        label.innerText = work.stages[stageKey].label;
        range.value = work.stages[stageKey].progress;
        valDisplay.innerText = range.value + '%';
    } else {
        container.style.display = 'none';
        // Architect or others might not update a specific stage chart directly here in this simple logic
    }
}

// End of App Logic
