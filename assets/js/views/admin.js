/* ==========================================================================
   CursosMi - Admin & Creator Management View Module
   ========================================================================== */

import { API } from '../api.js';
import { showToast } from '../utils/toast.js';

export async function renderAdminPanel(containerElement, currentUser) {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'creator')) {
        containerElement.innerHTML = `
            <div class="container" style="padding: 4rem 1rem; text-align: center;">
                <h2>Acceso Restringido</h2>
                <p style="color: var(--text-muted); margin-bottom: 1rem;">Requieres un rol de Administrador o Instructor para acceder a esta vista.</p>
                <a href="#/dashboard" class="btn btn-primary">Ir a Mi Cuenta</a>
            </div>
        `;
        return;
    }

    containerElement.innerHTML = `
        <div class="container" style="padding-top: 2rem;">
            <!-- Admin Header Row -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem;">
                <div>
                    <div style="font-size: 0.8rem; color: var(--accent-rose); font-weight: 700; text-transform: uppercase;">
                        <i class="fas fa-user-shield"></i> Control Total del Sistema
                    </div>
                    <h2 style="font-family: var(--font-heading); font-size: 1.75rem; font-weight: 800; color: white;">
                        Panel de Administración & Creadores
                    </h2>
                </div>

                <div style="display: flex; gap: 0.6rem;">
                    <button id="btn-open-creator-modal" class="btn btn-primary btn-sm">
                        <i class="fas fa-plus-circle"></i> Crear Nuevo Curso (10 Módulos)
                    </button>
                    <a href="#/" class="btn btn-secondary btn-sm"><i class="fas fa-eye"></i> Ver Sitio Web</a>
                </div>
            </div>

            <!-- Admin Section Tabs -->
            <div style="display: flex; gap: 0.5rem; border-bottom: 1px solid var(--border-subtle); margin-bottom: 2rem;">
                <button class="admin-tab-btn active" data-atab="payments-audit"><i class="fas fa-receipt"></i> Auditoría de Pagos MP (1-Clic)</button>
                <button class="admin-tab-btn" data-atab="users-manager"><i class="fas fa-users-cog"></i> Gestión de Usuarios & Roles</button>
            </div>

            <div id="admin-tab-content">
                <div class="skeleton" style="height: 300px;"></div>
            </div>
        </div>

        <!-- Create Course Modal -->
        <div id="create-course-modal" class="modal-overlay">
            <div class="modal-card" style="max-width: 700px;">
                <button class="modal-close" onclick="document.getElementById('create-course-modal').classList.remove('active')">&times;</button>

                <h3 style="font-family: var(--font-heading); font-size: 1.5rem; font-weight: 800; color: white; margin-bottom: 0.5rem;">
                    Crear Nuevo Curso con Onboarding
                </h3>
                <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.5rem;">
                    Completa la información técnica y configura tu Alias de cobro Mercado Pago.
                </p>

                <form id="form-create-course">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div>
                            <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem;">Título del Curso</label>
                            <input type="text" id="new-course-title" required placeholder="ej. Master en Barbería Profesional" style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle); color: white; padding: 0.6rem; border-radius: var(--radius-md);" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem;">Categoría</label>
                            <select id="new-course-category" style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle); color: white; padding: 0.6rem; border-radius: var(--radius-md);">
                                <option value="Barbería y Estética">Barbería y Estética</option>
                                <option value="Programación y Tecnología">Programación y Tecnología</option>
                                <option value="Marketing Digital">Marketing Digital</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div>
                            <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem;">Precio en ARS ($)</label>
                            <input type="number" id="new-course-price" required value="18500" style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle); color: white; padding: 0.6rem; border-radius: var(--radius-md);" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem;">Alias Mercado Pago de Cobro</label>
                            <input type="text" id="new-course-mp-alias" required value="mi.alias.mp" style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle); color: white; padding: 0.6rem; border-radius: var(--radius-md);" />
                        </div>
                    </div>

                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem;">Habilidades Clave (separadas por coma)</label>
                        <input type="text" id="new-course-skills" required value="Navaja, Fade, Visagismo, Bioseguridad" style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle); color: white; padding: 0.6rem; border-radius: var(--radius-md);" />
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem;">URL Video Onboarding (YouTube Embed)</label>
                        <input type="url" id="new-course-video" value="https://www.youtube.com/embed/dQw4w9WgXcQ" style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle); color: white; padding: 0.6rem; border-radius: var(--radius-md);" />
                    </div>

                    <button type="submit" class="btn btn-primary btn-block btn-lg"><i class="fas fa-check"></i> Publicar Curso</button>
                </form>
            </div>
        </div>
    `;

    // Inline tab styles
    const styleTag = document.createElement('style');
    styleTag.textContent = `
        .admin-tab-btn {
            background: transparent;
            border: none;
            color: var(--text-muted);
            padding: 0.75rem 1.25rem;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: var(--transition-fast);
        }
        .admin-tab-btn:hover, .admin-tab-btn.active {
            color: var(--accent-rose);
            border-bottom-color: var(--accent-rose);
        }
    `;
    document.head.appendChild(styleTag);

    // Open Creator Modal Handler
    document.getElementById('btn-open-creator-modal')?.addEventListener('click', () => {
        document.getElementById('create-course-modal')?.classList.add('active');
    });

    // Form Create Course Handler
    document.getElementById('form-create-course')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await API.createCourse({
                title: document.getElementById('new-course-title').value,
                category: document.getElementById('new-course-category').value,
                price: parseFloat(document.getElementById('new-course-price').value),
                mpAlias: document.getElementById('new-course-mp-alias').value,
                skills: document.getElementById('new-course-skills').value,
                onboardingVideo: document.getElementById('new-course-video').value,
                creatorId: currentUser.id
            });
            showToast('¡Curso creado exitosamente!', 'success');
            document.getElementById('create-course-modal')?.classList.remove('active');
            location.hash = '#/';
        } catch (err) {
            showToast('Error al crear curso.', 'error');
        }
    });

    // Load Admin Audit Data
    try {
        const auditData = await API.getAdminAudit();
        const payments = auditData.payments || [];
        const users = auditData.users || [];

        document.querySelectorAll('.admin-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.getAttribute('data-atab');
                renderAdminTab(tab, payments, users, currentUser);
            });
        });

        // Default tab
        renderAdminTab('payments-audit', payments, users, currentUser);

    } catch (err) {
        console.error('Error al cargar datos de admin:', err);
    }
}

