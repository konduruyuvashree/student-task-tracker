// =====================
// THEME TOGGLE
// =====================
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

const savedTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', savedTheme);
themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

themeToggle.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
});

// =====================
// LOAD TASKS
// =====================
async function loadTasks(subject = '', status = '') {
    const params = new URLSearchParams();
    if (subject) params.append('subject', subject);
    if (status) params.append('status', status);

    const res = await fetch(`/api/tasks?${params}`);
    const tasks = await res.json();
    renderTasks(tasks);
    updateStats(tasks);
    checkReminders(tasks);
    loadSubjectFilter();
}

function renderTasks(tasks) {
    const list = document.getElementById('taskList');
    const empty = document.getElementById('emptyState');

    if (tasks.length === 0) {
        list.innerHTML = '';
        list.appendChild(empty);
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    list.innerHTML = tasks.map(task => {
        const today = new Date().toISOString().split('T')[0];
        const isOverdue = task.deadline && task.deadline < today && task.status !== 'Completed';
        const isCompleted = task.status === 'Completed';

        const deadlineBadge = task.deadline
            ? `<span class="badge badge-deadline ${isOverdue ? 'overdue' : ''}">
                 ${isOverdue ? '⚠️' : '📅'} ${task.deadline}
               </span>`
            : '';

        const statusClass = task.status.replace(' ', '.');
        return `
        <div class="task-card ${isCompleted ? 'completed' : ''}">
            <div class="task-priority-dot priority-${task.priority}"></div>
            <div class="task-body">
                <div class="task-title">${escapeHtml(task.title)}</div>
                <div class="task-meta">
                    <span class="badge badge-subject">${escapeHtml(task.subject)}</span>
                    ${deadlineBadge}
                    <span class="badge badge-status-${statusClass}">${task.status}</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="btn-icon" onclick="openEdit(${JSON.stringify(task).replace(/"/g, '&quot;')})">✏️</button>
                <button class="btn-icon" onclick="markDone(${task.id}, '${task.status}')">${isCompleted ? '↩️' : '✅'}</button>
                <button class="btn-icon delete" onclick="deleteTask(${task.id})">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// =====================
// STATS
// =====================
function updateStats(tasks) {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('totalCount').textContent = tasks.length;
    document.getElementById('pendingCount').textContent = tasks.filter(t => t.status === 'Pending').length;
    document.getElementById('doneCount').textContent = tasks.filter(t => t.status === 'Completed').length;
    document.getElementById('urgentCount').textContent = tasks.filter(t => t.deadline === today && t.status !== 'Completed').length;
}

// =====================
// DEADLINE REMINDERS
// =====================
function checkReminders(tasks) {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const urgent = tasks.filter(t =>
        t.status !== 'Completed' &&
        (t.deadline === today || t.deadline === tomorrow || t.deadline < today)
    );
    const banner = document.getElementById('reminderBanner');
    const text = document.getElementById('reminderText');
    if (urgent.length > 0) {
        const overdue = urgent.filter(t => t.deadline < today).length;
        const dueToday = urgent.filter(t => t.deadline === today).length;
        const dueTomorrow = urgent.filter(t => t.deadline === tomorrow).length;
        let msg = '⚠️ Reminder: ';
        const parts = [];
        if (overdue) parts.push(`${overdue} task(s) overdue`);
        if (dueToday) parts.push(`${dueToday} task(s) due today`);
        if (dueTomorrow) parts.push(`${dueTomorrow} task(s) due tomorrow`);
        text.textContent = msg + parts.join(' · ');
        banner.style.display = 'flex';
    } else {
        banner.style.display = 'none';
    }
}

// =====================
// ADD TASK
// =====================
document.getElementById('addTaskBtn').addEventListener('click', async () => {
    const title = document.getElementById('taskTitle').value.trim();
    const subject = document.getElementById('taskSubject').value.trim();
    const deadline = document.getElementById('taskDeadline').value;
    const priority = document.getElementById('taskPriority').value;
    const status = document.getElementById('taskStatus').value;

    if (!title || !subject) {
        alert('Please enter task title and subject.');
        return;
    }

    await fetch('/api/tasks', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({title, subject, deadline, priority, status})
    });

    document.getElementById('taskTitle').value = '';
    document.getElementById('taskSubject').value = '';
    document.getElementById('taskDeadline').value = '';
    document.getElementById('taskPriority').value = 'Medium';
    document.getElementById('taskStatus').value = 'Pending';

    loadTasks();
});

// =====================
// DELETE TASK
// =====================
async function deleteTask(id) {
    if (!confirm('Delete this task?')) return;
    await fetch(`/api/tasks/${id}`, {method: 'DELETE'});
    loadTasks();
}

// =====================
// MARK DONE / UNDO
// =====================
async function markDone(id, currentStatus) {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    const res = await fetch(`/api/tasks/${id}`);
    // We need current data — fetch all and find
    const all = await fetch('/api/tasks').then(r => r.json());
    const task = all.find(t => t.id === id);
    if (!task) return;
    await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...task, status: newStatus})
    });
    loadTasks();
}

// =====================
// EDIT TASK
// =====================
function openEdit(task) {
    document.getElementById('editId').value = task.id;
    document.getElementById('editTitle').value = task.title;
    document.getElementById('editSubject').value = task.subject;
    document.getElementById('editDeadline').value = task.deadline || '';
    document.getElementById('editPriority').value = task.priority;
    document.getElementById('editStatus').value = task.status;
    document.getElementById('editModal').style.display = 'flex';
}

document.getElementById('saveEditBtn').addEventListener('click', async () => {
    const id = document.getElementById('editId').value;
    const data = {
        title: document.getElementById('editTitle').value.trim(),
        subject: document.getElementById('editSubject').value.trim(),
        deadline: document.getElementById('editDeadline').value,
        priority: document.getElementById('editPriority').value,
        status: document.getElementById('editStatus').value
    };
    if (!data.title || !data.subject) { alert('Title and Subject required.'); return; }
    await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    document.getElementById('editModal').style.display = 'none';
    loadTasks();
});

document.getElementById('cancelEditBtn').addEventListener('click', () => {
    document.getElementById('editModal').style.display = 'none';
});

document.getElementById('editModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('editModal'))
        document.getElementById('editModal').style.display = 'none';
});

// =====================
// FILTER
// =====================
async function loadSubjectFilter() {
    const res = await fetch('/api/subjects');
    const subjects = await res.json();
    const select = document.getElementById('filterSubject');
    const current = select.value;
    select.innerHTML = '<option value="">All Subjects</option>';
    subjects.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s; opt.textContent = s;
        if (s === current) opt.selected = true;
        select.appendChild(opt);
    });
}

document.getElementById('applyFilter').addEventListener('click', async () => {
    const subject = document.getElementById('filterSubject').value;
    const status = document.getElementById('filterStatus').value;
    await loadTasks(subject, status);
});

document.getElementById('clearFilter').addEventListener('click', () => {
    document.getElementById('filterSubject').value = '';
    document.getElementById('filterStatus').value = '';
    loadTasks();
});

// =====================
// INIT
// =====================
loadTasks();
