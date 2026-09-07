/* ==========================================================================
   CursosMi - Main Application Entry & Hash Router (ES Modules)
   ========================================================================== */

import { renderHome, filterAndRenderGrid } from './views/home.js';
import { renderCourseDetail } from './views/courseDetail.js';
import { renderClassroom } from './views/classroom.js';
import { renderDashboard } from './views/dashboard.js';
import { renderAdminPanel } from './views/admin.js';
import { renderPaymentFeedback } from './views/paymentFeedback.js';

// Central State Store
class AppState {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('cursosmi_user') || 'null');
        this.searchQuery = '';
    }

    setUser(user) {
        this.currentUser = user;
        if (user) {
            localStorage.setItem('cursosmi_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('cursosmi_user');
        }
        this.updateNavbarUser();
    }

    updateNavbarUser() {
        const userContainer = document.getElementById('navbar-user-area');
        if (!userContainer) return;

        if (this.currentUser) {
            userContainer.innerHTML = `
                <a href="#/dashboard" class="user-profile-btn" style="text-decoration: none;">
                    <div class="user-avatar">${(this.currentUser.nombre || 'U')[0]}</div>
                    <span style="font-weight: 600; font-size: 0.85rem;">${this.currentUser.nombre}</span>
                    <span class="badge-role badge-${this.currentUser.role}" style="font-size: 0.65rem;">
                        ${this.currentUser.role}
                    </span>
                </a>
            `;
        } else {
            userContainer.innerHTML = `
                <a href="#/dashboard" class="btn btn-primary btn-sm">
                    <i class="fas fa-sign-in-alt"></i> Iniciar Sesión / Registrarse
                </a>
            `;
        }
    }
}

export const store = new AppState();

// SPA Client-Side Hash Router
async function router() {
    const hash = window.location.hash || '#/';
    const viewContainer = document.getElementById('app-view');
    if (!viewContainer) return;

    // Real-Time Search Handler
    const searchInput = document.getElementById('navbar-search-input');
    if (searchInput) {
        searchInput.oninput = (e) => {
            store.searchQuery = e.target.value;
            if (hash === '#/' || hash === '') {
                filterAndRenderGrid(store.searchQuery);
            }
        };
    }

    // Match Hash Routes & Payment Returns
    const searchParams = new URLSearchParams(window.location.search);
    const hasMPReturnParams = searchParams.has('collection_status') || searchParams.has('payment_id') || searchParams.has('status');

    if (hash.startsWith('#/payment/') || hasMPReturnParams) {
        await renderPaymentFeedback(viewContainer, store.currentUser);
    } else if (hash === '#/' || hash === '') {
        await renderHome(viewContainer, store.searchQuery);
    } else if (hash.startsWith('#/curso/')) {
        const courseId = hash.split('/')[2];
        await renderCourseDetail(viewContainer, courseId, store.currentUser);
    } else if (hash.startsWith('#/aula/')) {
        const parts = hash.split('/');
        const courseId = parts[2];
        const lessonOrder = parts[3] || 1;
        await renderClassroom(viewContainer, courseId, lessonOrder, store.currentUser);
    } else if (hash === '#/dashboard') {
        await renderDashboard(viewContainer, store.currentUser);
    } else if (hash === '#/admin') {
        await renderAdminPanel(viewContainer, store.currentUser);
    } else {
        await renderHome(viewContainer, store.searchQuery);
    }

    // Scroll to top on navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    store.updateNavbarUser();
    router();

    window.addEventListener('hashchange', router);
});
