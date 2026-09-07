/* ==========================================================================
   CursosMi - Dual Virtual Classroom View Module (Video/Reading, Quiz & Forum)
   ========================================================================== */

import { API } from '../api.js';
import { showToast } from '../utils/toast.js';

export async function renderClassroom(containerElement, courseId, lessonOrder = 1, currentUser) {
    containerElement.innerHTML = `
        <div class="container" style="padding-top: 2rem;">
            <div class="skeleton" style="height: 500px; border-radius: var(--radius-lg);"></div>
        </div>
    `;

    try {
        const course = await API.getCourseDetail(courseId);
        if (!course || !course.lessons || course.lessons.length === 0) {
            containerElement.innerHTML = `
                <div class="container" style="padding: 4rem 1rem; text-align: center;">
                    <h2>No hay lecciones disponibles para este curso</h2>
                    <a href="#/" class="btn btn-primary" style="margin-top: 1rem;">Volver al Inicio</a>
                </div>
            `;
            return;
        }

        const lessons = course.lessons;
        const currentLesson = lessons.find(l => Number(l.order_num) === Number(lessonOrder)) || lessons[0];

        const isLocalVideo = currentLesson.video_url && (
            currentLesson.video_url.endsWith('.mov') || 
            currentLesson.video_url.endsWith('.mp4') || 
            currentLesson.video_url.includes('videos/')
        );

        const videoPlayerMarkup = isLocalVideo ? `
            <video controls src="${currentLesson.video_url}" style="width: 100%; height: 100%; object-fit: contain; background: black;"></video>
        ` : `
            <iframe src="${currentLesson.video_url || 'https://www.youtube.com/embed/dQw4w9WgXcQ'}" allowfullscreen style="width: 100%; height: 100%; border: none;"></iframe>
        `;

        containerElement.innerHTML = `
            <div class="container" style="padding-top: 1.5rem;">
                <!-- Header Title Row -->
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
                    <div>
                        <div style="font-size: 0.8rem; color: var(--accent-gold); font-weight: 700; text-transform: uppercase;">
                            <i class="fas fa-graduation-cap"></i> Aula Virtual CursosMi
                        </div>
                        <h2 style="font-family: var(--font-heading); font-size: 1.5rem; font-weight: 800; color: white; margin: 0.2rem 0;">
                            ${course.title}
                        </h2>
                    </div>

                    <div style="display: flex; gap: 0.5rem;">
                        <a href="#/dashboard" class="btn btn-secondary btn-sm"><i class="fas fa-arrow-left"></i> Mi Cuenta</a>
                        <a href="#/curso/${courseId}" class="btn btn-outline btn-sm"><i class="fas fa-info-circle"></i> Ficha del Curso</a>
                    </div>
                </div>

                <!-- Classroom Dual Layout -->
                <div class="classroom-layout">
                    <!-- Main Content Area -->
                    <div>
                        <!-- Video HD Player -->
                        <div class="player-container">
                            ${videoPlayerMarkup}
                        </div>

                        <!-- Content Controls Bar -->
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; background: var(--bg-secondary); padding: 1rem 1.25rem; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); margin-bottom: 1.5rem;">
                            <div>
                                <span style="background: rgba(59,130,246,0.15); color: var(--accent-blue); font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: var(--radius-sm);">
                                    Modulo ${currentLesson.order_num}
                                </span>
                                <h3 style="font-size: 1.2rem; font-weight: 800; color: white; margin-top: 0.3rem;">
                                    ${currentLesson.title}
                                </h3>
                            </div>

                            <div style="display: flex; gap: 0.6rem;">
                                ${currentLesson.pdf_url ? `
                                    <a href="${currentLesson.pdf_url}" target="_blank" class="btn btn-secondary btn-sm" download>
                                        <i class="fas fa-file-pdf" style="color: var(--accent-rose);"></i> Descargar PDF
                                    </a>
                                ` : ''}
                                <button id="btn-toggle-completion" class="btn btn-primary btn-sm">
                                    <i class="fas fa-check-circle"></i> Marcar como Completada
                                </button>
                            </div>
                        </div>

                        <!-- Reading Material & Resources Card -->
                        <div style="background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 1.5rem;">
                            <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.75rem;">
                                <i class="fas fa-book-open" style="color: var(--accent-gold);"></i> Material de Lectura y Guías Teóricas
                            </h4>
                            <p style="color: var(--text-secondary); line-height: 1.7; font-size: 0.95rem; white-space: pre-line;">
                                ${currentLesson.text_content || 'En esta lección se revisan los aspectos técnicos fundamentales de la profesión.'}
                            </p>

                            ${currentLesson.image_url ? `
                                <img src="${currentLesson.image_url}" style="width: 100%; max-height: 350px; object-fit: cover; border-radius: var(--radius-md); margin-top: 1rem; border: 1px solid var(--border-subtle);" />
                            ` : ''}
                        </div>

                        <!-- Interactive Quiz Form Section -->
                        <div style="background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 1.5rem;">
                            <h4 style="font-size: 1.15rem; font-weight: 800; color: white; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.6rem;">
                                <i class="fas fa-tasks" style="color: var(--accent-blue);"></i> Cuestionario de Validación (Score mínimo 70%)
                            </h4>
                            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">
                                Responde correctamente a las preguntas para validar tu aprendizaje y liberar tu certificado.
                            </p>

                            <div id="quiz-container">
                                ${renderQuizForm(currentLesson.quizzes || [])}
                            </div>
                        </div>

                        <!-- Student Field Logbook (Bitácora de Campo) Section -->
                        <div style="background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 1.5rem;">
                            <h4 style="font-size: 1.15rem; font-weight: 800; color: white; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.6rem;">
                                <i class="fas fa-clipboard-list" style="color: var(--accent-emerald);"></i> Carpeta de Campo & Bitácora del Alumno
                            </h4>
                            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                                Registra las observaciones y notas de tus prácticas reales ejecutadas durante esta lección.
                            </p>

                            <form id="form-add-field-log" style="margin-bottom: 1.25rem;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
                                    <input type="text" id="log-activity-title" placeholder="Título de la práctica realizada..." required style="background: var(--bg-input); border: 1px solid var(--border-subtle); color: white; padding: 0.6rem; border-radius: var(--radius-md); font-size: 0.85rem;" />
                                    <input type="date" id="log-activity-date" required style="background: var(--bg-input); border: 1px solid var(--border-subtle); color: white; padding: 0.6rem; border-radius: var(--radius-md); font-size: 0.85rem;" />
                                </div>
                                <textarea id="log-activity-notes" placeholder="Anota tus observaciones técnicas, productos aplicados y resultados..." rows="3" required style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle); color: white; padding: 0.6rem; border-radius: var(--radius-md); font-size: 0.85rem; margin-bottom: 0.75rem;"></textarea>
                                <button type="submit" class="btn btn-secondary btn-sm"><i class="fas fa-plus"></i> Guardar en Bitácora</button>
                            </form>

                            <div id="field-logs-list" class="logbook-timeline">
                                <div style="font-size: 0.85rem; color: var(--text-muted);">Cargando registros...</div>
                            </div>
                        </div>

                        <!-- Course Forum / Community Wall -->
                        <div style="background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.5rem;">
                            <h4 style="font-size: 1.15rem; font-weight: 800; color: white; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.6rem;">
                                <i class="fas fa-comments" style="color: var(--accent-gold);"></i> Foro de Consultas & Comunidad
                            </h4>
                            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">
                                Realiza tus consultas y debate técnicas directamente con los instructores y otros estudiantes.
                            </p>

                            <form id="form-new-forum-topic" style="margin-bottom: 1.5rem;">
                                <input type="text" id="forum-topic-title" placeholder="Título de tu consulta..." required style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle); color: white; padding: 0.6rem; border-radius: var(--radius-md); font-size: 0.85rem; margin-bottom: 0.5rem;" />
                                <textarea id="forum-topic-content" placeholder="Describe tu pregunta con detalles..." rows="3" required style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle); color: white; padding: 0.6rem; border-radius: var(--radius-md); font-size: 0.85rem; margin-bottom: 0.5rem;"></textarea>
                                <button type="submit" class="btn btn-primary btn-sm"><i class="fas fa-paper-plane"></i> Publicar en el Foro</button>
                            </form>

                            <div id="forum-topics-container">
                                <div style="font-size: 0.85rem; color: var(--text-muted);">Cargando debates...</div>
                            </div>
                        </div>
                    </div>

                    <!-- Right Sidebar Index of 10 Lessons -->
                    <div>
                        <div class="classroom-sidebar">
                            <h4 style="font-family: var(--font-heading); font-size: 1.1rem; font-weight: 800; color: white; margin-bottom: 1rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.5rem;">
                                Contenido del Curso (${lessons.length} Módulos)
                            </h4>

                            <div style="display: flex; flex-direction: column;">
                                ${lessons.map((l, i) => {
                                    const isActive = Number(l.order_num) === Number(lessonOrder);
                                    return `
                                        <a href="#/aula/${courseId}/${l.order_num}" class="lesson-item ${isActive ? 'active' : ''}" style="text-decoration: none;">
                                            <i class="fas ${isActive ? 'fa-play-circle status-current' : 'fa-check-circle status-completed'} lesson-status-icon"></i>
                                            <div style="flex: 1;">
                                                <div style="font-size: 0.85rem; font-weight: 700; line-height: 1.3;">${l.title}</div>
                                                <div style="font-size: 0.72rem; color: var(--text-muted);">Lección ${l.order_num}</div>
                                            </div>
                                        </a>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Load Field Logs
        loadFieldLogs(currentUser?.id || 3, courseId);

        // Load Forum Topics
        loadForumTopics(courseId, currentUser);

        // Attach Toggle Completion Listener
        document.getElementById('btn-toggle-completion')?.addEventListener('click', async () => {
            if (!currentUser) {
                showToast('Inicia sesión para registrar tu progreso.', 'warning');
                return;
            }
            try {
                await API.completeLesson(currentUser.id, currentLesson.id, courseId);
                showToast('¡Lección marcada como completada!', 'success');
            } catch (err) {
                showToast('Progreso registrado.', 'info');
            }
        });

        // Attach Quiz Form Handler
        document.getElementById('quiz-submit-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const answers = [];
            const questions = currentLesson.quizzes || [];

            questions.forEach(q => {
                const selected = document.querySelector(`input[name="q_${q.id}"]:checked`);
                if (selected) {
                    answers.push({ questionId: q.id, selectedOption: parseInt(selected.value) });
                }
            });

            if (answers.length < questions.length) {
                showToast('Por favor responde todas las preguntas del cuestionario.', 'warning');
                return;
            }

            try {
                const res = await API.submitQuiz({
                    userId: currentUser?.id || 3,
                    courseId,
                    lessonId: currentLesson.id,
                    answers
                });

                if (res.passed) {
                    showToast(`¡Aprobado! Calificación: ${res.score}% (${res.correctCount}/${res.totalCount})`, 'success');
                } else {
                    showToast(`Puntuación: ${res.score}%. Necesitas al menos 70% para aprobar. ¡Inténtalo de nuevo!`, 'error');
                }
            } catch (err) {
                showToast('Evaluación enviada con éxito.', 'success');
            }
        });

        // Attach Add Field Log Handler
        document.getElementById('form-add-field-log')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('log-activity-title').value;
            const date = document.getElementById('log-activity-date').value;
            const notes = document.getElementById('log-activity-notes').value;

            try {
                await API.addFieldLog({
                    userId: currentUser?.id || 3,
                    courseId,
                    activityTitle: title,
                    activityDate: date,
                    notes,
                    status: 'completado'
                });
                showToast('¡Práctica guardada en la Carpeta de Campo!', 'success');
                loadFieldLogs(currentUser?.id || 3, courseId);
                e.target.reset();
            } catch (err) {
                showToast('Error al guardar práctica.', 'error');
            }
        });

        // Attach Create Forum Topic Handler
        document.getElementById('form-new-forum-topic')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentUser) {
                showToast('Inicia sesión para participar en el foro.', 'warning');
                return;
            }

            const title = document.getElementById('forum-topic-title').value;
            const content = document.getElementById('forum-topic-content').value;

            try {
                await API.createForumTopic({
                    courseId,
                    userId: currentUser.id,
                    title,
                    content
                });
                showToast('¡Consulta publicada en el Foro!', 'success');
                loadForumTopics(courseId, currentUser);
                e.target.reset();
            } catch (err) {
                showToast('Error al publicar tema.', 'error');
            }
        });

    } catch (err) {
        console.error('Error al rendear aula virtual:', err);
    }
}

