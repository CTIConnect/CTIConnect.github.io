// CTIConnect website — leaderboard + tabs interactivity
'use strict';

const STATE = {
  category: 'Overall',     // Overall | EL | EA | MDS
  config: 'DS',            // CB | VR | DS
  kind: 'all',             // all | proprietary | open-source
  sortBy: 'avg',           // 'avg' or a task id
  sortDir: 'desc',
  data: null,
  tasks: null,
};

const CATEGORY_TASKS = {
  EL:  ['RCM', 'WIM', 'ATD', 'ESD'],
  MDS: ['CSC', 'TAP', 'MLA'],
  EA:  ['ATA', 'VCA'],
};

const ALL_TASKS = ['RCM', 'WIM', 'ATD', 'ESD', 'CSC', 'TAP', 'MLA', 'ATA', 'VCA'];
const MDS_TASKS = new Set(['CSC', 'TAP', 'MLA']);

const CATEGORY_COLOR = { EL: 'var(--el)', EA: 'var(--ea)', MDS: 'var(--mds)' };

// ---------- bootstrap ----------
async function init() {
  const [lb, tasks] = await Promise.all([
    fetch('data/leaderboard.json').then(r => r.json()),
    fetch('data/tasks.json').then(r => r.json()),
  ]);
  STATE.data = lb;
  STATE.tasks = tasks;
  renderCategoryCards();
  renderTaskCards();
  renderExamples();
  bindLeaderboardControls();
  renderLeaderboard();
  bindCitation();
}

