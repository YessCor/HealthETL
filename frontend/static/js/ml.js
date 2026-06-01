/* ml.js — Entrenamiento, métricas, predicción */

let confusionChart = null;
let metricasChart = null;

async function entrenarModelo() {
  const algoritmo = document.getElementById('select-algoritmo').value;
  const btn = document.getElementById('btn-entrenar');
  const progress = document.getElementById('train-progress');

  btn.disabled = true;
  progress.classList.remove('d-none');

  try {
    const res = await authFetch('/api/ml/entrenar/', {
      method: 'POST',
      body: JSON.stringify({ algoritmo })
    });
    if (!res) return;
    const data = await res.json();

    if (res.ok) {
      mostrarMetricas(data.metricas, data.modelo);
      cargarModelos();
    } else {
      alert('Error: ' + (data.error || 'No se pudo entrenar el modelo'));
    }
  } catch(e) {
    alert('Error de conexión: ' + e.message);
  } finally {
    btn.disabled = false;
    progress.classList.add('d-none');
  }
}

function mostrarMetricas(metricas, modelo) {
  const panel = document.getElementById('metricas-panel');
  const acc  = (metricas.accuracy  * 100).toFixed(1);
  const prec = (metricas.precision * 100).toFixed(1);
  const rec  = (metricas.recall    * 100).toFixed(1);
  const f1   = (metricas.f1_score  * 100).toFixed(1);

  panel.innerHTML = `
    <div class="row g-3">
      <div class="col-6">
        <div class="border rounded p-3 text-center">
          <div class="text-muted small">Accuracy</div>
          <div class="fw-bold fs-3 text-primary">${acc}%</div>
          <div class="progress mt-2" style="height:6px">
            <div class="progress-bar bg-primary" style="width:${acc}%"></div>
          </div>
        </div>
      </div>
      <div class="col-6">
        <div class="border rounded p-3 text-center">
          <div class="text-muted small">Precision</div>
          <div class="fw-bold fs-3 text-success">${prec}%</div>
          <div class="progress mt-2" style="height:6px">
            <div class="progress-bar bg-success" style="width:${prec}%"></div>
          </div>
        </div>
      </div>
      <div class="col-6">
        <div class="border rounded p-3 text-center">
          <div class="text-muted small">Recall</div>
          <div class="fw-bold fs-3 text-warning">${rec}%</div>
          <div class="progress mt-2" style="height:6px">
            <div class="progress-bar bg-warning" style="width:${rec}%"></div>
          </div>
        </div>
      </div>
      <div class="col-6">
        <div class="border rounded p-3 text-center">
          <div class="text-muted small">F1-Score</div>
          <div class="fw-bold fs-3 text-info">${f1}%</div>
          <div class="progress mt-2" style="height:6px">
            <div class="progress-bar bg-info" style="width:${f1}%"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="mt-3 text-center">
      <small class="text-muted">Modelo: <strong>${modelo.nombre}</strong></small>
    </div>
  `;

  // Mostrar sección de confusion matrix
  document.getElementById('confusion-section').style.removeProperty('display');

  // Gráfica barras métricas
  if (metricasChart) metricasChart.destroy();
  metricasChart = new Chart(document.getElementById('chart-metricas'), {
    type: 'bar',
    data: {
      labels: ['Accuracy', 'Precision', 'Recall', 'F1-Score'],
      datasets: [{
        label: 'Valor (%)',
        data: [acc, prec, rec, f1],
        backgroundColor: ['#0d6efd88','#19875488','#ffc10788','#0dcaf088'],
        borderColor: ['#0d6efd','#198754','#ffc107','#0dcaf0'],
        borderWidth: 2, borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } }
    }
  });

  // Matriz de confusión como heatmap con Chart.js
  renderMatrizConfusion(metricas.confusion_matrix, metricas.clases);
}

