/* ==========================================================================
   CursosMi - Student Dashboard & Certificates View Module
   ========================================================================== */

import { API } from '../api.js';
import { showToast } from '../utils/toast.js';

export async function renderDashboard(containerElement, currentUser) {
    if (!currentUser) {
        renderAuthForms(containerElement);
        return;
    }

    containerElement.innerHTML = `
        <div class="container" style="padding-top: 2rem;">
            <!-- Profile Header Banner -->
            <div style="background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 1.75rem; margin-bottom: 2rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                <div style="display: flex; align-items: center; gap: 1.25rem;">
                    <div class="user-avatar" style="width: 56px; height: 56px; font-size: 1.5rem; font-weight: 800;">
                        ${(currentUser.nombre || 'U')[0]}
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.6rem;">
                            <h2 style="font-family: var(--font-heading); font-size: 1.5rem; font-weight: 800; color: white;">
                                ${currentUser.nombre} ${currentUser.apellido || ''}
                            </h2>
                            <span class="badge-role badge-${currentUser.role}">
                                ${currentUser.role === 'admin' ? 'Administrador' : (currentUser.role === 'creator' ? 'Instructor' : 'Estudiante')}
                            </span>
                        </div>
                        <div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.2rem;">
                            <i class="fas fa-envelope"></i> ${currentUser.email} &nbsp;|&nbsp; <i class="fas fa-id-card"></i> DNI: ${currentUser.dni || '00000000'}
                        </div>
                    </div>
                </div>

                <div style="display: flex; gap: 0.6rem;">
                    ${currentUser.role === 'admin' || currentUser.role === 'creator' ? `
                        <a href="#/admin" class="btn btn-primary btn-sm"><i class="fas fa-cog"></i> Panel de Gestión</a>
                    ` : ''}
                    <button id="btn-logout" class="btn btn-secondary btn-sm"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</button>
                </div>
            </div>

            <!-- Dashboard Navigation Tabs -->
            <div style="display: flex; gap: 0.5rem; border-bottom: 1px solid var(--border-subtle); margin-bottom: 2rem;" id="dash-tabs">
                <button class="dash-tab-btn active" data-tab="active-courses"><i class="fas fa-play-circle"></i> Cursos Activos</button>
                <button class="dash-tab-btn" data-tab="pending-courses"><i class="fas fa-clock"></i> En Verificación</button>
                <button class="dash-tab-btn" data-tab="completed-courses"><i class="fas fa-graduation-cap"></i> Completados & Certificados</button>
            </div>

            <!-- Tab Contents -->
            <div id="tab-content-area">
                <div class="skeleton" style="height: 250px;"></div>
            </div>
        </div>

        <!-- Certificate Digital Modal -->
        <div id="certificate-modal" class="modal-overlay">
            <div class="modal-card" style="max-width: 750px; text-align: center; border: 2px solid var(--accent-gold); background: linear-gradient(135deg, #090d14 0%, #111723 100%);">
                <button class="modal-close" onclick="document.getElementById('certificate-modal').classList.remove('active')">&times;</button>
                
                <div id="cert-print-area" style="padding: 2rem 1rem;">
                    <div style="display: inline-flex; align-items: center; gap: 0.5rem; color: var(--accent-gold); font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1rem;">
                        <i class="fas fa-award"></i> Certificado Digital Oficial de Aprobación
                    </div>

                    <h2 style="font-family: var(--font-heading); font-size: 2.25rem; font-weight: 800; color: white; margin-bottom: 0.5rem;">
                        CursosMi Academy
                    </h2>
                    <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">Otorga el presente diploma de graduación a:</p>

                    <h1 id="cert-student-name" style="font-family: var(--font-heading); font-size: 2.5rem; font-weight: 800; color: var(--accent-gold); text-decoration: underline; margin-bottom: 1.5rem;">
                        ${currentUser.nombre} ${currentUser.apellido || ''}
                    </h1>

                    <p style="color: var(--text-secondary); font-size: 1rem; max-width: 550px; margin: 0 auto 1.5rem auto; line-height: 1.6;">
                        Por haber completado exitosamente el 100% del plan de lecciones prácticas, evaluaciones y proyectos exigidos en el curso:
                    </p>

                    <h3 id="cert-course-title" style="font-size: 1.5rem; font-weight: 800; color: white; margin-bottom: 2rem;">
                        Curso Profesional de Barbería
                    </h3>

                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-medium); padding-top: 1.5rem; font-size: 0.8rem; color: var(--text-muted);">
                        <div>
                            <div>Fecha de Emisión: <strong style="color: white;" id="cert-issue-date">2026-08-17</strong></div>
                            <div>Código Único de Verificación: <strong style="color: var(--accent-gold);" id="cert-code-text">CERT-987123</strong></div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 700; color: white;">Dirección Académica</div>
                            <div style="font-size: 0.75rem; color: var(--accent-blue);">CursosMi Argentina</div>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem; justify-content: center;">
                    <button class="btn btn-primary" onclick="window.print()"><i class="fas fa-print"></i> Imprimir / Exportar PDF</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('certificate-modal').classList.remove('active')">Cerrar</button>
                </div>
            </div>
        </div>
    `;

    // Inline tab styles
    const styleTag = document.createElement('style');
    styleTag.textContent = `
        .dash-tab-btn {
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
        .dash-tab-btn:hover, .dash-tab-btn.active {
            color: var(--accent-gold);
            border-bottom-color: var(--accent-gold);
        }
    `;
    document.head.appendChild(styleTag);

    // Logout handler
    document.getElementById('btn-logout')?.addEventListener('click', () => {
        localStorage.removeItem('cursosmi_user');
        showToast('Sesión cerrada.', 'info');
        window.location.hash = '#/';
        window.location.reload();
    });

    // Load Student Dashboard data
    try {
        const data = await API.getStudentDashboard(currentUser.id || currentUser.user?.id || 3);
        const activeCourses = (data && Array.isArray(data.active)) ? data.active : [];
        const pendingPayments = (data && Array.isArray(data.pending)) ? data.pending : [];
        const completedCourses = (data && Array.isArray(data.completed)) ? data.completed : [];

        // Tab click listeners
        document.querySelectorAll('.dash-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.dash-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.getAttribute('data-tab');
                renderTabContent(tab, activeCourses, pendingPayments, completedCourses);
            });
        });

        // Default tab
        renderTabContent('active-courses', activeCourses, pendingPayments, completedCourses);

    } catch (err) {
        console.error('Error al cargar dashboard:', err);
        renderTabContent('active-courses', [], [], []);
    }
}

