/* dashboard.js — HealthAnalytics IPS */

const COLORES_RIESGO = {
  bajo:    '#0ea66b',
  medio:   '#f59e0b',
  alto:    '#f97316',
  critico: '#e63757',
};

let _charts = {riesgo:null, edad:null, imc:null, diagnosticos:null};

async function cargarDashboard() {
  try {
    const res = await authFetch('/api/dashboard/kpis/');
    if (!res || !res.ok) return;
    const data = await res.json();

    // KPIs principales
    const k = data.kpis;
    setText('kpi-total',       k.total_pacientes ?? '—');
    setText('kpi-criticos',    `${k.pacientes_criticos ?? '—'} (${k.pct_criticos ?? 0}%)`);
    setText('kpi-hipertensos', `${k.pacientes_hipertensos ?? '—'} (${k.pct_hipertensos ?? 0}%)`);
    setText('kpi-diabeticos',  `${k.pacientes_diabeticos ?? '—'} (${k.pct_diabeticos ?? 0}%)`);
    setText('kpi-fumadores',   k.pacientes_fumadores ?? '—');
    setText('pct-fumadores',   `${k.pct_fumadores ?? 0}% del total`);

    const avg = k.promedios || {};
    setText('kpi-imc',    avg.avg_imc     ? avg.avg_imc.toFixed(1) : '—');
    setText('kpi-glucosa', avg.avg_glucosa ? avg.avg_glucosa.toFixed(1) + ' mg/dL' : '—');

    // Estado ETL
    const etl = data.ultimo_etl;
    document.getElementById('etl-status').innerHTML = etl?.fecha
      ? `<div class="fw-semibold" style="font-size:13px;">${formatFecha(etl.fecha)}</div>
         <div style="font-size:11px;color:var(--text-muted);">${etl.registros} registros · <span class="badge" style="background:var(--sky);color:var(--blue);border:1px solid var(--sky-border);font-size:10px;">${etl.estado}</span></div>`
      : '<span style="font-size:12px;color:var(--text-muted);">Sin ejecuciones registradas</span>';

    // Estado Modelo ML
    const ml = data?.modelo_activo;
    document.getElementById('ml-status').innerHTML = ml?.nombre
      ? `<div class="d-flex gap-4 flex-wrap">
           <div><div style="font-size:11px;color:var(--text-muted);">Modelo</div>
                <div class="fw-semibold" style="font-size:14px;">${ml.nombre}</div></div>
           <div><div style="font-size:11px;color:var(--text-muted);">Accuracy</div>
                <div class="fw-semibold" style="font-size:14px;color:var(--success);">${ml.accuracy != null ? (ml.accuracy*100).toFixed(1)+'%' : '—'}</div></div>
         </div>`
      : '<span style="color:var(--text-muted);font-size:13px;">No hay modelos entrenados</span>';

    // Gráficas
    renderGraficaRiesgo(data.graficas.distribucion_riesgo);
    renderGraficaEdad(data.graficas.segmentacion_edad);
    renderGraficaIMC(data.graficas.distribucion_imc);
    renderGraficaDiagnosticos(data.graficas.top_diagnosticos);

  } catch(e) {
    console.error('Error cargando dashboard:', e);
  }
}

const CHART_FONT = "'DM Sans', system-ui, sans-serif";

function destroyChart(key) {
  if (_charts[key]) {
    try { _charts[key].destroy(); } catch (e) {}
    _charts[key] = null;
  }
}

function renderGraficaRiesgo(data) {
  if (!data) return;
  const labels = Object.keys(data);
  const values = Object.values(data);
  destroyChart('riesgo');
  _charts.riesgo = new Chart(document.getElementById('chart-riesgo'), {
    type: 'doughnut',
    data: {
      labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
      datasets: [{
        data: values,
        backgroundColor: labels.map(l => COLORES_RIESGO[l] || '#8da3be'),
        borderWidth: 3,
        borderColor: '#ffffff',
        hoverBorderWidth: 3,
      }]
    },
    options: {
      responsive: true,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: CHART_FONT, size: 12 }, padding: 14, boxWidth: 12, boxHeight: 12 }
        }
      }
    }
  });
}

function renderGraficaEdad(data) {
  if (!data?.length) return;
  destroyChart('edad');
  _charts.edad = new Chart(document.getElementById('chart-edad'), {
    type: 'bar',
    data: {
      labels: data.map(d => d.rango_edad),
      datasets: [{
        label: 'Pacientes',
        data: data.map(d => d.total),
        backgroundColor: 'rgba(26,107,205,.18)',
        borderColor: '#1a6bcd',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#f0f5fc' }, ticks: { font: { family: CHART_FONT } } },
        x: { grid: { display: false }, ticks: { font: { family: CHART_FONT } } }
      }
    }
  });
}

function renderGraficaIMC(data) {
  if (!data || !Object.keys(data).length) return;
  const labels = { bajo_peso:'Bajo Peso', normal:'Normal', sobrepeso:'Sobrepeso', obesidad:'Obesidad' };
  const colors = { bajo_peso:'#2f80ed', normal:'#0ea66b', sobrepeso:'#f59e0b', obesidad:'#e63757' };
  const keys = Object.keys(data);
  destroyChart('imc');
  _charts.imc = new Chart(document.getElementById('chart-imc'), {
    type: 'pie',
    data: {
      labels: keys.map(k => labels[k] || k),
      datasets: [{
        data: Object.values(data),
        backgroundColor: keys.map(k => colors[k] || '#8da3be'),
        borderWidth: 3,
        borderColor: '#ffffff',
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: CHART_FONT, size: 12 }, padding: 14, boxWidth: 12, boxHeight: 12 }
        }
      }
    }
  });
}

function renderGraficaDiagnosticos(data) {
  if (!data?.length) return;
  destroyChart('diagnosticos');
  _charts.diagnosticos = new Chart(document.getElementById('chart-diagnosticos'), {
    type: 'bar',
    data: {
      labels: data.map(d => d.diagnostico_preliminar || 'Sin diagnóstico'),
      datasets: [{
        label: 'Casos',
        data: data.map(d => d.total),
        backgroundColor: 'rgba(26,107,205,.18)',
        borderColor: '#1a6bcd',
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, grid: { color: '#f0f5fc' }, ticks: { font: { family: CHART_FONT } } },
        y: { grid: { display: false }, ticks: { font: { family: CHART_FONT, size: 11 } } }
      }
    }
  });
}

// Helpers
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function formatFecha(f) {
  return f ? new Date(f).toLocaleString('es-CO', { dateStyle:'medium', timeStyle:'short' }) : '—';
}
function badgeEstado(e) {
  return {
    completado: 'bg-success',
    error: 'bg-danger',
    en_proceso: 'bg-warning text-dark',
    pendiente: 'bg-secondary'
  }[e] || 'bg-secondary';
}

document.addEventListener('DOMContentLoaded', cargarDashboard);
