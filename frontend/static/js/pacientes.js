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
  tbody.innerHTML = `<tr><td colspan="10" class="text-center py-5" style="color:var(--text-muted);">
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
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4" style="color:var(--danger);">
      Error al cargar datos: ${e.message}
    </td></tr>`;
  }
}

function renderTabla(pacientes) {
  const tbody = document.getElementById('pacientes-tbody');
  if (!pacientes.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-5" style="color:var(--text-muted);">
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
    </tr>
  `).join('');
}

function descargarPacientes(formato) {
  const riesgo  = document.getElementById('filtro-riesgo').value;
  const sexo    = document.getElementById('filtro-sexo').value;
  const critico = document.getElementById('filtro-critico').checked;
  const busqueda = document.getElementById('busqueda').value;

  let url = `/api/reportes/${formato}/?`;
  const params = [];
  if (riesgo)  params.push(`riesgo=${riesgo}`);
  if (sexo)    params.push(`sexo=${sexo}`);
  if (critico) params.push(`critico=true`);
  if (busqueda) params.push(`busqueda=${encodeURIComponent(busqueda)}`);
  url += params.join('&');

  const filenames = { csv: 'pacientes.csv', excel: 'reporte_pacientes.xlsx', pdf: 'reporte_pacientes.pdf' };
  descargarArchivo(url, filenames[formato] || `pacientes.${formato}`);
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