function renderTabContent(tab, active, pending, completed) {
    const container = document.getElementById('tab-content-area');
    if (!container) return;

    if (tab === 'active-courses') {
        if (!active || active.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3.5rem 1rem; background: var(--bg-secondary); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
                    <i class="fas fa-book-open" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <h3 style="font-size: 1.15rem; font-weight: 700; color: white;">No tienes cursos activos</h3>
                    <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1.25rem;">Explora el catálogo e inscríbete para comenzar a cursar.</p>
                    <a href="#/" class="btn btn-primary btn-sm"><i class="fas fa-search"></i> Explorar Catálogo</a>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="grid-catalog">
                ${active.map(course => `
                    <div class="course-card">
                        <div class="card-banner-wrapper" style="height: 140px;">
                            <img src="${course.banner_url || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80'}" class="card-banner-img" />
                        </div>
                        <div class="card-body">
                            <h4 style="font-size: 1rem; font-weight: 700; color: white; margin-bottom: 0.5rem;">${course.title}</h4>
                            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">
                                <i class="fas fa-check-circle" style="color: var(--accent-emerald);"></i> Matriculado Activo
                            </div>
                            <a href="#/aula/${course.id}/1" class="btn btn-primary btn-block btn-sm">
                                <i class="fas fa-door-open"></i> Entrar al Aula Virtual
                            </a>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (tab === 'pending-courses') {
        if (!pending || pending.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3.5rem 1rem; background: var(--bg-secondary); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
                    <i class="fas fa-check-circle" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <h3 style="font-size: 1.15rem; font-weight: 700; color: white;">No tienes comprobantes pendientes de verificación</h3>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${pending.map(p => `
                    <div style="background: var(--bg-secondary); border: 1px solid var(--border-accent); border-radius: var(--radius-lg); padding: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                        <div>
                            <span style="background: rgba(245,158,11,0.15); color: var(--accent-gold); font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: var(--radius-sm);">
                                En Revisión por Administración
                            </span>
                            <h4 style="font-size: 1.1rem; font-weight: 700; color: white; margin-top: 0.3rem;">${p.course_title}</h4>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">Monto Enviado: $${p.amount} ARS &nbsp;|&nbsp; Fecha: ${p.created_at}</div>
                        </div>
                        <span style="color: var(--accent-gold); font-weight: 600; font-size: 0.85rem;"><i class="fas fa-spinner fa-spin"></i> Verificando</span>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (tab === 'completed-courses') {
        if (!completed || completed.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3.5rem 1rem; background: var(--bg-secondary); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
                    <i class="fas fa-award" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <h3 style="font-size: 1.15rem; font-weight: 700; color: white;">No tienes cursos completados</h3>
                    <p style="color: var(--text-muted); font-size: 0.875rem;">Completa las lecciones de tus cursos para obtener tus diplomas.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="grid-catalog">
                ${completed.map(c => `
                    <div class="course-card" style="border-color: var(--accent-gold);">
                        <div class="card-banner-wrapper" style="height: 140px;">
                            <img src="${c.banner_url || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80'}" class="card-banner-img" />
                        </div>
                        <div class="card-body">
                            <div style="font-size: 0.75rem; color: var(--accent-gold); font-weight: 700; margin-bottom: 0.3rem;">GRADUADO Y CERTIFICADO</div>
                            <h4 style="font-size: 1rem; font-weight: 700; color: white; margin-bottom: 0.75rem;">${c.title}</h4>
                            <button class="btn btn-primary btn-block btn-sm" onclick="openCertModal('${(c.title || 'Curso').replace(/'/g, "\\'")}', '${c.cert_code || 'CERT-' + c.id}')">
                                <i class="fas fa-award"></i> Ver Diploma Digital
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        window.openCertModal = (title, code) => {
            document.getElementById('cert-course-title').innerText = title;
            document.getElementById('cert-code-text').innerText = code;
            document.getElementById('certificate-modal')?.classList.add('active');
        };
    }
}

function renderAuthForms(container) {
    container.innerHTML = `
        <div class="container" style="max-width: 480px; padding-top: 3rem;">
            <div style="background: var(--bg-secondary); border: 1px solid var(--border-medium); border-radius: var(--radius-xl); padding: 2rem; box-shadow: var(--shadow-lg);">
                <!-- Auth Toggle Tabs -->
                <div style="display: flex; gap: 0.5rem; background: var(--bg-primary); padding: 0.35rem; border-radius: var(--radius-lg); margin-bottom: 1.5rem;">
                    <button id="tab-auth-login" class="auth-toggle-btn active" style="flex: 1; padding: 0.6rem; border: none; border-radius: var(--radius-md); font-weight: 700; font-size: 0.9rem; cursor: pointer;">
                        Iniciar Sesión
                    </button>
                    <button id="tab-auth-register" class="auth-toggle-btn" style="flex: 1; padding: 0.6rem; border: none; border-radius: var(--radius-md); font-weight: 700; font-size: 0.9rem; cursor: pointer;">
                        Registrarse
                    </button>
                </div>

                <!-- Login Form -->
                <form id="form-login" style="display: block;">
                    <div style="text-align: center; margin-bottom: 1.25rem;">
                        <h2 style="font-family: var(--font-heading); font-size: 1.5rem; font-weight: 800; color: white;">
                            Acceso a CursosMi
                        </h2>
                        <p style="color: var(--text-muted); font-size: 0.85rem;">Ingresa tu Email o DNI para continuar.</p>
                    </div>

                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; font-size: 0.825rem; color: var(--text-secondary); margin-bottom: 0.35rem;">Email o DNI</label>
                        <input type="text" id="login-email" required placeholder="ej. tu_email@dominio.com o DNI" style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle); color: white; padding: 0.65rem 0.85rem; border-radius: var(--radius-md);" />
                    </div>
                    <div style="margin-bottom: 1.25rem;">
                        <label style="display: block; font-size: 0.825rem; color: var(--text-secondary); margin-bottom: 0.35rem;">Contraseña</label>
                        <input type="password" id="login-password" required placeholder="••••••••••••" style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle); color: white; padding: 0.65rem 0.85rem; border-radius: var(--radius-md);" />
                    </div>
                    <button type="submit" class="btn btn-primary btn-block btn-lg">
                        <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
                    </button>
                </form>

                <!-- Register Form -->
                <form id="form-register" style="display: none;">
                    <div style="text-align: center; margin-bottom: 1.25rem;">
                        <h2 style="font-family: var(--font-heading); font-size: 1.5rem; font-weight: 800; color: white;">
                            Crear Nueva Cuenta
                        </h2>
                        <p style="color: var(--text-muted); font-size: 0.85rem;">Registrate para acceder a tus cursos y diplomas.</p>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.85rem;">
                        <div>
                            <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem;">Nombre</label>
                            <input type="text" id="reg-nombre" required placeholder="ej. Carlos" style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle); color: white; padding: 0.6rem; border-radius: var(--radius-md); font-size: 0.85rem;" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem;">Apellido</label>
                            <input type="text" id="reg-apellido" required placeholder="ej. Pérez" style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle); color: white; padding: 0.6rem; border-radius: var(--radius-md); font-size: 0.85rem;" />
                        </div>
                    </div>

                    <div style="margin-bottom: 0.85rem;">
                        <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem;">Número de DNI</label>
                        <input type="text" id="reg-dni" required placeholder="ej. 38999000" style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle); color: white; padding: 0.6rem; border-radius: var(--radius-md); font-size: 0.85rem;" />
                    </div>

                    <div style="margin-bottom: 0.85rem;">
                        <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem;">Correo Electrónico</label>
                        <input type="email" id="reg-email" required placeholder="ej. estudiante@correo.com" style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle); color: white; padding: 0.6rem; border-radius: var(--radius-md); font-size: 0.85rem;" />
                    </div>

                    <div style="margin-bottom: 0.85rem;">
                        <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem;">Contraseña</label>
                        <input type="password" id="reg-password" required placeholder="Mínimo 6 caracteres" minlength="6" style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle); color: white; padding: 0.6rem; border-radius: var(--radius-md); font-size: 0.85rem;" />
                    </div>

                    <div style="margin-bottom: 1.25rem;">
                        <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem;">Tipo de Perfil</label>
                        <select id="reg-role" style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle); color: white; padding: 0.6rem; border-radius: var(--radius-md); font-size: 0.85rem;">
                            <option value="student">Estudiante / Alumno</option>
                            <option value="creator">Instructor / Creador</option>
                        </select>
                    </div>

                    <button type="submit" class="btn btn-primary btn-block btn-lg">
                        <i class="fas fa-user-plus"></i> Completar Registro
                    </button>
                </form>
            </div>
        </div>
    `;

    // Auth Tab Styles & Switching
    const btnLoginTab = document.getElementById('tab-auth-login');
    const btnRegisterTab = document.getElementById('tab-auth-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');

    const updateTabStyles = (activeTab) => {
        if (activeTab === 'login') {
            btnLoginTab.style.background = 'var(--bg-secondary)';
            btnLoginTab.style.color = 'var(--accent-gold)';
            btnRegisterTab.style.background = 'transparent';
            btnRegisterTab.style.color = 'var(--text-muted)';
            formLogin.style.display = 'block';
            formRegister.style.display = 'none';
        } else {
            btnRegisterTab.style.background = 'var(--bg-secondary)';
            btnRegisterTab.style.color = 'var(--accent-gold)';
            btnLoginTab.style.background = 'transparent';
            btnLoginTab.style.color = 'var(--text-muted)';
            formLogin.style.display = 'none';
            formRegister.style.display = 'block';
        }
    };

    updateTabStyles('login');

    btnLoginTab?.addEventListener('click', () => updateTabStyles('login'));
    btnRegisterTab?.addEventListener('click', () => updateTabStyles('register'));

    // Submit Login Handler
    formLogin?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;

        try {
            const user = await API.login(email, pass);
            if (user && !user.error) {
                localStorage.setItem('cursosmi_user', JSON.stringify(user));
                showToast(`¡Bienvenido de nuevo, ${user.nombre}!`, 'success');
                window.location.reload();
            } else {
                showToast(user.error || 'Credenciales incorrectas.', 'error');
            }
        } catch (err) {
            showToast('Error al iniciar sesión.', 'error');
        }
    });

    // Submit Register Handler
    formRegister?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('reg-nombre').value;
        const apellido = document.getElementById('reg-apellido').value;
        const dni = document.getElementById('reg-dni').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const role = document.getElementById('reg-role').value;

        try {
            const res = await API.register({ nombre, apellido, dni, email, password, role });
            if (res && !res.error) {
                localStorage.setItem('cursosmi_user', JSON.stringify(res));
                showToast(`¡Cuenta creada exitosamente! Bienvenido, ${res.nombre}.`, 'success');
                window.location.reload();
            } else {
                showToast(res.error || 'No se pudo crear la cuenta.', 'error');
            }
        } catch (err) {
            showToast('Error en el registro de cuenta.', 'error');
        }
    });
}