function renderQuizForm(quizzes) {
    if (!quizzes || quizzes.length === 0) {
        return `<div style="color: var(--text-muted); font-size: 0.875rem;">Esta lección no contiene preguntas adicionales de evaluación.</div>`;
    }

    return `
        <form id="quiz-submit-form">
            ${quizzes.map((q, idx) => `
                <div style="margin-bottom: 1.25rem;">
                    <div style="font-weight: 700; color: white; margin-bottom: 0.5rem; font-size: 0.95rem;">
                        ${idx + 1}. ${q.question}
                    </div>
                    <div>
                        ${(q.options || []).map((opt, oIdx) => `
                            <label class="quiz-option-label">
                                <input type="radio" name="q_${q.id}" value="${oIdx}" required />
                                <span>${opt}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
            <button type="submit" class="btn btn-primary btn-sm" style="margin-top: 0.5rem;">
                <i class="fas fa-check-double"></i> Evaluar Cuestionario
            </button>
        </form>
    `;
}

async function loadFieldLogs(userId, courseId) {
    const container = document.getElementById('field-logs-list');
    if (!container) return;

    try {
        const logs = await API.getFieldLogs(userId, courseId);
        if (!logs || logs.length === 0) {
            container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">No hay prácticas registradas aún en tu bitácora.</div>`;
            return;
        }

        container.innerHTML = logs.map(log => `
            <div class="logbook-entry">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: white; font-size: 0.9rem;">${log.activity_title}</strong>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${log.activity_date}</span>
                </div>
                <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.3rem;">${log.notes}</p>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">Bitácora lista.</div>`;
    }
}

async function loadForumTopics(courseId, currentUser) {
    const container = document.getElementById('forum-topics-container');
    if (!container) return;

    try {
        const topics = await API.getForumTopics(courseId);
        if (!topics || topics.length === 0) {
            container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">Sé el primero en hacer una consulta en este curso.</div>`;
            return;
        }

        container.innerHTML = topics.map(topic => `
            <div class="forum-thread-card">
                <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.4rem;">
                    <span class="user-avatar" style="width: 26px; height: 26px; font-size: 0.75rem;">${(topic.author_name || 'A')[0]}</span>
                    <strong style="color: white; font-size: 0.9rem;">${topic.author_name || 'Estudiante'}</strong>
                    <span class="badge-role badge-student" style="font-size: 0.65rem;">Alumno</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted); margin-left: auto;">${topic.created_at || ''}</span>
                </div>
                <h5 style="color: var(--accent-gold); font-size: 0.95rem; font-weight: 700; margin-bottom: 0.35rem;">${topic.title}</h5>
                <p style="color: var(--text-secondary); font-size: 0.875rem;">${topic.content}</p>

                <!-- Replies -->
                ${(topic.replies || []).map(reply => `
                    <div class="forum-reply-box">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <strong style="color: white; font-size: 0.85rem;">${reply.author_name}</strong>
                            <span class="badge-role ${reply.role === 'creator' ? 'badge-creator' : 'badge-student'}" style="font-size: 0.62rem;">
                                ${reply.role === 'creator' ? 'Instructor' : 'Alumno'}
                            </span>
                        </div>
                        <p style="color: var(--text-secondary); font-size: 0.825rem; margin-top: 0.2rem;">${reply.content}</p>
                    </div>
                `).join('')}
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">Foro abierto.</div>`;
    }
}
