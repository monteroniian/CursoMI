/* ==========================================================================
   CursosMi - API Client Service Module
   ========================================================================== */

const API_BASE = '/api';

export const API = {
    // Auth & Session
    async login(emailOrDni, password) {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailOrDni, password })
        });
        return await res.json();
    },

    async register(data) {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },

    // Courses & Detail
    async getCourses() {
        const res = await fetch(`${API_BASE}/courses?t=${Date.now()}`);
        const data = await res.json();
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.courses)) return data.courses;
        return [];
    },

    async getCourseDetail(courseId) {
        const res = await fetch(`${API_BASE}/courses/${courseId}?t=${Date.now()}`);
        return await res.json();
    },

    async getLessonDetail(lessonId) {
        const res = await fetch(`${API_BASE}/lessons/${lessonId}?t=${Date.now()}`);
        return await res.json();
    },

    // Quizzes & Progress
    async submitQuiz(data) {
        const res = await fetch(`${API_BASE}/quizzes/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },

    async completeLesson(userId, lessonId, courseId) {
        const res = await fetch(`${API_BASE}/lessons/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, lessonId, courseId })
        });
        return await res.json();
    },

    // Student Field Logbook
    async getFieldLogs(userId, courseId) {
        const res = await fetch(`${API_BASE}/field-logs?userId=${userId}&courseId=${courseId}&t=${Date.now()}`);
        return await res.json();
    },

    async addFieldLog(data) {
        const res = await fetch(`${API_BASE}/field-logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },

    // Course Forum & Community
    async getForumTopics(courseId) {
        const res = await fetch(`${API_BASE}/forum/topics/${courseId}?t=${Date.now()}`);
        return await res.json();
    },

    async createForumTopic(data) {
        const res = await fetch(`${API_BASE}/forum/topics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },

    async replyForumTopic(data) {
        const res = await fetch(`${API_BASE}/forum/replies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },

    // Course Reviews & Ratings
    async addCourseReview(data) {
        const res = await fetch(`${API_BASE}/courses/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },

    // Checkout & Payment Submission
    async uploadPayment(data) {
        const res = await fetch(`${API_BASE}/payments/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },

    // Mercado Pago API Checkout Pro Methods
    async getMPPublicKey() {
        const res = await fetch(`${API_BASE}/payments/mercadopago/public-key?t=${Date.now()}`);
        return await res.json();
    },

    async createMPPreference(courseId, userId) {
        const res = await fetch(`${API_BASE}/payments/mercadopago/create-preference`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId, userId })
        });
        return await res.json();
    },

    async confirmMPPayment(data) {
        const res = await fetch(`${API_BASE}/payments/mercadopago/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },

    // Mercado Pago Webhook Simulator
    async simulateMPWebhook(paymentId) {
        const res = await fetch(`${API_BASE}/payments/webhook-mp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_id: paymentId, status: 'approved' })
        });
        return await res.json();
    },

    // Student Dashboard & Certificates
    async getStudentDashboard(userId) {
        const res = await fetch(`${API_BASE}/student/dashboard/${userId}?t=${Date.now()}`);
        return await res.json();
    },

    async getCertificates(userId) {
        const res = await fetch(`${API_BASE}/certificates/${userId}?t=${Date.now()}`);
        return await res.json();
    },

    // Admin & Creator Audits
    async getAdminAudit() {
        const res = await fetch(`${API_BASE}/admin/audit?t=${Date.now()}`);
        return await res.json();
    },

    async approvePayment(paymentId, adminId) {
        const res = await fetch(`${API_BASE}/admin/payments/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_id: paymentId, paymentId, action: 'approve' })
        });
        return await res.json();
    },

    async rejectPayment(paymentId, adminId) {
        const res = await fetch(`${API_BASE}/admin/payments/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_id: paymentId, paymentId, action: 'reject' })
        });
        return await res.json();
    },

    async updateUserRole(userId, newRole) {
        const res = await fetch(`${API_BASE}/admin/users/role`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, newRole })
        });
        return await res.json();
    },

    async createCourse(data) {
        const res = await fetch(`${API_BASE}/creator/courses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    }
};
