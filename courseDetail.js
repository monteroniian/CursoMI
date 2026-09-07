/* ==========================================================================
   CursosMi - Course Detail Landing & Checkout View Module
   ========================================================================== */

import { API } from '../api.js';
import { showToast } from '../utils/toast.js';
import { renderQRCode } from '../utils/qrGenerator.js';

export async function renderCourseDetail(containerElement, courseId, currentUser) {
    containerElement.innerHTML = `
        <div class="container" style="padding-top: 2rem;">
            <div class="skeleton" style="height: 400px; border-radius: var(--radius-lg);"></div>
        </div>
    `;

    try {
        const course = await API.getCourseDetail(courseId);
        if (!course || course.error) {
            containerElement.innerHTML = `
                <div class="container" style="padding: 4rem 1rem; text-align: center;">
                    <h2>Curso no encontrado</h2>
                    <a href="#/" class="btn btn-primary" style="margin-top: 1rem;">Volver al Catálogo</a>
                </div>
            `;
            return;
        }

        const lessons = course.lessons || [];

        containerElement.innerHTML = `
            <div class="container" style="padding-top: 2rem;">
                <!-- Breadcrumb Navigation -->
                <div style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">
                    <a href="#/" style="color: var(--text-secondary); text-decoration: none;">Inicio</a>
                    <i class="fas fa-chevron-right" style="font-size: 0.7rem;"></i>
                    <span>${course.category}</span>
                    <i class="fas fa-chevron-right" style="font-size: 0.7rem;"></i>
                    <span style="color: var(--accent-gold);">${course.title}</span>
                </div>

                <!-- Course Detail Layout (2 Columns) -->
                <div style="display: grid; grid-template-columns: 1fr 380px; gap: 2rem;" class="detail-grid">
                    <!-- Main Left Column -->
                    <div>
                        <!-- Course Header Banner -->
                        <div style="position: relative; border-radius: var(--radius-xl); overflow: hidden; height: 320px; margin-bottom: 2rem; border: 1px solid var(--border-medium);">
                            <img src="${course.banner_url || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80'}" style="width: 100%; height: 100%; object-fit: cover;" />
                            <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(9,13,20,0.2) 0%, rgba(9,13,20,0.95) 100%);"></div>
                            <div style="position: absolute; bottom: 1.5rem; left: 1.5rem; right: 1.5rem;">
                                <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap;">
                                    <span class="card-category-badge" style="position: static;"><i class="fas fa-tag"></i> ${course.category}</span>
                                    <span style="background: rgba(245, 158, 11, 0.2); color: var(--accent-gold); border: 1px solid var(--border-accent); padding: 0.25rem 0.6rem; border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 700;">
                                        <i class="fas fa-award"></i> Certificación Oficial CursosMi
                                    </span>
                                </div>
                                <h1 style="font-family: var(--font-heading); font-size: 2.25rem; font-weight: 800; color: white; line-height: 1.2;">
                                    ${course.title}
                                </h1>
                                <div style="display: flex; align-items: center; gap: 1.25rem; margin-top: 0.75rem; color: var(--text-secondary); font-size: 0.875rem;">
                                    <span><i class="fas fa-user-tie" style="color: var(--accent-blue);"></i> Instructor: <strong>${course.creator_name || 'Marcos Barber Studio'}</strong></span>
                                    <span><i class="fas fa-star" style="color: var(--accent-gold);"></i> ${course.avg_rating || 5.0} (${course.reviews_count || 1} valoraciones)</span>
                                    <span><i class="fas fa-layer-group" style="color: var(--accent-emerald);"></i> ${lessons.length} Módulos Completos</span>
                                </div>
                            </div>
                        </div>



                        <!-- Syllabus / Temario Section -->
                        <div style="background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.75rem; margin-bottom: 2rem;">
                            <h3 style="font-family: var(--font-heading); font-size: 1.35rem; font-weight: 800; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.6rem;">
                                <i class="fas fa-list-ol" style="color: var(--accent-gold);"></i> Temario Completo del Curso (${lessons.length} Lecciones)
                            </h3>
                            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                                ${lessons.map((lesson, idx) => `
                                    <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-card); padding: 1rem 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                                        <div style="display: flex; align-items: center; gap: 1rem;">
                                            <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(245,158,11,0.15); color: var(--accent-gold); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;">
                                                ${idx + 1}
                                            </div>
                                            <div>
                                                <div style="font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">${lesson.title}</div>
                                                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                                                    <i class="fas fa-play-circle" style="color: var(--accent-blue);"></i> Video HD &nbsp;|&nbsp; 
                                                    <i class="fas fa-file-pdf" style="color: var(--accent-rose);"></i> Material PDF &nbsp;|&nbsp; 
                                                    <i class="fas fa-check-square" style="color: var(--accent-emerald);"></i> Quiz Evaluativo
                                                </div>
                                            </div>
                                        </div>
                                        <span style="font-size: 0.75rem; background: var(--bg-secondary); color: var(--text-secondary); padding: 0.25rem 0.6rem; border-radius: var(--radius-sm);">
                                            Modulo ${idx + 1}
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Reviews Section -->
                        <div style="background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.75rem;">
                            <h3 style="font-family: var(--font-heading); font-size: 1.35rem; font-weight: 800; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.6rem;">
                                <i class="fas fa-star" style="color: var(--accent-gold);"></i> Reseñas de Alumnos Matriculados
                            </h3>
                            <div id="reviews-list" style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">
                                <!-- Rendered dynamically -->
                            </div>
                        </div>
                    </div>

                    <!-- Right Buy / Checkout Sidebar Card -->
                    <div>
                        <div style="position: sticky; top: 90px; background: var(--bg-secondary); border: 1px solid var(--border-medium); border-radius: var(--radius-xl); padding: 1.75rem; box-shadow: var(--shadow-lg);">
                            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Acceso Vitalicio + Diploma</div>
                            <div style="font-family: var(--font-heading); font-size: 2.25rem; font-weight: 800; color: var(--accent-gold); margin: 0.5rem 0 1.25rem 0;">
                                $${Number(course.price).toLocaleString('es-AR')} <span style="font-size: 1rem; color: var(--text-muted); font-weight: 500;">ARS</span>
                            </div>

                            <ul style="list-style: none; padding: 0; margin: 0 0 1.5rem 0; display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.875rem; color: var(--text-secondary);">
                                <li style="display: flex; align-items: center; gap: 0.6rem;"><i class="fas fa-check" style="color: var(--accent-emerald);"></i> 10 Módulos Practicos en Alta Definición</li>
                                <li style="display: flex; align-items: center; gap: 0.6rem;"><i class="fas fa-check" style="color: var(--accent-emerald);"></i> Descarga de Guías en Formato PDF</li>
                                <li style="display: flex; align-items: center; gap: 0.6rem;"><i class="fas fa-check" style="color: var(--accent-emerald);"></i> Exámenes Quizzes con Score del 70%+</li>
                                <li style="display: flex; align-items: center; gap: 0.6rem;"><i class="fas fa-check" style="color: var(--accent-emerald);"></i> Carpeta de Campo & Bitácora de Alumno</li>
                                <li style="display: flex; align-items: center; gap: 0.6rem;"><i class="fas fa-check" style="color: var(--accent-emerald);"></i> Certificado Digital Oficial con QR Único</li>
                            </ul>

                            <button id="btn-start-checkout" class="btn btn-primary btn-lg btn-block">
                                <i class="fas fa-shopping-cart"></i> Inscribirme Ahora (Mercado Pago)
                            </button>

                            <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle); text-align: center; font-size: 0.78rem; color: var(--text-muted);">
                                <i class="fas fa-shield-alt" style="color: var(--accent-blue);"></i> Transacción 100% Segura con Alias / QR Mercado Pago
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mercado Pago Dual Checkout Modal -->
            <div id="checkout-modal" class="modal-overlay">
                <div class="modal-card" style="max-width: 520px;">
                    <button class="modal-close" onclick="document.getElementById('checkout-modal').classList.remove('active')">&times;</button>
                    
                    <div style="text-align: center; margin-bottom: 1.25rem;">
                        <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background: rgba(0, 158, 227, 0.15); color: #009ee3; font-size: 1.4rem; margin-bottom: 0.5rem;">
                            <i class="fas fa-shield-alt"></i>
                        </div>
                        <h3 style="font-family: var(--font-heading); font-size: 1.4rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.25rem;">
                            Inscripción al Curso
                        </h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem;">
                            ${course.title} — <strong style="color: var(--accent-gold); font-size: 1.05rem;">$${Number(course.price).toLocaleString('es-AR')} ARS</strong>
                        </p>
                    </div>

                    <!-- Payment Mode Selector Tabs -->
                    <div style="display: flex; gap: 0.5rem; background: var(--bg-card); padding: 0.35rem; border-radius: var(--radius-md); margin-bottom: 1.25rem; border: 1px solid var(--border-subtle);">
                        <button type="button" id="tab-btn-mp-api" style="flex: 1; padding: 0.6rem; border: none; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem; background: #009ee3; color: white; transition: var(--transition-fast);">
                            <i class="fas fa-bolt"></i> Mercado Pago (API)
                        </button>
                        <button type="button" id="tab-btn-manual-alias" style="flex: 1; padding: 0.6rem; border: none; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem; background: transparent; color: var(--text-muted); transition: var(--transition-fast);">
                            <i class="fas fa-university"></i> Transferencia / Alias
                        </button>
                    </div>

                    <!-- Option 1: Mercado Pago API Checkout Pro -->
                    <div id="section-mp-api">
                        <div style="background: rgba(0, 158, 227, 0.08); border: 1px solid rgba(0, 158, 227, 0.3); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; color: #009ee3; font-weight: 700; font-size: 0.9rem; margin-bottom: 0.3rem;">
                                <i class="fas fa-check-circle"></i> Acreditación Instantánea 24/7
                            </div>
                            <p style="color: var(--text-secondary); font-size: 0.8rem; margin: 0; line-height: 1.4;">
                                Paga con saldo en <strong>Mercado Pago</strong>, tarjetas de crédito, débito o en efectivo (Pago Fácil / Rapipago). Tu acceso al curso se desbloquea en el acto.
                            </p>
                        </div>

                        <div style="margin-bottom: 1.25rem; text-align: center;">
                            <button id="btn-pay-mercadopago-api" class="btn btn-primary btn-block btn-lg" style="background: linear-gradient(135deg, #009ee3, #0073a5); border: none; box-shadow: 0 4px 15px rgba(0, 158, 227, 0.35); font-size: 1rem; padding: 0.85rem; font-weight: 700;">
                                <i class="fas fa-credit-card"></i> Pagar con Mercado Pago ($${Number(course.price).toLocaleString('es-AR')} ARS)
                            </button>
                            <div id="mp-btn-loading" style="display: none; margin-top: 0.75rem; color: #009ee3; font-size: 0.85rem; align-items: center; justify-content: center; gap: 0.5rem;">
                                <div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div> Conectando con Mercado Pago...
                            </div>
                        </div>

                        <div style="display: flex; justify-content: center; gap: 1.25rem; color: var(--text-muted); font-size: 0.75rem;">
                            <span><i class="fas fa-shield-alt" style="color: var(--accent-emerald);"></i> Pasarela Oficial</span>
                            <span><i class="fas fa-credit-card" style="color: var(--accent-gold);"></i> Todas las tarjetas</span>
                            <span><i class="fas fa-bolt" style="color: #009ee3;"></i> Liberación Automática</span>
                        </div>
                    </div>

                    <!-- Option 2: Manual Transfer via Alias & QR -->
                    <div id="section-manual-alias" style="display: none;">
                        <!-- Alias & Banking Info Box -->
                        <div style="background: var(--bg-card); border: 1px solid var(--border-accent); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
                            <div style="font-size: 0.75rem; color: var(--accent-gold); text-transform: uppercase; font-weight: 700;">Alias Mercado Pago Oficial</div>
                            <div style="display: flex; align-items: center; justify-content: space-between; margin: 0.35rem 0;">
                                <strong style="font-size: 1.2rem; color: #009ee3; font-family: var(--font-heading);" id="mp-alias-text">${course.mp_alias || 'ianmonteroni'}</strong>
                                <button class="btn btn-sm btn-outline" id="btn-copy-alias"><i class="fas fa-copy"></i> Copiar Alias</button>
                            </div>
                            <div style="font-size: 0.8rem; color: var(--text-muted); border-top: 1px solid var(--border-subtle); padding-top: 0.5rem; margin-top: 0.5rem;">
                                ${course.payment_info || ('Transferir al Alias Mercado Pago: ' + (course.mp_alias || 'ianmonteroni'))}
                            </div>
                        </div>

                        <!-- QR Canvas Section -->
                        <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 1.25rem; background: white; padding: 0.75rem; border-radius: var(--radius-md);">
                            <canvas id="mp-qr-canvas" width="160" height="160"></canvas>
                            <div style="color: #0f172a; font-weight: 700; margin-top: 0.35rem; font-size: 0.8rem;">Escanea con App Mercado Pago o tu banco</div>
                        </div>

                        <!-- Receipt Upload Form -->
                        <form id="form-upload-receipt">
                            <div style="margin-bottom: 1rem;">
                                <label style="display: block; font-size: 0.82rem; font-weight: 600; margin-bottom: 0.35rem; color: var(--text-primary);">
                                    Adjuntar Comprobante de Pago (Imagen JPG/PNG)
                                </label>
                                <input type="file" id="input-receipt-file" accept="image/*" required style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 0.55rem; border-radius: var(--radius-md); font-size: 0.85rem;" />
                            </div>

                            <button type="submit" class="btn btn-secondary btn-block btn-lg" style="font-size: 0.95rem;">
                                <i class="fas fa-paper-plane"></i> Enviar Comprobante para Verificación
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Render QR Code canvas
        setTimeout(() => {
            const canvas = document.getElementById('mp-qr-canvas');
            if (canvas) renderQRCode(canvas, course.mp_alias || 'ianmonteroni');
        }, 100);

        // Tab Switching Handlers
        const tabBtnMpApi = document.getElementById('tab-btn-mp-api');
        const tabBtnManualAlias = document.getElementById('tab-btn-manual-alias');
        const secMpApi = document.getElementById('section-mp-api');
        const secManualAlias = document.getElementById('section-manual-alias');

        tabBtnMpApi?.addEventListener('click', () => {
            tabBtnMpApi.style.background = '#009ee3';
            tabBtnMpApi.style.color = 'white';
            tabBtnManualAlias.style.background = 'transparent';
            tabBtnManualAlias.style.color = 'var(--text-muted)';
            if (secMpApi) secMpApi.style.display = 'block';
            if (secManualAlias) secManualAlias.style.display = 'none';
        });

        tabBtnManualAlias?.addEventListener('click', () => {
            tabBtnManualAlias.style.background = '#009ee3';
            tabBtnManualAlias.style.color = 'white';
            tabBtnMpApi.style.background = 'transparent';
            tabBtnMpApi.style.color = 'var(--text-muted)';
            if (secMpApi) secMpApi.style.display = 'none';
            if (secManualAlias) secManualAlias.style.display = 'block';
        });

        // Attach Checkout modal opener handler
        document.getElementById('btn-start-checkout')?.addEventListener('click', () => {
            if (!currentUser) {
                showToast('Por favor inicia sesión para realizar la inscripción.', 'warning');
                location.hash = '#/dashboard';
                return;
            }
            document.getElementById('checkout-modal')?.classList.add('active');
        });

        // Mercado Pago API Checkout Button Handler
        document.getElementById('btn-pay-mercadopago-api')?.addEventListener('click', async () => {
            let activeUser = currentUser;
            if (!activeUser) {
                const storedUser = localStorage.getItem('cursosmi_user');
                if (storedUser) {
                    try { activeUser = JSON.parse(storedUser); } catch (e) {}
                }
            }

            if (!activeUser || (!activeUser.id && (!activeUser.user || !activeUser.user.id))) {
                showToast('Por favor inicia sesión para continuar con el pago.', 'warning');
                document.getElementById('checkout-modal')?.classList.remove('active');
                location.hash = '#/dashboard';
                return;
            }

            const activeUserId = activeUser.id || activeUser.user?.id;
            const btnPay = document.getElementById('btn-pay-mercadopago-api');
            const loadingIndicator = document.getElementById('mp-btn-loading');

            try {
                if (btnPay) btnPay.disabled = true;
                if (loadingIndicator) loadingIndicator.style.display = 'flex';

                const prefResponse = await API.createMPPreference(course.id, activeUserId);

                if (prefResponse && prefResponse.init_point) {
                    showToast('Redirigiendo a la pasarela segura de Mercado Pago...', 'success');
                    // Redirigir al checkout oficial de Mercado Pago
                    window.location.href = prefResponse.init_point;
                } else if (prefResponse && prefResponse.sandbox_init_point) {
                    window.location.href = prefResponse.sandbox_init_point;
                } else {
                    showToast(prefResponse?.error || 'No se pudo generar la preferencia de Mercado Pago.', 'error');
                    if (btnPay) btnPay.disabled = false;
                    if (loadingIndicator) loadingIndicator.style.display = 'none';
                }
            } catch (err) {
                console.error('Error al iniciar Mercado Pago:', err);
                showToast('Error de conexión con Mercado Pago.', 'error');
                if (btnPay) btnPay.disabled = false;
                if (loadingIndicator) loadingIndicator.style.display = 'none';
            }
        });

        // Copy Alias Handler
        document.getElementById('btn-copy-alias')?.addEventListener('click', () => {
            const alias = document.getElementById('mp-alias-text')?.innerText || '';
            navigator.clipboard.writeText(alias);
            showToast('¡Alias copiado al portapapeles!', 'success');
        });

        // Receipt Submit Handler
        document.getElementById('form-upload-receipt')?.addEventListener('submit', async (e) => {
            e.preventDefault();

            let activeUser = currentUser;
            if (!activeUser) {
                const storedUser = localStorage.getItem('cursosmi_user');
                if (storedUser) {
                    try { activeUser = JSON.parse(storedUser); } catch(e){}
                }
            }

            if (!activeUser || (!activeUser.id && (!activeUser.user || !activeUser.user.id))) {
                showToast('Por favor inicia sesión para enviar tu comprobante de pago.', 'warning');
                document.getElementById('checkout-modal')?.classList.remove('active');
                location.hash = '#/dashboard';
                return;
            }

            const activeUserId = activeUser.id || activeUser.user?.id || 3;
            const fileInput = document.getElementById('input-receipt-file');
            if (!fileInput.files || fileInput.files.length === 0) {
                showToast('Por favor selecciona la imagen de tu comprobante.', 'warning');
                return;
            }

            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = async (evt) => {
                const base64Image = evt.target.result;
                try {
                    const res = await API.uploadPayment({
                        userId: activeUserId,
                        user_id: activeUserId,
                        courseId: course.id || 1,
                        course_id: course.id || 1,
                        amount: course.price || 18500,
                        receiptRef: `MP-${Date.now()}`,
                        receipt_ref: `MP-${Date.now()}`,
                        receiptImage: base64Image,
                        receipt_image: base64Image
                    });
                    if (res && res.error) {
                        showToast(res.error, 'error');
                    } else {
                        showToast('¡Comprobante enviado exitosamente! Un administrador verificará tu pago.', 'success');
                        document.getElementById('checkout-modal')?.classList.remove('active');
                        location.hash = '#/dashboard';
                    }
                } catch (err) {
                    showToast('Error de conexión al subir comprobante.', 'error');
                }
            };
            reader.readAsDataURL(file);
        });

    } catch (err) {
        console.error('Error al rendear detalle:', err);
    }
}
