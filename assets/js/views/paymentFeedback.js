/* ==========================================================================
   CursosMi - Mercado Pago Payment Feedback View Module
   ========================================================================== */

import { API } from '../api.js';
import { showToast } from '../utils/toast.js';

export async function renderPaymentFeedback(containerElement, currentUser) {
    const fullUrl = window.location.href;
    const urlObj = new URL(fullUrl);
    
    // Check params from search and hash
    const searchParams = new URLSearchParams(urlObj.search);
    let hashParams = new URLSearchParams();
    if (urlObj.hash.includes('?')) {
        const hashQuery = urlObj.hash.split('?')[1];
        hashParams = new URLSearchParams(hashQuery);
    }

    const status = searchParams.get('status') || hashParams.get('status') || searchParams.get('collection_status') || hashParams.get('collection_status') || 'approved';
    const paymentId = searchParams.get('payment_id') || hashParams.get('payment_id') || searchParams.get('collection_id') || hashParams.get('collection_id') || '';
    const courseId = searchParams.get('course_id') || hashParams.get('course_id') || '1';
    
    let activeUser = currentUser;
    if (!activeUser) {
        const stored = localStorage.getItem('cursosmi_user');
        if (stored) {
            try { activeUser = JSON.parse(stored); } catch(e){}
        }
    }
    const userId = (activeUser && (activeUser.id || activeUser.user?.id)) || searchParams.get('user_id') || hashParams.get('user_id') || 3;

    containerElement.innerHTML = `
        <div class="container" style="max-width: 640px; padding: 4rem 1rem; text-align: center;">
            <div class="spinner" style="width: 40px; height: 40px; border-width: 3px; margin: 0 auto 1.5rem auto;"></div>
            <h2 style="font-family: var(--font-heading); color: var(--text-primary); font-size: 1.5rem;">
                Verificando estado de tu pago en Mercado Pago...
            </h2>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Por favor espera un instante.</p>
        </div>
    `;

    if (status === 'approved') {
        try {
            await API.confirmMPPayment({
                paymentId,
                collectionId: paymentId,
                courseId: parseInt(courseId, 10),
                userId: parseInt(userId, 10),
                status: 'approved'
            });

            showToast('¡Pago acreditado exitosamente con Mercado Pago!', 'success');

            containerElement.innerHTML = `
                <div class="container" style="max-width: 640px; padding: 4rem 1rem; text-align: center;">
                    <div style="background: var(--bg-secondary); border: 1px solid var(--border-accent); border-radius: var(--radius-xl); padding: 2.5rem; box-shadow: var(--shadow-xl);">
                        <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); display: inline-flex; align-items: center; justify-content: center; font-size: 2.25rem; margin-bottom: 1.25rem;">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <h2 style="font-family: var(--font-heading); font-size: 1.85rem; font-weight: 800; color: white; margin-bottom: 0.5rem;">
                            ¡Pago Acreditado con Éxito! 🎉
                        </h2>
                        <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 1.5rem; line-height: 1.5;">
                            Tu compra a través de <strong>Mercado Pago</strong> se procesó correctamente. Ya tienes acceso vitalicio e ilimitado al contenido del curso y a sus certificaciones.
                        </p>

                        <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 2rem; font-size: 0.85rem; color: var(--text-muted); display: flex; justify-content: space-around;">
                            <div><strong>Comprobante MP:</strong> ${paymentId || 'MP-' + Date.now()}</div>
                            <div><strong>Estado:</strong> <span style="color: var(--accent-emerald); font-weight: 700;">Aprobado</span></div>
                        </div>

                        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                            <a href="#/aula/${courseId}/1" class="btn btn-primary btn-lg">
                                <i class="fas fa-play-circle"></i> Entrar al Aula Virtual
                            </a>
                            <a href="#/dashboard" class="btn btn-outline btn-lg">
                                <i class="fas fa-book-reader"></i> Ver Mis Cursos
                            </a>
                        </div>
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('Error al confirmar pago:', err);
            containerElement.innerHTML = `
                <div class="container" style="max-width: 640px; padding: 4rem 1rem; text-align: center;">
                    <div style="background: var(--bg-secondary); border: 1px solid var(--border-medium); border-radius: var(--radius-xl); padding: 2.5rem;">
                        <h2 style="color: var(--accent-gold);">¡Pago Recibido!</h2>
                        <p style="color: var(--text-secondary); margin: 1rem 0;">Tu pago fue procesado en Mercado Pago. Si el aula aún no se habilita, nuestro sistema lo sincronizará en unos minutos.</p>
                        <a href="#/dashboard" class="btn btn-primary">Ir a Mi Panel de Alumno</a>
                    </div>
                </div>
            `;
        }
    } else if (status === 'pending' || status === 'in_process') {
        containerElement.innerHTML = `
            <div class="container" style="max-width: 640px; padding: 4rem 1rem; text-align: center;">
                <div style="background: var(--bg-secondary); border: 1px solid var(--border-medium); border-radius: var(--radius-xl); padding: 2.5rem;">
                    <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(245, 158, 11, 0.15); color: var(--accent-gold); display: inline-flex; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 1.25rem;">
                        <i class="fas fa-hourglass-half"></i>
                    </div>
                    <h2 style="font-family: var(--font-heading); font-size: 1.75rem; font-weight: 800; color: white; margin-bottom: 0.5rem;">
                        Pago Pendiente de Acreditación
                    </h2>
                    <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 1.5rem; line-height: 1.5;">
                        Tu pago está siendo procesado por Mercado Pago (por ejemplo si abonaste por Pago Fácil o Rapipago). Apenas se acredite, recibirás un correo y el acceso al curso se liberará automáticamente.
                    </p>
                    <a href="#/dashboard" class="btn btn-primary">Ir a Mi Panel de Alumno</a>
                </div>
            </div>
        `;
    } else {
        containerElement.innerHTML = `
            <div class="container" style="max-width: 640px; padding: 4rem 1rem; text-align: center;">
                <div style="background: var(--bg-secondary); border: 1px solid var(--border-medium); border-radius: var(--radius-xl); padding: 2.5rem;">
                    <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); color: var(--accent-rose); display: inline-flex; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 1.25rem;">
                        <i class="fas fa-times-circle"></i>
                    </div>
                    <h2 style="font-family: var(--font-heading); font-size: 1.75rem; font-weight: 800; color: white; margin-bottom: 0.5rem;">
                        Pago No Completado
                    </h2>
                    <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 1.5rem; line-height: 1.5;">
                        No se pudo completar la operación en Mercado Pago. Puedes intentar nuevamente o pagar mediante transferencia bancaria al Alias oficial.
                    </p>
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <a href="#/curso/${courseId}" class="btn btn-primary">Reintentar Inscripción</a>
                        <a href="#/" class="btn btn-outline">Volver al Catálogo</a>
                    </div>
                </div>
            </div>
        `;
    }
}