function renderMatrizConfusion(cm, clases) {
  if (!cm || !clases) return;
  const canvas = document.getElementById('chart-confusion');
  if (confusionChart) confusionChart.destroy();

  const datasets = [];
  const maxVal = Math.max(...cm.flat());
  const colores = ['#0d6efd', '#198754', '#ffc107', '#dc3545'];

  clases.forEach((clase, i) => {
    datasets.push({
      label: clase,
      data: cm[i].map((v, j) => ({ x: clases[j], y: clase, v })),
      backgroundColor: ctx => {
        const v = ctx.raw?.v || 0;
        const alpha = 0.2 + (v / maxVal) * 0.8;
        return colores[i % colores.length].replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      },
    });
  });

  // Simplificado: tabla HTML en vez de heatmap complejo
  let html = '<table class="table table-bordered table-sm text-center small">';
  html += '<thead class="table-dark"><tr><th>Real \\ Pred</th>';
  clases.forEach(c => html += `<th>${c}</th>`);
  html += '</tr></thead><tbody>';
  cm.forEach((row, i) => {
    html += `<tr><th class="table-secondary">${clases[i]}</th>`;
    row.forEach((v, j) => {
      const bg = i === j ? 'bg-success bg-opacity-25' : (v > 0 ? 'bg-danger bg-opacity-10' : '');
      html += `<td class="${bg} fw-semibold">${v}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  canvas.parentElement.innerHTML = '<h6 class="fw-semibold mb-3 small text-muted">MATRIZ DE CONFUSIÓN</h6>' + html;
}

async function predecirPaciente() {
  const id = document.getElementById('input-paciente-id').value;
  if (!id) { alert('Ingresa el ID del paciente.'); return; }

  const div = document.getElementById('prediccion-resultado');
  div.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div>Prediciendo...';

  try {
    const res = await authFetch('/api/ml/predecir/', {
      method: 'POST',
      body: JSON.stringify({ paciente_id: parseInt(id) })
    });
    if (!res) return;
    const data = await res.json();

    if (res.ok) {
      const colores = { bajo:'success', medio:'warning', alto:'orange', critico:'danger' };
      const color = colores[data.riesgo_predicho] || 'secondary';
      const pct = (data.probabilidad * 100).toFixed(1);

      let distHtml = Object.entries(data.distribucion_clases || {}).map(([k, v]) =>
        `<div class="d-flex justify-content-between small">
          <span>${k}</span>
          <span class="fw-semibold">${(v*100).toFixed(1)}%</span>
        </div>
        <div class="progress mb-1" style="height:5px">
          <div class="progress-bar bg-${colores[k]||'secondary'}" style="width:${(v*100).toFixed(1)}%"></div>
        </div>`
      ).join('');

      div.innerHTML = `
        <div class="alert alert-${color === 'orange' ? 'warning' : color} border-0 mt-2">
          <div class="d-flex align-items-center gap-3">
            <div class="fs-2">🏥</div>
            <div class="flex-grow-1">
              <div class="fw-bold">Riesgo Predicho:
                <span class="text-${color === 'orange' ? 'warning' : color} text-uppercase">
                  ${data.riesgo_predicho}
                </span>
              </div>
              <div class="small">Probabilidad: ${pct}%</div>
              <div class="progress mt-1" style="height:8px">
                <div class="progress-bar bg-${color === 'orange' ? 'warning' : color}"
                     style="width:${pct}%"></div>
              </div>
            </div>
          </div>
          <hr class="my-2">
          <div class="small fw-semibold mb-1">Distribución por clases:</div>
          ${distHtml}
        </div>`;
    } else {
      div.innerHTML = `<div class="alert alert-danger">${data.error || 'No se pudo predecir'}</div>`;
    }
  } catch(e) {
    div.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
  }
}

async function cargarModelos() {
  try {
    const res = await authFetch('/api/ml/modelos/');
    if (!res) return;
    const data = await res.json();
    const tbody = document.getElementById('modelos-tbody');

    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Sin modelos entrenados</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(m => `
      <tr>
        <td class="fw-semibold small">${m.nombre}</td>
        <td><span class="badge bg-info text-dark">${m.algoritmo.replace('_',' ')}</span></td>
        <td>${m.accuracy ? (m.accuracy*100).toFixed(1)+'%' : '—'}</td>
        <td>${m.f1_score ? (m.f1_score*100).toFixed(1)+'%' : '—'}</td>
        <td class="small text-muted">${formatFecha(m.fecha_entrenamiento)}</td>
        <td>${m.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'}</td>
      </tr>
    `).join('');
  } catch(e) { console.error(e); }
}

function formatFecha(f) {
  return f ? new Date(f).toLocaleString('es-CO', { dateStyle:'short', timeStyle:'short' }) : '—';
}

document.addEventListener('DOMContentLoaded', cargarModelos);