function renderAdminTab(tab, payments, users, currentUser) {
    const container = document.getElementById('admin-tab-content');
    if (!container) return;

    if (tab === 'payments-audit') {
        const pendingPayments = payments.filter(p => p.status === 'pending');

        if (pendingPayments.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem 1rem; background: var(--bg-secondary); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
                    <i class="fas fa-check-circle" style="font-size: 2.5rem; color: var(--accent-emerald); margin-bottom: 1rem;"></i>
                    <h3 style="font-size: 1.15rem; font-weight: 700; color: white;">No hay comprobantes pendientes de auditoría</h3>
                    <p style="color: var(--text-muted); font-size: 0.875rem;">Todos los pagos procesados han sido aprobados.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table-custom">
                    <thead>
                        <tr>
                            <th>Estudiante</th>
                            <th>Curso Solicitado</th>
                            <th>Monto ARS</th>
                            <th>Fecha</th>
                            <th>Comprobante</th>
                            <th>Acción Auditoría</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pendingPayments.map(p => `
                            <tr>
                                <td>
                                    <strong style="color: white;">${p.student_name}</strong><br/>
                                    <span style="font-size: 0.75rem; color: var(--text-muted);">${p.student_email}</span>
                                </td>
                                <td style="font-weight: 600; color: var(--accent-gold);">${p.course_title}</td>
                                <td><strong>$${Number(p.amount).toLocaleString('es-AR')}</strong></td>
                                <td style="font-size: 0.8rem; color: var(--text-muted);">${p.created_at}</td>
                                <td>
                                    ${p.receipt_url ? `
                                        <a href="${p.receipt_url}" target="_blank" class="btn btn-outline btn-sm">
                                            <i class="fas fa-image"></i> Ver Comprobante
                                        </a>
                                    ` : '<span style="color: var(--text-muted);">Sin foto</span>'}
                                </td>
                                <td>
                                    <div style="display: flex; gap: 0.4rem;">
                                        <button class="btn btn-primary btn-sm btn-approve-pay" data-pid="${p.id}" style="background: var(--accent-emerald); border: none;">
                                            <i class="fas fa-check-circle"></i> Aprobar & Dar Permiso
                                        </button>
                                        <button class="btn btn-secondary btn-sm btn-reject-pay" data-pid="${p.id}" style="background: rgba(225, 29, 72, 0.2); color: var(--accent-rose); border: 1px solid var(--accent-rose);">
                                            <i class="fas fa-times-circle"></i> Rechazar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        document.querySelectorAll('.btn-approve-pay').forEach(btn => {
            btn.addEventListener('click', async () => {
                const pid = btn.getAttribute('data-pid');
                try {
                    await API.approvePayment(pid, currentUser.id);
                    showToast('¡Pago Aprobado! Acceso y permiso al curso otorgado al alumno.', 'success');
                    window.location.reload();
                } catch (err) {
                    showToast('Error al aprobar pago.', 'error');
                }
            });
        });

        document.querySelectorAll('.btn-reject-pay').forEach(btn => {
            btn.addEventListener('click', async () => {
                const pid = btn.getAttribute('data-pid');
                try {
                    await API.rejectPayment(pid, currentUser.id);
                    showToast('Comprobante rechazado.', 'info');
                    window.location.reload();
                } catch (err) {
                    showToast('Error al procesar solicitud.', 'error');
                }
            });
        });

    } else if (tab === 'users-manager') {
        container.innerHTML = `
            <div class="table-responsive">
                <table class="table-custom">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre Completo</th>
                            <th>Email / DNI</th>
                            <th>Rol Actual</th>
                            <th>Cambiar Rol</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(u => `
                            <tr>
                                <td>#${u.id}</td>
                                <td><strong style="color: white;">${u.nombre} ${u.apellido || ''}</strong></td>
                                <td>${u.email} <br/><span style="font-size: 0.75rem; color: var(--text-muted);">DNI: ${u.dni || '-'}</span></td>
                                <td>
                                    <span class="badge-role badge-${u.role}">
                                        ${u.role === 'admin' ? 'Administrador' : (u.role === 'creator' ? 'Instructor' : 'Estudiante')}
                                    </span>
                                </td>
                                <td>
                                    <select class="role-select" data-uid="${u.id}" style="background: var(--bg-input); border: 1px solid var(--border-subtle); color: white; padding: 0.35rem 0.6rem; border-radius: var(--radius-sm); font-size: 0.8rem;">
                                        <option value="student" ${u.role === 'student' ? 'selected' : ''}>Estudiante (student)</option>
                                        <option value="creator" ${u.role === 'creator' ? 'selected' : ''}>Instructor (creator)</option>
                                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrador (admin)</option>
                                    </select>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        document.querySelectorAll('.role-select').forEach(sel => {
            sel.addEventListener('change', async (e) => {
                const uid = sel.getAttribute('data-uid');
                const newRole = e.target.value;
                try {
                    await API.updateUserRole(uid, newRole);
                    showToast('¡Rol de usuario actualizado instantáneamente!', 'success');
                } catch (err) {
                    showToast('Error al actualizar rol.', 'error');
                }
            });
        });
    }
}