// ---------- Overview category cards ----------
function renderCategoryCards() {
  const root = document.getElementById('cat-grid');
  if (!root) return;
  root.innerHTML = STATE.tasks.categories.map(c => `
    <div class="cat-card cat-${c.id}">
      <span class="cat-pill">${c.name}</span>
      <h3>${c.name}</h3>
      <div class="direction">${c.direction}</div>
      <p>${c.description}</p>
      <div class="cat-tasks">
        ${c.tasks.map(t => `<span class="tag">${t.id}: ${t.name}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

// ---------- 9 task cards ----------
function renderTaskCards() {
  const root = document.getElementById('tasks-grid');
  if (!root) return;
  const cards = [];
  STATE.tasks.categories.forEach(c => {
    c.tasks.forEach(t => {
      cards.push(`
        <div class="task-card ${c.id}">
          <span class="task-id">${t.id}</span>
          <h4>${t.name}</h4>
          <div class="dir">${t.direction}</div>
          <p>${t.summary}</p>
        </div>
      `);
    });
  });
  root.innerHTML = cards.join('');
}

// ---------- example tabs ----------
function renderExamples() {
  const tabsRoot = document.getElementById('example-tabs');
  const cardsRoot = document.getElementById('example-cards');
  if (!tabsRoot || !cardsRoot) return;

  const samples = [];
  STATE.tasks.categories.forEach(c => {
    c.tasks.forEach(t => {
      if (t.example) samples.push({ cat: c.id, task: t, catName: c.name });
    });
  });

  tabsRoot.innerHTML = samples.map((s, i) => {
    const ex = s.task.example;
    return `
      <button class="example-tab ${i === 0 ? 'active' : ''}" data-idx="${i}">
        ${ex.icon ? ex.icon + ' ' : ''}${s.task.id} — ${s.task.name}
      </button>
    `;
  }).join('');

  cardsRoot.innerHTML = samples.map((s, i) => {
    const ex = s.task.example;
    return `
      <div class="example-card ${i === 0 ? 'active' : ''}" data-idx="${i}">
        <div class="example-head">
          <span class="example-cat">${ex.icon ? ex.icon + ' ' : ''}${s.catName} · ${s.task.name} <span class="example-dir">(${s.task.direction})</span></span>
          ${ex.intro ? `<p class="example-intro">${escapeHtml(ex.intro)}</p>` : ''}
        </div>
        <div class="q">
          <span class="label">Input</span>
          <div class="q-text">${escapeHtml(ex.input)}</div>
        </div>
        <div class="a">
          <span class="label">Gold Output</span>
          <div class="a-text">${escapeHtml(ex.output)}</div>
        </div>
      </div>
    `;
  }).join('');

  tabsRoot.addEventListener('click', e => {
    const btn = e.target.closest('.example-tab');
    if (!btn) return;
    const idx = btn.dataset.idx;
    tabsRoot.querySelectorAll('.example-tab').forEach(b => b.classList.toggle('active', b.dataset.idx === idx));
    cardsRoot.querySelectorAll('.example-card').forEach(c => c.classList.toggle('active', c.dataset.idx === idx));
  });
}

// ---------- leaderboard controls ----------
function bindLeaderboardControls() {
  document.querySelectorAll('[data-lb-category]').forEach(b => {
    b.addEventListener('click', () => {
      STATE.category = b.dataset.lbCategory;
      STATE.sortBy = 'avg';
      STATE.sortDir = 'desc';
      setActive('[data-lb-category]', b);
      ensureValidConfig();
      renderLeaderboard();
    });
  });
  document.querySelectorAll('[data-lb-config]').forEach(b => {
    b.addEventListener('click', () => {
      if (b.dataset.lbConfig === 'CB' && STATE.category === 'MDS') return; // disabled
      STATE.config = b.dataset.lbConfig;
      setActive('[data-lb-config]', b);
      renderLeaderboard();
    });
  });
  document.querySelectorAll('[data-lb-kind]').forEach(b => {
    b.addEventListener('click', () => {
      STATE.kind = b.dataset.lbKind;
      setActive('[data-lb-kind]', b);
      renderLeaderboard();
    });
  });
}
function setActive(selector, target) {
  document.querySelectorAll(selector).forEach(el => el.classList.toggle('active', el === target));
}
function ensureValidConfig() {
  // MDS has no CB; if user is on CB and switches to MDS, snap to VR
  if (STATE.category === 'MDS' && STATE.config === 'CB') {
    STATE.config = 'VR';
    const vr = document.querySelector('[data-lb-config="VR"]');
    if (vr) setActive('[data-lb-config]', vr);
  }
  // visually disable CB when MDS
  const cb = document.querySelector('[data-lb-config="CB"]');
  if (cb) {
    cb.disabled = (STATE.category === 'MDS');
    cb.style.opacity = (STATE.category === 'MDS') ? '0.35' : '';
    cb.style.cursor = (STATE.category === 'MDS') ? 'not-allowed' : '';
  }
}

// ---------- leaderboard rendering ----------
function currentTaskList() {
  return STATE.category === 'Overall' ? ALL_TASKS : CATEGORY_TASKS[STATE.category];
}
function scoreOf(model, taskId, config) {
  const cell = model.scores[taskId];
  if (!cell) return null;
  // MDS tasks have no CB
  if (config === 'CB' && MDS_TASKS.has(taskId)) return null;
  return (config in cell) ? cell[config] : null;
}
function avgOf(model) {
  const taskList = currentTaskList();
  let sum = 0, count = 0;
  taskList.forEach(t => {
    const s = scoreOf(model, t, STATE.config);
    if (s != null) { sum += s; count++; }
  });
  return count ? sum / count : null;
}

function renderLeaderboard() {
  const root = document.getElementById('lb-table');
  if (!root) return;
  const taskList = currentTaskList();
  const filtered = STATE.data.models.filter(m =>
    STATE.kind === 'all' ? true : m.kind === STATE.kind
  );

  // compute avg per row
  const withAvg = filtered.map(m => ({ m, avg: avgOf(m) }));

  // sort
  withAvg.sort((a, b) => {
    let va, vb;
    if (STATE.sortBy === 'avg') { va = a.avg; vb = b.avg; }
    else { va = scoreOf(a.m, STATE.sortBy, STATE.config); vb = scoreOf(b.m, STATE.sortBy, STATE.config); }
    va = (va == null) ? -1 : va;
    vb = (vb == null) ? -1 : vb;
    return STATE.sortDir === 'desc' ? vb - va : va - vb;
  });

  // best per column (using current config, across visible rows)
  const bestByCol = {};
  [...taskList, 'avg'].forEach(t => {
    let best = -Infinity;
    withAvg.forEach(r => {
      const v = t === 'avg' ? r.avg : scoreOf(r.m, t, STATE.config);
      if (v != null && v > best) best = v;
    });
    bestByCol[t] = best;
  });

  const sortInd = dir => dir === 'desc' ? '▼' : '▲';
  const head = `
    <thead>
      <tr>
        <th>#</th>
        <th class="model-name-col" style="text-align:left; padding-left:18px;">Model</th>
        ${taskList.map(t => `
          <th class="sortable ${STATE.sortBy === t ? 'sorted' : ''}" data-sort="${t}">
            ${t}<span class="sort-ind">${STATE.sortBy === t ? sortInd(STATE.sortDir) : '↕'}</span>
          </th>
        `).join('')}
        <th class="sortable ${STATE.sortBy === 'avg' ? 'sorted' : ''}" data-sort="avg">
          Avg<span class="sort-ind">${STATE.sortBy === 'avg' ? sortInd(STATE.sortDir) : '↕'}</span>
        </th>
      </tr>
    </thead>`;

  const body = `
    <tbody>
      ${withAvg.map((r, i) => {
        const cls = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
        return `
        <tr class="${cls}">
          <td>${i + 1}</td>
          <td class="model-name">${r.m.name}<span class="org-tag">${r.m.org}</span></td>
          ${taskList.map(t => {
            const v = scoreOf(r.m, t, STATE.config);
            if (v == null) return `<td class="score-cell" style="color:var(--muted)">—</td>`;
            const pct = Math.round(v * 100);
            const isBest = (v === bestByCol[t]);
            return `<td class="score-cell ${isBest ? 'cat-best' : ''}" style="--w:${pct}%">${v.toFixed(2)}</td>`;
          }).join('')}
          ${(() => {
            if (r.avg == null) return `<td class="avg">—</td>`;
            const isBest = (r.avg === bestByCol['avg']);
            return `<td class="avg ${isBest ? 'cat-best' : ''}">${(r.avg * 100).toFixed(1)}%</td>`;
          })()}
        </tr>`;
      }).join('')}
    </tbody>`;

  root.innerHTML = head + body;

  // bind sort
  root.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (STATE.sortBy === col) STATE.sortDir = STATE.sortDir === 'desc' ? 'asc' : 'desc';
      else { STATE.sortBy = col; STATE.sortDir = 'desc'; }
      renderLeaderboard();
    });
  });
}

// ---------- citation copy ----------
function bindCitation() {
  const btn = document.getElementById('copy-cite');
  const block = document.getElementById('cite-block');
  if (!btn || !block) return;
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(block.textContent.trim()).then(() => {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1400);
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

document.addEventListener('DOMContentLoaded', init);
