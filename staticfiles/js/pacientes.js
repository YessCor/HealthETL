/* pacientes.js — HealthAnalytics IPS */

let paginaActual = 1;
let totalPaginas = 1;
let todosLosPacientes = [];

async function cargarPacientes(pagina = 1) {
  paginaActual = pagina;
  const riesgo  = document.getElementById('filtro-riesgo').value;
  const sexo    = document.getElementById('filtro-sexo').value;
  const critico = document.getElementById('filtro-critico').checked;

  let url = `/api/pacientes/?page=${pagina}`;
  if (riesgo)  url += `&riesgo=${riesgo}`;
  if (sexo)    url += `&sexo=${sexo}`;
  if (critico) url += `&critico=true`;

  const tbody = document.getElementById('pacientes-tbody');
  tbody.innerHTML = `<tr><td colspan="11" class="text-center py-5" style="color:var(--text-muted);">
    <div class="spinner-border spinner-border-sm me-2" style="color:var(--blue);"></div>Cargando…
  </td></tr>`;

  try {
    const res = await authFetch(url);
    if (!res) return;
    const data = await res.json();

    const resultados = data.results ?? data;
    const total = data.count ?? resultados.length;
    totalPaginas = data.next || data.previous ? Math.ceil(total / 50) : 1;

    todosLosPacientes = resultados;
    renderTabla(resultados);
    document.getElementById('badge-total').textContent = total;

    const infoEl = document.getElementById('paginacion-info');
    if (infoEl) infoEl.textContent = `Mostrando ${resultados.length} de ${total} pacientes`;

    renderPaginacion();
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="11" class="text-center py-4" style="color:var(--danger);">
      Error al cargar datos: ${e.message}
    </td></tr>`;
  }
}

function renderTabla(pacientes) {
  const tbody = document.getElementById('pacientes-tbody');
  if (!pacientes.length) {
    tbody.innerHTML = `<tr><td colspan="11" class="text-center py-5" style="color:var(--text-muted);">
      <i class="bi bi-inbox d-block mb-2" style="font-size:2rem;opacity:.3;"></i>
      Sin pacientes encontrados
    </td></tr>`;
    return;
  }

  tbody.innerHTML = pacientes.map(p => `
    <tr style="${p.es_critico ? 'background:#fff5f6;' : ''}">
      <td style="font-weight:700;color:var(--blue);">${p.id_paciente}</td>
      <td style="font-weight:500;">${p.nombres} ${p.apellidos}</td>
      <td>${p.edad ?? '—'}</td>
      <td>${p.sexo === 'M' ? '<span style="color:#1a6bcd;">♂ M</span>' : p.sexo === 'F' ? '<span style="color:#e63757;">♀ F</span>' : '—'}</td>
      <td>
        ${p.imc ? p.imc.toFixed(1) : '—'}
        ${p.clasificacion_imc ? `<br><span style="font-size:10px;color:var(--text-muted);">${p.clasificacion_imc.replace('_',' ')}</span>` : ''}
      </td>
      <td style="${p.glucosa > 126 ? 'color:var(--danger);font-weight:600;' : ''}">${p.glucosa ?? '—'}</td>
      <td style="${p.presion_sistolica > 140 ? 'color:var(--danger);font-weight:600;' : ''}">${p.presion_sistolica ?? '—'}</td>
      <td style="font-size:12px;">${p.diagnostico_preliminar || '—'}</td>
      <td>
        <span class="badge-riesgo riesgo-${p.riesgo_enfermedad || 'bajo'}">
          ${p.riesgo_enfermedad || '—'}
        </span>
      </td>
      <td>
        ${p.es_critico
          ? '<i class="bi bi-exclamation-triangle-fill" style="color:var(--danger);" title="Crítico"></i>'
          : '<i class="bi bi-check-circle" style="color:var(--success);"></i>'}
      </td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="abrirPrediccionRiesgo(${p.id_paciente})">
          <i class="bi bi-shield-check me-1"></i>Predicción
        </button>
      </td>
    </tr>
  `).join('');
}

function abrirPrediccionRiesgo(pacienteId) {
  const modalEl = document.getElementById('modal-prediccion-riesgo');
  const modal = modalEl && window.bootstrap ? bootstrap.Modal.getOrCreateInstance(modalEl) : null;

  // Si Bootstrap no está disponible, evitamos abrir un modal “invisible”
  // (intercepta clicks) y mostramos error en pantalla.
  if (!modal) {
    const errEl = document.getElementById('prediccion-error');
    if (errEl) {
      errEl.classList.remove('d-none');
      errEl.innerHTML = `<strong>Error:</strong> Modal no disponible (Bootstrap no cargado).`;
    }
    return;
  }

  // reset UI
  document.getElementById('prediccion-error').classList.add('d-none');
  document.getElementById('prediccion-error').innerHTML = '';
  document.getElementById('prediccion-loading').style.display = 'block';
  document.getElementById('prediccion-resumen-card').style.display = 'none';
  document.getElementById('prediccion-modelo-card').style.display = 'none';
  document.getElementById('prediccion-distribucion').style.display = 'none';
  document.getElementById('prediccion-factores').innerHTML = '';
  document.getElementById('prediccion-recomendaciones').innerHTML = '';

  document.getElementById('prediccion-paciente-nombre').textContent = '—';
  document.getElementById('prediccion-nivel').textContent = '—';
  document.getElementById('prediccion-probabilidad').textContent = '—';
  document.getElementById('prediccion-puntuacion-clinica').textContent = '—';
  document.getElementById('prediccion-nivel-detalle').textContent = '—';

  if (!modal) return;
  modal.show();

  authFetch('/api/ml/predecir/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ paciente_id: pacienteId })
  })
    .then(async (res) => {
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      document.getElementById('prediccion-loading').style.display = 'none';
      document.getElementById('prediccion-resumen-card').style.display = 'block';

      const riesgoMap = {
        'bajo': { label: 'Bajo', class: 'riesgo-bajo', color: 'var(--success)' },
        'medio': { label: 'Medio', class: 'riesgo-medio', color: 'var(--warning)' },
        'alto': { label: 'Alto', class: 'riesgo-alto', color: 'var(--orange)' },
        'critico': { label: 'Crítico', class: 'riesgo-critico', color: 'var(--danger)' }
      };

      const riesgoVal = (data.riesgo_predicho || 'bajo').toLowerCase();
      const riesgoMeta = riesgoMap[riesgoVal] || { label: data.nivel_descripcion || riesgoVal, class: 'riesgo-bajo', color: 'var(--success)' };

      document.getElementById('prediccion-paciente-nombre').textContent = data.paciente_nombre || '—';
      document.getElementById('prediccion-nivel').innerHTML = `<span class="badge-riesgo ${riesgoMeta.class}" style="font-size: 13.5px; font-weight: 700; padding: 4px 12px;">${riesgoMeta.label}</span>`;

      const prob = data.probabilidad !== undefined && data.probabilidad !== null ? data.probabilidad : null;
      if (prob !== null) {
        const pct = (prob * 100).toFixed(1);
        document.getElementById('prediccion-probabilidad').innerHTML = `
          <div class="d-flex align-items-center gap-2" style="width: 100%; max-width: 250px;">
            <span style="font-weight:800; min-width: 45px;">${pct}%</span>
            <div class="progress flex-grow-1" style="height: 8px; margin-bottom: 0;">
              <div class="progress-bar" role="progressbar" style="width: ${pct}%; background: ${riesgoMeta.color} !important;"></div>
            </div>
          </div>
        `;
      } else {
        document.getElementById('prediccion-probabilidad').textContent = '—';
      }

      document.getElementById('prediccion-puntuacion-clinica').innerHTML = `
        <span class="badge text-bg-light border" style="font-size:13px; font-weight:700; color:var(--text-mid)!important; padding: 4px 10px;">
          ${data.puntuacion_clinica ?? '0'} puntos
        </span>
      `;
      document.getElementById('prediccion-nivel-detalle').textContent = data.nivel_detalle || '—';

      const factores = data.factores_clave || [];
      const factoresUl = document.getElementById('prediccion-factores');
      factoresUl.innerHTML = factores.length
        ? factores.map((f) => {
            const fRiesgo = (f.impacto || 'bajo').toLowerCase();
            const fMeta = riesgoMap[fRiesgo] || { class: 'text-bg-light border', label: f.impacto };
            return `
              <li class="list-group-item d-flex align-items-start justify-content-between gap-3 py-3">
                <div>
                  <div style="font-weight:700; color:var(--navy);">${f.factor || ''} <span style="font-weight:500; font-size:12px; color:var(--text-muted);">(${f.valor}${f.unidad ? ' ' + f.unidad : ''})</span></div>
                  <div style="font-size:12px;color:var(--text-muted); margin-top:2px;">${f.descripcion || ''}</div>
                </div>
                <span class="badge-riesgo ${fMeta.class}" style="white-space:nowrap; font-size: 10px;">${f.impacto || ''}</span>
              </li>
            `;
          }).join('')
        : `<li class="list-group-item text-center py-4" style="color:var(--text-muted);">Sin factores de riesgo alterados</li>`;

      const recs = data.recomendaciones || [];
      const recsUl = document.getElementById('prediccion-recomendaciones');
      recsUl.innerHTML = recs.length
        ? recs.map((r) => `
            <li class="list-group-item py-3 d-flex align-items-start gap-2" style="font-size:13px;">
              <i class="bi bi-check-circle-fill text-success mt-0.5" style="flex-shrink:0;"></i>
              <span>${r}</span>
            </li>
          `).join('')
        : `<li class="list-group-item text-center py-4" style="color:var(--text-muted);">Sin recomendaciones específicas</li>`;

      if (data.prediccion_modelo) {
        document.getElementById('prediccion-modelo-card').style.display = 'block';
        document.getElementById('prediccion-modelo-badge').textContent = data.prediccion_modelo.modelo_nombre || 'Modelo';
        
        const mlRiesgoVal = (data.prediccion_modelo.riesgo_predicho || 'bajo').toLowerCase();
        const mlRiesgoMeta = riesgoMap[mlRiesgoVal] || { label: data.prediccion_modelo.riesgo_predicho, class: 'riesgo-bajo', color: 'var(--success)' };
        
        document.getElementById('prediccion-modelo-riesgo').innerHTML = `<span class="badge-riesgo ${mlRiesgoMeta.class}" style="font-size:12px; font-weight:700;">${mlRiesgoMeta.label}</span>`;
        
        const mlProb = data.prediccion_modelo.probabilidad;
        if (mlProb !== undefined && mlProb !== null) {
          const mlPct = (mlProb * 100).toFixed(1);
          document.getElementById('prediccion-modelo-prob').innerHTML = `
            <div class="d-flex align-items-center gap-2" style="width: 100%; max-width: 250px;">
              <span style="font-weight:800; min-width: 45px;">${mlPct}%</span>
              <div class="progress flex-grow-1" style="height: 8px; margin-bottom: 0;">
                <div class="progress-bar" role="progressbar" style="width: ${mlPct}%; background: ${mlRiesgoMeta.color} !important;"></div>
              </div>
            </div>
          `;
        } else {
          document.getElementById('prediccion-modelo-prob').textContent = '—';
        }

        const dist = data.distribucion_clases;
        if (dist && typeof dist === 'object') {
          document.getElementById('prediccion-distribucion').style.display = 'block';
          const body = document.getElementById('prediccion-distribucion-body');
          body.innerHTML = Object.entries(dist)
            .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
            .map(([k, v]) => {
              const kClean = k.toLowerCase();
              const kMeta = riesgoMap[kClean] || { class: 'text-bg-light border' };
              const vPct = (Number(v) * 100).toFixed(2);
              return `
                <span class="badge-riesgo ${kMeta.class}" style="font-size: 11px; font-weight: 700; padding: 4px 10px;">
                  ${k}: ${vPct}%
                </span>
              `;
            })
            .join('');
        }
      }
    })
    .catch((err) => {
      document.getElementById('prediccion-loading').style.display = 'none';
      const errEl = document.getElementById('prediccion-error');
      errEl.classList.remove('d-none');
      errEl.innerHTML = `<strong>Error:</strong> ${err.message || err}`;
    });
}


function descargarPacientes() {
  const riesgo  = document.getElementById('filtro-riesgo').value;
  const sexo    = document.getElementById('filtro-sexo').value;
  const critico = document.getElementById('filtro-critico').checked;
  const busqueda = document.getElementById('busqueda').value;

  let url = '/api/reportes/pdf/?';
  const params = [];
  if (riesgo)  params.push(`riesgo=${riesgo}`);
  if (sexo)    params.push(`sexo=${sexo}`);
  if (critico) params.push(`critico=true`);
  if (busqueda) params.push(`busqueda=${encodeURIComponent(busqueda)}`);
  url += params.join('&');

  descargarArchivo(url, 'reporte_pacientes.pdf');
}

function filtrarLocal() {
  const q = document.getElementById('busqueda').value.toLowerCase();
  if (!q) { renderTabla(todosLosPacientes); return; }
  const filtrados = todosLosPacientes.filter(p =>
    `${p.nombres} ${p.apellidos}`.toLowerCase().includes(q) ||
    (p.diagnostico_preliminar || '').toLowerCase().includes(q) ||
    String(p.id_paciente).includes(q)
  );
  renderTabla(filtrados);
}

function renderPaginacion() {
  const ctrl = document.getElementById('paginacion-botones');
  if (!ctrl) return;
  if (totalPaginas <= 1) { ctrl.innerHTML = ''; return; }

  let html = `
    <button class="btn btn-sm btn-outline-secondary" onclick="cargarPacientes(${paginaActual-1})"
            ${paginaActual === 1 ? 'disabled' : ''}>
      <i class="bi bi-chevron-left"></i>
    </button>`;
  for (let i = Math.max(1, paginaActual-2); i <= Math.min(totalPaginas, paginaActual+2); i++) {
    html += `<button class="btn btn-sm ${i === paginaActual ? 'btn-primary' : 'btn-outline-secondary'}"
               onclick="cargarPacientes(${i})">${i}</button>`;
  }
  html += `
    <button class="btn btn-sm btn-outline-secondary" onclick="cargarPacientes(${paginaActual+1})"
            ${paginaActual === totalPaginas ? 'disabled' : ''}>
      <i class="bi bi-chevron-right"></i>
    </button>`;
  ctrl.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => cargarPacientes(1));

