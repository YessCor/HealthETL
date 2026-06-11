/* usuarios.js — Administración de usuarios (solo admin) */

async function cargarUsuarios() {
  const tbody = document.getElementById('usuarios-tbody');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner-border spinner-border-sm me-2"></div>Cargando...</td></tr>';

  const res = await authFetch('/api/auth/usuarios/');
  if (!res) return;
  const usuarios = await res.json();

  const badge = document.getElementById('badge-total');
  if (badge) badge.textContent = usuarios.length;

  tbody.innerHTML = usuarios.length
    ? usuarios.map(u => `
      <tr>
        <td><strong>${u.username}</strong></td>
        <td>${u.email || '—'}</td>
        <td>${u.first_name || '—'}</td>
        <td>${u.last_name || '—'}</td>
        <td><span class="badge" style="background:var(--sky);color:var(--blue);border:1px solid var(--sky-border);font-size:11px;font-weight:600;">${u.rol}</span></td>
      </tr>`).join('')
    : '<tr><td colspan="5" class="text-center py-4" style="color:var(--text-muted);">No hay usuarios registrados</td></tr>';
}

document.addEventListener('DOMContentLoaded', () => {
  cargarUsuarios();

  const btnMostrar = document.getElementById('btn-mostrar-form-usuario');
  const contenedor = document.getElementById('contenedor-form-usuario');
  const msg = document.getElementById('msg-form');

  if (btnMostrar && contenedor) {
    btnMostrar.addEventListener('click', () => {
      contenedor.style.display = 'block';
      if (msg) {
        msg.textContent = '';
        msg.style.color = '';
      }
    });
  } else {
    // Fallback: si por alguna razón no existe el contenedor/botón, habilitar el formulario.
    if (contenedor) contenedor.style.display = 'block';
  }

  const form = document.getElementById('form-usuario');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (msg) {
      msg.textContent = 'Creando...';
      msg.style.color = 'var(--text-muted)';
    }


    const payload = {
      username: document.getElementById('input-username').value.trim(),
      email: document.getElementById('input-email').value.trim(),
      password: document.getElementById('input-password').value,
      first_name: document.getElementById('input-first-name').value.trim(),
      last_name: document.getElementById('input-last-name').value.trim(),
      rol: document.getElementById('input-rol').value,
    };

    const res = await authFetch('/api/auth/usuarios/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res && res.ok) {
      msg.textContent = '✓ Usuario creado correctamente';
      msg.style.color = '#22c55e';
      document.getElementById('form-usuario').reset();
      cargarUsuarios();
    } else {
      const err = res ? await res.json() : { detail: 'Error de conexión' };
      msg.textContent = Object.values(err).flat().join(', ');
      msg.style.color = '#ef4444';
    }
  });
});
