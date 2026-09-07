require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mailer = require('./mailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar Helmet para cabeceras HTTP seguras
app.use(helmet({
    contentSecurityPolicy: false // Permitir embeds de YouTube y fuentes externas
}));

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static(path.join(__dirname, './')));

// Rate Limiter para prevenir ataques de fuerza bruta en login/register
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 20, // Máximo 20 intentos por IP
    message: { error: 'Demasiados intentos de inicio de sesión. Por favor reintenta en 15 minutos.' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Directorio de cargas estáticas para imágenes de comprobantes
const uploadsDir = process.env.UPLOADS_PATH || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Sanitización XSS simple
function sanitizeString(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Inicializar la base de datos SQLite (con soporte para disco persistente en Render)
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database.sqlite');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al conectar con SQLite:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite:', dbPath);
    }
});

// Habilitar Foreign Keys y Crear Tablas
db.serialize(() => {
    db.run(`PRAGMA foreign_keys = OFF;`);

    // 1. Tabla Usuarios
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        dni TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'student',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. Tabla Sesiones
    db.run(`CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

    // 3. Tabla Cursos
    db.run(`CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        skills TEXT,
        has_certificate INTEGER DEFAULT 1,
        price REAL NOT NULL,
        mp_alias TEXT NOT NULL,
        payment_info TEXT,
        banner_url TEXT,
        primary_color TEXT DEFAULT '#4f46e5',
        creator_id INTEGER NOT NULL,
        onboarding_video TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

    // 4. Tabla Lecciones
    db.run(`CREATE TABLE IF NOT EXISTS lessons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        order_num INTEGER NOT NULL,
        video_url TEXT,
        text_content TEXT,
        image_url TEXT,
        pdf_url TEXT,
        resources TEXT,
        FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
    )`);

    // Intentar agregar columnas si la base de datos ya existía previamente
    db.run(`ALTER TABLE courses ADD COLUMN onboarding_video TEXT`, () => {});
    db.run(`ALTER TABLE lessons ADD COLUMN pdf_url TEXT`, () => {});
    db.run(`ALTER TABLE lessons ADD COLUMN resources TEXT`, () => {});

    // 5. Tabla Lecciones Completadas por Alumno
    db.run(`CREATE TABLE IF NOT EXISTS lesson_completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        lesson_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, lesson_id),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
    )`);

    // 6. Tabla Cuestionarios / Exámenes (quiz_questions)
    db.run(`CREATE TABLE IF NOT EXISTS quiz_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lesson_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        question TEXT NOT NULL,
        options TEXT NOT NULL,
        correct_option INTEGER NOT NULL,
        FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
    )`);

    // 7. Tabla Envíos de Cuestionarios (quiz_submissions)
    db.run(`CREATE TABLE IF NOT EXISTS quiz_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        lesson_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        passed INTEGER DEFAULT 0,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
    )`);

    // 8. Tabla Carpeta de Campo (field_logs)
    db.run(`CREATE TABLE IF NOT EXISTS field_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        lesson_id INTEGER,
        activity_title TEXT NOT NULL,
        notes TEXT,
        activity_date TEXT,
        status TEXT DEFAULT 'completado',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
    )`);

    // 9. Tabla Foro de Consultas - Temas (forum_topics)
    db.run(`CREATE TABLE IF NOT EXISTS forum_topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

    // 10. Tabla Foro - Respuestas (forum_replies)
    db.run(`CREATE TABLE IF NOT EXISTS forum_replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (topic_id) REFERENCES forum_topics (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

    // 11. Tabla Inscripciones (enrollments)
    db.run(`CREATE TABLE IF NOT EXISTS enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, course_id),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
    )`);

    // 12. Tabla Pagos (payments)
    db.run(`CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        enrollment_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        receipt_ref TEXT NOT NULL,
        receipt_image TEXT,
        amount REAL,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
    )`);

    // 13. Tabla Notificaciones
    db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        type TEXT DEFAULT 'info',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

    // 14. Tabla Certificados Expedidos
    db.run(`CREATE TABLE IF NOT EXISTS certificates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        cert_code TEXT UNIQUE NOT NULL,
        issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
    )`);

    // 15. Tabla Reseñas y Valoraciones (reviews)
    db.run(`CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        rating INTEGER DEFAULT 5,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

    // Sembrar Usuarios Iniciales (Admin, Creador/Instructor, Alumno) de forma totalmente secuencial
    const defaultPasswordHash = bcrypt.hashSync('123456789123', 8);

    db.run(`INSERT OR IGNORE INTO users (id, nombre, apellido, dni, email, password, role) 
            VALUES (1, 'Administrador', 'Sistema', '00000000', 'ADMIN', ?, 'admin')`, [defaultPasswordHash], () => {
        db.run(`INSERT OR IGNORE INTO users (id, nombre, apellido, dni, email, password, role) 
                VALUES (2, 'Marcos', 'Barber', '11111111', 'creador@cursosmi.com', ?, 'creator')`, [defaultPasswordHash], () => {
            db.run(`INSERT OR IGNORE INTO users (id, nombre, apellido, dni, email, password, role) 
                    VALUES (3, 'Carlos', 'Estudiante', '22222222', 'alumno@cursosmi.com', ?, 'student')`, [defaultPasswordHash], () => {

                // Sembrar o Actualizar Curso Insignia con id 1 de Barbería
                db.run(`INSERT OR IGNORE INTO courses (id, title, category, skills, has_certificate, price, mp_alias, payment_info, banner_url, primary_color, creator_id, onboarding_video)
                        VALUES (1, 'Curso Profesional de Barbería & Fade Mastery (10 Módulos)', 'Barbería y Estética', 'Corte con Navaja, Degradados Fade, Arreglo de Barba, Visagismo, Bioseguridad', 1, 18500.00, 'ianmonteroni', 'Transferir al Alias Mercado Pago: ianmonteroni | Titular: Ian Monteroni.', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80', '#e11d48', 2, 'videos/1.mov')`, () => {

                    db.run(`UPDATE courses SET title = 'Curso Profesional de Barbería & Fade Mastery (10 Módulos)', category = 'Barbería y Estética', skills = 'Corte con Navaja, Degradados Fade, Arreglo de Barba, Visagismo, Bioseguridad', price = 18500.00, mp_alias = 'ianmonteroni', payment_info = 'Transferir al Alias Mercado Pago: ianmonteroni | Titular: Ian Monteroni.', banner_url = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80', onboarding_video = 'videos/1.mov' WHERE id = 1`);
                    db.run(`DELETE FROM courses WHERE id > 1`);

                    const courseId = 1;
                    const creatorId = 2;
                    const studentId = 3;
                    const tenLessonsData = [
                        {
                            title: 'Módulo I: Introducción a la Barbería, Bioseguridad y Herramientas',
                            order: 1,
                            video: 'videos/1.mov',
                            text: 'TRANSCRIPCIÓN COMPLETA DE VIDEO 1:\n\nBienvenido a la Lección 1 del Curso Profesional de Barbería. En este video aprenderás el protocolo sanitario completo y la desinfección de herramientas de corte. \n\n1. Bioseguridad y Sanitización:\n- Utilizar amonio cuaternario o spray antiséptico sobre las cuchillas de las clippers y trimmers antes y después de cada cliente.\n- Lubricación: Aplicar 3 gotas de aceite especial para máquinas en los puntos de contacto para evitar el desgaste y calentamiento.\n\n2. Identificación de Herramientas:\n- Clippers (Máquinas de corte principal) con palanca de ajuste (abierta/cerrada).\n- Trimmers o Patilleras para marcar líneas de contorno y patillas.\n- Peines de alza (Guías desde 0.5 hasta la #4).\n- Navaja barbera con hoja desechable de un solo uso.',
                            image: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80',
                            pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                            resources: [{ name: 'Guía de Bioseguridad y Desinfección PDF', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }],
                            quiz: [
                                { q: '¿Qué producto es recomendado para desinfectar las máquinas de corte entre clientes?', opts: ['Agua tibia únicamente', 'Spray sanitizante antiséptico / Amonio Cuaternario', 'Jabón en barra', 'Alcohol etílico diluido en aceite'], correct: 1 },
                                { q: '¿Cuál es la función principal de la trimmer o patillera?', opts: ['Realizar degradados altos', 'Marcar contornos, patillas y líneas de precisión', 'Lavar el cabello', 'Desinfectar la navaja'], correct: 1 }
                            ]
                        },
                        {
                            title: 'Clase 2: Visagismo, Morfología Craneal y Diagnóstico del Cliente',
                            order: 2,
                            video: 'videos/2.mov',
                            text: 'TRANSCRIPCIÓN COMPLETA DE VIDEO 2:\n\nEn esta lección abordamos la técnica de visagismo y análisis de la estructura del rostro.\n\n1. Morfología Craneal:\n- Identificar remolinos en la corona y dirección natural de nacimiento del cabello.\n- Adaptar la altura del degradado según el tipo de rostro (Ovalado, Cuadrado, Redondo, Diamante).\n\n2. Diagnóstico Previo al Corte:\n- Conversar con el cliente sobre sus hábitos de peinado y tipo de producto que utiliza en su rutina diaria.\n- Inspeccionar el cuero cabelludo antes de pasar la navaja o máquinas cortadoras.',
                            image: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=800&q=80',
                            pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                            resources: [{ name: 'Manual de Visagismo y Rostros PDF', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }],
                            quiz: [
                                { q: '¿Qué tipo de corte favorece a un rostro de forma redonda?', opts: ['Corte muy plano en la corona', 'Corte con volumen superior para alargar la figura', 'Rapado total', 'Flequillo muy largo'], correct: 1 }
                            ]
                        },
                        {
                            title: 'Clase 3: Técnica de Degradado Low Fade (Paso a Paso)',
                            order: 3,
                            video: 'videos/3.mov',
                            text: 'TRANSCRIPCIÓN COMPLETA DE VIDEO 3:\n\nTécnica práctica paso a paso para ejecutar un Low Fade limpio y uniforme.\n\n1. Marcación de la Primera Línea Guía:\n- Usar la palanca cerrada al 0 para trazar la línea inicial justo por encima de las patillas y la nuca baja.\n\n2. Creación del Espacio de Sombra:\n- Elevar 1 centímetro con la palanca abierta (0.5).\n- Pasar la guía #1 palanca cerrada y luego abierta.\n\n3. Cuchareo (C-Stroke):\n- Realizar el movimiento de cuchareo con la muñeca hacia afuera al llegar al tope de cada sección para no marcar líneas duras.',
                            image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
                            pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                            resources: [{ name: 'Diagrama de Guías para Low Fade PDF', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }],
                            quiz: [
                                { q: '¿Dónde se ubica la línea guía inicial en un Low Fade?', opts: ['A la mitad del cráneo', 'Cerca de la patilla y nuca baja', 'Arriba de las orejas únicamente', 'En la zona superior'], correct: 1 }
                            ]
                        },
                        {
                            title: 'Clase 4: Mid Fade & Conexión con Tijeras sobre Peine',
                            order: 4,
                            video: 'videos/4.mov',
                            text: 'TRANSCRIPCIÓN COMPLETA DE VIDEO 4:\n\nDemostración de degradado a media altura (Mid Fade) y técnicas de unión con tijera.\n\n1. Posicionamiento del Mid Fade:\n- Elevar la zona de sombra a la altura de la sien y hueso occipital.\n\n2. Conexión Tijera Sobre Peine (Clipper-Over-Comb):\n- Sostener el peine en ángulo de 45 grados retirando el exceso de volumen de la corona.\n- Utilizar tijeras de corte filo dulce para integrar los laterales con la parte superior de forma fluida.',
                            image: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80',
                            pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                            resources: [{ name: 'Guía de Conexión Tijera-Peine PDF', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }],
                            quiz: [
                                { q: '¿Cuál es el ángulo del peine en la técnica de tijera sobre peine para conectar volumen?', opts: ['Completamente pegado al cuero cabelludo', 'Ligeramente inclinado hacia afuera', 'Vertical a 90 grados', 'Horizontal invertido'], correct: 1 }
                            ]
                        },
                        {
                            title: 'Clase 5: High Fade & Skin Fade Extremo con Shaver',
                            order: 5,
                            video: 'videos/5.mov',
                            text: 'TRANSCRIPCIÓN COMPLETA DE VIDEO 5:\n\nTécnica de degradado alto y rasurado a cero total con la Shaver.\n\n1. High Fade:\n- La sombra inicia en la parte alta del lateral, generando un contraste intenso.\n\n2. Uso de la Máquina Rasuradora (Shaver):\n- Previamente pasar la trimmer al ras.\n- Pasar la shaver con toques suaves de abajo hacia arriba sin ejercer presión excesiva para no irritate la dermis.',
                            image: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=800&q=80',
                            pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                            resources: [{ name: 'Manual de Uso y Limpieza de Shaver PDF', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }],
                            quiz: [
                                { q: '¿Qué precaución se debe tener con la máquina Shaver?', opts: ['Presionar con mucha fuerza', 'Usarla sobre cabello largo', 'Pasarla sobre piel limpia y corta a favor/contra pelo suavemente', 'No limpiarla'], correct: 2 }
                            ]
                        },
                        {
                            title: 'Clase 6: Ritual de Arreglo de Barba, Toalla Caliente y Navaja',
                            order: 6,
                            video: 'videos/6.mov',
                            text: 'TRANSCRIPCIÓN COMPLETA DE VIDEO 6:\n\nServicio Premium de perfilado y toalla caliente para barba.\n\n1. Preparación de la Piel:\n- Aplicar aceite pre-afeitado y colocar la toalla caliente durante 2 minutos para abrir poros e hidrata el vello facial.\n\n2. Perfilado con Navaja:\n- Estirar la piel con la mano libre e inclinar la navaja a 30 grados marcando los contornos del pómulo y cuello.\n- Finalizar con toalla fría y bálsamo aftershave refrescante.',
                            image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
                            pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                            resources: [{ name: 'Protocolo de Toalla Caliente & Barba PDF', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }],
                            quiz: [
                                { q: '¿A cuántos grados se debe inclinar la hoja de la navaja sobre la piel?', opts: ['90 grados', '45 grados', 'Aproximadamente 30 grados', '0 grados pegada plano'], correct: 2 }
                            ]
                        },
                        {
                            title: 'Clase 7: Texturizado Top, Tijera de Entresacar y Styling',
                            order: 7,
                            video: 'videos/7.mov',
                            text: 'TRANSCRIPCIÓN COMPLETA DE VIDEO 7:\n\nTécnicas de esculpido en la zona superior y acabado final.\n\n1. Point Cutting & Entresacado:\n- Cortar en puntas con la tijera vertical para aportar textura despeinada.\n- Usar la tijera de pulir únicamente en las zonas densas a mitad de hebra.\n\n2. Productos de Styling:\n- Polvos de volumen mate para cabellos finos.\n- Pomada de fijación fuerte para peinados clásicos con brillo moderado.',
                            image: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80',
                            pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                            resources: [{ name: 'Guía de Productos de Styling PDF', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }],
                            quiz: [
                                { q: '¿Para qué sirve la tijera de pulir o entresacar?', opts: ['Para afeitar la nuca', 'Para quitar peso y dar textura sin perder largo', 'Para cortar líneas rectas', 'Para desinfectar'], correct: 1 }
                            ]
                        },
                        {
                            title: 'Clase 8: Tratamientos Capilares, Exfoliación y Lavado Profesional',
                            order: 8,
                            video: 'videos/8.mov',
                            text: 'TRANSCRIPCIÓN COMPLETA DE VIDEO 8:\n\nProtocolo de lavado de cabeza y masajes relajantes post-corte.\n\n1. Lavado en Lavacabezas:\n- Regular la temperatura del agua. Aplicar champú neutro de limpieza profunda.\n\n2. Masaje Capilar Estimulante:\n- Ejercer presión circular con las yemas de los dedos sobre las sienes y la base del cuello para activar el torrente sanguíneo.',
                            image: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=800&q=80',
                            pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                            resources: [{ name: 'Recetario de Masajes Capilares PDF', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }],
                            quiz: [
                                { q: '¿Qué beneficio aporta el masaje capilar durante el lavado?', opts: ['Remueve el tinte', 'Estimula la circulación y relaja al cliente', 'Riza el cabello', 'Cambia el color del pelo'], correct: 1 }
                            ]
                        },
                        {
                            title: 'Clase 9: Marketing para Barberos, Fotografía y Gestión de Turnos',
                            order: 9,
                            video: 'videos/9.mov',
                            text: 'TRANSCRIPCIÓN COMPLETA DE VIDEO 9:\n\nEstrategias para impulsar tu barbería y captar clientes en redes sociales.\n\n1. Fotografía de Cortes:\n- Utilizar aro de luz a 45 grados de frente para destacar las sombras del degradado.\n- Limpiar bien el cuello del cliente antes de disparar la foto.\n\n2. Fidelización & Turnos:\n- Administrar agendas de turnos online y calcular costos de insumos para fijar precios competitivos.',
                            image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
                            pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                            resources: [{ name: 'Plantilla de Cálculo de Tarifas Barbería PDF', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }],
                            quiz: [
                                { q: '¿Cuál es la mejor iluminación para fotografiar un degradado?', opts: ['Luz trasera directa', 'Aro de luz frontal o luz natural indirecta', 'Oscuridad total con flash', 'Luz roja'], correct: 1 }
                            ]
                        },
                        {
                            title: 'Clase 10: Proyecto Práctico Final & Evaluación para Certificación',
                            order: 10,
                            video: 'videos/10.mov',
                            text: 'TRANSCRIPCIÓN COMPLETA DE VIDEO 10:\n\nDemostración práctica integradora final de un corte completo Fade con barba sobre modelo real.\n\n1. Evaluación de Criterios:\n- Bioseguridad inicial, diagnóstico de rostro, simetría del degradado lateral, líneas de contorno y ritual de barba.\n\n2. Diploma Oficial CursosMi:\n- Al completar el cuestionario final con score igual o superior al 70%, se liberará automáticamente tu Certificado Digital con QR único.',
                            image: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80',
                            pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                                                        quiz: [
                                { q: '¿Qué requisito es necesario para obtener el Diploma de Barbería?', opts: ['Hacer un pago extra', 'Completar el 100% de las 10 lecciones y aprobar los cuestionarios', 'Asistir presencialmente', 'Enviar una carta'], correct: 1 }
                            ]
                        }
                    ];

                    db.run(`DELETE FROM quiz_submissions WHERE course_id = 1`, () => {
                        db.run(`DELETE FROM quiz_questions WHERE course_id = 1`, () => {
                            db.run(`DELETE FROM lesson_completions WHERE course_id = 1`, () => {
                                db.run(`DELETE FROM lessons WHERE course_id = 1`, () => {

                                    tenLessonsData.forEach(item => {
                                        db.run(`INSERT INTO lessons (course_id, title, order_num, video_url, text_content, image_url, pdf_url, resources) 
                                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                                            courseId, item.title, item.order, item.video, item.text, item.image, item.pdf, JSON.stringify(item.resources)
                                        ], function (err) {
                                            if (!err) {
                                                const lessonId = this.lastID;
                                                item.quiz.forEach(q => {
                                                    db.run(`INSERT INTO quiz_questions (lesson_id, course_id, question, options, correct_option)
                                                            VALUES (?, ?, ?, ?, ?)`, [lessonId, courseId, q.q, JSON.stringify(q.opts), q.correct]);
                                                });
                                            }
                                        });
                                    });

                                    // Sembrar Reseñas
                                    db.run(`INSERT OR IGNORE INTO reviews (course_id, user_id, rating, comment) VALUES 
                                        (1, ?, 5, '¡El mejor curso de barbería de la web! Las 10 lecciones con quizzes y PDFs descargables son híper completas.')`, [studentId]);

                                    // Sembrar Foro de Consultas y Respuestas
                                    db.run(`INSERT INTO forum_topics (course_id, user_id, title, content) VALUES 
                                        (1, ?, '¿Qué marca de máquina clipper recomiendan para empezar?', 'Hola a todos, estoy por comprar mi primer kit y dudo entre Wahl Magic Clip o Wahl Legend. ¿Cuál sugieren?')`, [studentId], function (err) {
                                        if (!err) {
                                            const topicId = this.lastID;
                                            db.run(`INSERT INTO forum_replies (topic_id, user_id, content) VALUES 
                                                (?, ?, 'Hola Carlos! La Wahl Magic Clip Cordless es ideal para iniciar por su cuchilla escalonada que facilita borrar la línea del 0 en el degradado.')`, [topicId, creatorId]);
                                        }
                                    });

                                    // Sembrar Entrada en Carpeta de Campo del Estudiante
                                    db.run(`INSERT INTO field_logs (user_id, course_id, activity_title, notes, activity_date, status) VALUES 
                                        (?, 1, 'Práctica #1: Desinfección de Herramientas y Visagismo', 'Realicé el diagnóstico morfologico a un cliente de prueba. Rostro cuadrado, apliqué pomada mate.', '2026-08-17', 'completado')`, [studentId]);
                                });
                            });
                        });
                    });
                });
            });
        });
    });

            // Sembrar Segundo Curso (Programación) si no existe
            db.get(`SELECT COUNT(*) AS count FROM courses WHERE category = 'Programación y Tecnología'`, (err, row) => {
                if (row && row.count === 0) {
                    db.run(`INSERT INTO courses (title, category, skills, has_certificate, price, mp_alias, payment_info, banner_url, primary_color, creator_id, onboarding_video)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`, [
                        'Desarrollo Web Fullstack con JavaScript & Node.js',
                        'Programación y Tecnología',
                        'HTML5, CSS3, JavaScript Moderno, Node.js, Express, SQLite, Deployment',
                        1,
                        25000.00,
                        'programacion.web.mp',
                        'Alias Mercado Pago: programacion.web.mp | CBU 0000003100098765432100. Titular: NexLearn Tech.',
                        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
                        '#2563eb',
                        'https://www.youtube.com/embed/dQw4w9WgXcQ'
                    ], function (err) {
                        if (!err) {
                            const courseId = this.lastID;
                            db.run(`INSERT INTO lessons (course_id, title, order_num, video_url, text_content, image_url, pdf_url, resources) VALUES 
                                (?, 'Módulo 1: Fundamentos de Desarrollo Web y Arquitectura Client-Server', 1, 'https://www.youtube.com/embed/dQw4w9WgXcQ', 
                                 'El desarrollo web moderno separa la interfaz visible (Frontend) de la lógica del servidor (Backend) y almacenamiento en bases de datos.', 
                                 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
                                 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                                 '${JSON.stringify([{ name: 'Apunte Módulo 1 Node.js PDF', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }])}')`, [courseId], function (err) {
                                if (!err) {
                                    db.run(`INSERT INTO quiz_questions (lesson_id, course_id, question, options, correct_option) VALUES 
                                        (?, ?, '¿Qué lenguaje se ejecuta de forma nativa en el navegador cliente?', '["Python", "JavaScript", "Java", "C++"]', 1)`, [this.lastID, courseId]);
                                }
                            });

                            db.run(`INSERT INTO reviews (course_id, user_id, rating, comment) VALUES (?, 1, 5, 'Excelente curso fullstack. Explicaciones súper claras.')`, [courseId]);
                        }
                    });
                }
            });
    db.run(`PRAGMA foreign_keys = ON;`);
});

// Helper de Creación de Sesiones
function createSession(userId, callback) {
    const token = crypto.randomBytes(32).toString('hex');
    const query = `INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+30 days'))`;
    db.run(query, [userId, token], function (err) {
        if (err) return callback(err, null);
        callback(null, token);
    });
}

// Middleware para verificar Rol de Administrador
function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim() || req.query.token;

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }

    const query = `
        SELECT u.role 
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ? AND s.expires_at > datetime('now')
    `;
    db.get(query, [token], (err, row) => {
        if (err || !row || row.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de Administrador.' });
        }
        next();
    });
}

// ==========================================
// 1. ENDPOINTS DE AUTENTICACIÓN & ROLES
// ==========================================

app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim() || req.query.token;

    if (!token) {
        return res.status(401).json({ error: 'No se proporcionó token de sesión.' });
    }

    const query = `
        SELECT s.token, u.id, u.nombre, u.apellido, u.dni, u.email, u.role
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ? AND s.expires_at > datetime('now')
    `;
    db.get(query, [token], (err, row) => {
        if (err || !row) {
            return res.status(401).json({ error: 'Sesión inválida o expirada.' });
        }
        return res.json({
            user: {
                id: row.id,
                nombre: row.nombre,
                apellido: row.apellido,
                dni: row.dni,
                email: row.email,
                role: row.role
            },
            sessionToken: row.token
        });
    });
});

app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim() || req.body.sessionToken;
    if (token) {
        db.run(`DELETE FROM sessions WHERE token = ?`, [token]);
    }
    return res.json({ message: 'Sesión cerrada correctamente.' });
});

app.post('/api/auth/register', (req, res) => {
    const { nombre, apellido, dni, email, password, role } = req.body;

    if (!nombre || !apellido || !dni || !email || !password) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const cleanNombre = sanitizeString(nombre.trim());
    const cleanApellido = sanitizeString(apellido.trim());
    const cleanDni = sanitizeString(dni.trim());
    const cleanEmail = sanitizeString(email.trim().toLowerCase());
    const userRole = (role === 'creator' || role === 'admin') ? role : 'student';

    const hashedPassword = bcrypt.hashSync(password, 8);

    const query = `INSERT INTO users (nombre, apellido, dni, email, password, role) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(query, [cleanNombre, cleanApellido, cleanDni, cleanEmail, hashedPassword, userRole], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed: users.email')) {
                return res.status(400).json({ error: 'El Correo Electrónico ya está registrado.' });
            }
            if (err.message.includes('UNIQUE constraint failed: users.dni')) {
                return res.status(400).json({ error: 'El DNI ya está registrado.' });
            }
            return res.status(500).json({ error: 'Error al registrar usuario.' });
        }

        const userId = this.lastID;

        db.run(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`, [
            userId,
            '¡Bienvenido a CursosMi!',
            `Hola ${cleanNombre}, tu cuenta de ${userRole === 'creator' ? 'Creador/Instructor' : 'Estudiante'} ha sido creada. Explora la plataforma y comienza hoy.`,
            'welcome'
        ]);

        createSession(userId, (err, token) => {
            const user = { id: userId, nombre: cleanNombre, apellido: cleanApellido, dni: cleanDni, email: cleanEmail, role: userRole };
            return res.json({
                message: 'Registro exitoso',
                user,
                sessionToken: token
            });
        });
    });
});

app.post('/api/auth/login', (req, res) => {
    const { loginKey, password, termsAccepted } = req.body;

    if (!loginKey || !password) {
        return res.status(400).json({ error: 'Ingresa tu Email o DNI y la Contraseña.' });
    }

    if (loginKey === 'ADMIN' && password === '123456789123') {
        createSession(1, (err, token) => {
            const user = { id: 1, nombre: 'Administrador', apellido: 'Sistema', dni: '00000000', email: 'ADMIN', role: 'admin' };
            return res.json({
                message: 'Inicio de sesión como Administrador',
                user,
                sessionToken: token
            });
        });
        return;
    }

    if (!termsAccepted) {
        return res.status(400).json({ error: 'Debes aceptar los Términos y Condiciones.' });
    }

    const key = loginKey.trim().toLowerCase();
    const query = `SELECT * FROM users WHERE LOWER(email) = ? OR dni = ?`;

    db.get(query, [key, key], (err, user) => {
        if (err) return res.status(500).json({ error: 'Error en el servidor.' });
        if (!user) return res.status(401).json({ error: 'Usuario no encontrado.' });

        let isMatch = (user.email === 'ADMIN') ? (password === '123456789123') : bcrypt.compareSync(password, user.password);

        if (!isMatch) return res.status(401).json({ error: 'Contraseña incorrecta.' });

        createSession(user.id, (err, token) => {
            const userData = {
                id: user.id,
                nombre: user.nombre,
                apellido: user.apellido,
                dni: user.dni,
                email: user.email,
                role: user.role
            };
            return res.json({
                message: 'Inicio de sesión exitoso',
                user: userData,
                sessionToken: token
            });
        });
    });
});

app.put('/api/user/profile', (req, res) => {
    const { user_id, nombre, apellido, email, dni, newPassword } = req.body;

    if (!user_id || !nombre || !apellido || !email || !dni) {
        return res.status(400).json({ error: 'Todos los datos personales son obligatorios.' });
    }

    const cleanNombre = sanitizeString(nombre.trim());
    const cleanApellido = sanitizeString(apellido.trim());
    const cleanEmail = sanitizeString(email.trim().toLowerCase());
    const cleanDni = sanitizeString(dni.trim());

    if (newPassword && newPassword.trim().length > 0) {
        const hashedPassword = bcrypt.hashSync(newPassword.trim(), 8);
        db.run(`UPDATE users SET nombre = ?, apellido = ?, email = ?, dni = ?, password = ? WHERE id = ?`,
            [cleanNombre, cleanApellido, cleanEmail, cleanDni, hashedPassword, user_id],
            (err) => {
                if (err) return res.status(500).json({ error: 'Error al actualizar perfil.' });
                res.json({ message: 'Perfil y contraseña actualizados.', user: { id: user_id, nombre: cleanNombre, apellido: cleanApellido, email: cleanEmail, dni: cleanDni } });
            }
        );
    } else {
        db.run(`UPDATE users SET nombre = ?, apellido = ?, email = ?, dni = ? WHERE id = ?`,
            [cleanNombre, cleanApellido, cleanEmail, cleanDni, user_id],
            (err) => {
                if (err) return res.status(500).json({ error: 'Error al actualizar perfil.' });
                res.json({ message: 'Perfil actualizado.', user: { id: user_id, nombre: cleanNombre, apellido: cleanApellido, email: cleanEmail, dni: cleanDni } });
            }
        );
    }
});

// ==========================================
// 2. ENDPOINTS PANEL DE ADM & GESTIÓN DE ROLES
// ==========================================

// Obtener Lista Completa de Usuarios (para Admin)
app.get('/api/admin/users', (req, res) => {
    db.all(`SELECT id, nombre, apellido, dni, email, role, created_at FROM users ORDER BY id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al obtener usuarios.' });
        res.json(rows || []);
    });
});

// Cambiar Rol de Usuario (student / creator / admin)
app.put('/api/admin/users/:id/role', (req, res) => {
    const userId = req.params.id;
    const { role } = req.body;

    if (!['student', 'creator', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Rol no válido. Permitidos: student, creator, admin.' });
    }

    db.run(`UPDATE users SET role = ? WHERE id = ?`, [role, userId], function (err) {
        if (err) return res.status(500).json({ error: 'Error al cambiar rol.' });

        db.run(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`, [
            userId,
            '¡Membresía / Rol Actualizado!',
            `Tu rol en CursosMi ha sido actualizado a "${role.toUpperCase()}". Ahora tienes acceso a las funciones de tu nueva membresía.`,
            'role_updated'
        ]);

        res.json({ message: `Rol del usuario actualizado a ${role}.` });
    });
});

// ==========================================
// 3. ENDPOINTS DE CURSOS, LECCIONES & RESEÑAS
// ==========================================

app.get('/api/courses', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const category = req.query.category;
    const minPrice = parseFloat(req.query.minPrice);
    const maxPrice = parseFloat(req.query.maxPrice);
    const search = req.query.search ? req.query.search.trim().toLowerCase() : null;
    const sort = req.query.sort || 'newest';

    let whereClause = [];
    let params = [];

    if (category && category !== 'Todos') {
        whereClause.push(`c.category = ?`);
        params.push(category);
    }
    if (!isNaN(minPrice)) {
        whereClause.push(`c.price >= ?`);
        params.push(minPrice);
    }
    if (!isNaN(maxPrice)) {
        whereClause.push(`c.price <= ?`);
        params.push(maxPrice);
    }
    if (search) {
        whereClause.push(`(LOWER(c.title) LIKE ? OR LOWER(c.category) LIKE ? OR LOWER(c.skills) LIKE ?)`);
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereStr = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    let orderBy = `ORDER BY c.id DESC`;
    if (sort === 'popular') {
        orderBy = `ORDER BY (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) DESC, c.id DESC`;
    } else if (sort === 'rating') {
        orderBy = `ORDER BY avg_rating DESC, reviews_count DESC, c.id DESC`;
    } else if (sort === 'price_asc') {
        orderBy = `ORDER BY c.price ASC, c.id DESC`;
    } else if (sort === 'price_desc') {
        orderBy = `ORDER BY c.price DESC, c.id DESC`;
    }

    const countQuery = `SELECT COUNT(DISTINCT c.id) as total FROM courses c ${whereStr}`;
    db.get(countQuery, params, (err, countRow) => {
        const total = countRow ? countRow.total : 0;
        const totalPages = Math.ceil(total / limit) || 1;
        const currentPage = Math.max(1, Math.min(page, totalPages));
        const offset = (currentPage - 1) * limit;

        const dataQuery = `
            SELECT c.*, u.nombre as creator_name,
                   COALESCE(ROUND(AVG(r.rating), 1), 5.0) as avg_rating,
                   COUNT(r.id) as reviews_count
            FROM courses c 
            LEFT JOIN users u ON c.creator_id = u.id 
            LEFT JOIN reviews r ON c.id = r.course_id
            ${whereStr}
            GROUP BY c.id
            ${orderBy}
            LIMIT ? OFFSET ?
        `;

        db.all(dataQuery, [...params, limit, offset], (err, rows) => {
            if (err) return res.status(500).json({ error: 'Error al obtener cursos.' });
            res.json({
                courses: rows || [],
                pagination: { total, page: currentPage, limit, totalPages }
            });
        });
    });
});

app.get('/api/courses/:id', (req, res) => {
    const courseId = req.params.id;

    db.get(`
        SELECT c.*, u.nombre as creator_name, u.email as creator_email,
               COALESCE(ROUND(AVG(r.rating), 1), 5.0) as avg_rating,
               COUNT(r.id) as reviews_count
        FROM courses c 
        LEFT JOIN users u ON c.creator_id = u.id 
        LEFT JOIN reviews r ON c.id = r.course_id
        WHERE c.id = ?
        GROUP BY c.id
    `, [courseId], (err, course) => {
        if (err || !course) return res.status(404).json({ error: 'Curso no encontrado.' });

        db.all(`SELECT * FROM lessons WHERE course_id = ? ORDER BY order_num ASC`, [courseId], (err, lessons) => {
            const lessonsList = (lessons || []).map(l => {
                let parsedResources = [];
                if (l.resources) {
                    try { parsedResources = JSON.parse(l.resources); } catch (e) {}
                }
                return { ...l, resources: parsedResources };
            });

            // Cargar preguntas de cuestionarios por lección
            db.all(`SELECT * FROM quiz_questions WHERE course_id = ?`, [courseId], (err, quizQuestions) => {
                const quizMap = {};
                (quizQuestions || []).forEach(q => {
                    if (!quizMap[q.lesson_id]) quizMap[q.lesson_id] = [];
                    let optionsParsed = [];
                    try { optionsParsed = JSON.parse(q.options); } catch (e) {}
                    quizMap[q.lesson_id].push({
                        id: q.id,
                        question: q.question,
                        options: optionsParsed,
                        correct_option: q.correct_option
                    });
                });

                course.lessons = lessonsList.map(l => ({
                    ...l,
                    quizzes: quizMap[l.id] || []
                }));

                res.json(course);
            });
        });
    });
});

// Crear o Editar Curso (Admin o Creador)
app.post('/api/courses', (req, res) => {
    const { id, title, category, skills, has_certificate, price, mp_alias, payment_info, banner_url, primary_color, creator_id, onboarding_video, lessons } = req.body;

    if (!title || !category || !price || !mp_alias) {
        return res.status(400).json({ error: 'Título, categoría, precio y Alias MP son obligatorios.' });
    }

    const cleanTitle = sanitizeString(title);
    const cleanCategory = sanitizeString(category);
    const cleanSkills = sanitizeString(skills);

    if (id) {
        const updateSql = `UPDATE courses SET title = ?, category = ?, skills = ?, has_certificate = ?, price = ?, mp_alias = ?, payment_info = ?, banner_url = ?, primary_color = ?, onboarding_video = ? WHERE id = ?`;
        db.run(updateSql, [cleanTitle, cleanCategory, cleanSkills, has_certificate ? 1 : 0, price, mp_alias.trim(), payment_info || `Alias MP: ${mp_alias}`, banner_url, primary_color || '#4f46e5', onboarding_video || '', id], function (err) {
            if (err) return res.status(500).json({ error: 'Error al actualizar el curso.' });

            if (lessons && Array.isArray(lessons)) {
                db.run(`DELETE FROM lessons WHERE course_id = ?`, [id], () => {
                    lessons.forEach((l, index) => {
                        const resourcesJson = l.resources ? JSON.stringify(l.resources) : '[]';
                        db.run(`INSERT INTO lessons (course_id, title, order_num, video_url, text_content, image_url, pdf_url, resources) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                            [id, sanitizeString(l.title) || `Clase ${index + 1}`, index + 1, l.video_url || '', sanitizeString(l.text_content) || '', l.image_url || '', l.pdf_url || '', resourcesJson], function (err) {
                                if (!err && l.quizzes && Array.isArray(l.quizzes)) {
                                    const newLessonId = this.lastID;
                                    l.quizzes.forEach(q => {
                                        db.run(`INSERT INTO quiz_questions (lesson_id, course_id, question, options, correct_option) VALUES (?, ?, ?, ?, ?)`,
                                            [newLessonId, id, sanitizeString(q.question), JSON.stringify(q.options || []), q.correct_option || 0]);
                                    });
                                }
                            });
                    });
                });
            }
            res.json({ message: 'Curso actualizado con éxito', courseId: id });
        });
    } else {
        const insertSql = `INSERT INTO courses (title, category, skills, has_certificate, price, mp_alias, payment_info, banner_url, primary_color, creator_id, onboarding_video)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        db.run(insertSql, [
            cleanTitle, cleanCategory, cleanSkills, has_certificate ? 1 : 0, price, mp_alias.trim(),
            payment_info || `Alias MP: ${mp_alias}`,
            banner_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
            primary_color || '#4f46e5',
            creator_id || 1,
            onboarding_video || ''
        ], function (err) {
            if (err) return res.status(500).json({ error: 'Error al crear el curso.' });
            const courseId = this.lastID;

            if (lessons && Array.isArray(lessons) && lessons.length > 0) {
                lessons.forEach((l, index) => {
                    const resourcesJson = l.resources ? JSON.stringify(l.resources) : '[]';
                    db.run(`INSERT INTO lessons (course_id, title, order_num, video_url, text_content, image_url, pdf_url, resources) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [courseId, sanitizeString(l.title) || `Clase ${index + 1}`, index + 1, l.video_url || '', sanitizeString(l.text_content) || '', l.image_url || '', l.pdf_url || '', resourcesJson], function (err) {
                            if (!err && l.quizzes && Array.isArray(l.quizzes)) {
                                const newLessonId = this.lastID;
                                l.quizzes.forEach(q => {
                                    db.run(`INSERT INTO quiz_questions (lesson_id, course_id, question, options, correct_option) VALUES (?, ?, ?, ?, ?)`,
                                        [newLessonId, courseId, sanitizeString(q.question), JSON.stringify(q.options || []), q.correct_option || 0]);
                                });
                            }
                        });
                });
            }
            res.json({ message: 'Curso creado con éxito', courseId });
        });
    }
});

app.delete('/api/courses/:id', (req, res) => {
    const courseId = req.params.id;
    db.run(`DELETE FROM courses WHERE id = ?`, [courseId], function (err) {
        if (err) return res.status(500).json({ error: 'Error al borrar el curso.' });
        res.json({ message: 'Curso eliminado correctamente.' });
    });
});

// Reseñas de Cursos
app.get('/api/courses/:id/reviews', (req, res) => {
    const courseId = req.params.id;
    const query = `
        SELECT r.*, u.nombre, u.apellido
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.course_id = ?
        ORDER BY r.id DESC
    `;
    db.all(query, [courseId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al obtener reseñas.' });
        res.json(rows || []);
    });
});

app.post('/api/courses/:id/reviews', (req, res) => {
    const courseId = req.params.id;
    const { user_id, rating, comment } = req.body;

    if (!user_id || !rating || !comment) {
        return res.status(400).json({ error: 'Calificación y comentario son requeridos.' });
    }

    const cleanComment = sanitizeString(comment);
    const numRating = Math.min(5, Math.max(1, parseInt(rating) || 5));

    db.run(`INSERT INTO reviews (course_id, user_id, rating, comment) VALUES (?, ?, ?, ?)`,
        [courseId, user_id, numRating, cleanComment],
        function (err) {
            if (err) return res.status(500).json({ error: 'Error al publicar la reseña.' });
            res.json({ message: '¡Reseña publicada con éxito!', reviewId: this.lastID });
        }
    );
});

// ==========================================
// 4. MÓDULO DE EVALUACIÓN / QUIZZES
// ==========================================

app.post('/api/lessons/:lessonId/quiz-submit', (req, res) => {
    const lessonId = req.params.lessonId;
    const { user_id, course_id, answers } = req.body; // answers = { questionId: selectedIndex }

    if (!user_id || !course_id || !answers) {
        return res.status(400).json({ error: 'Faltan datos de usuario o respuestas.' });
    }

    db.all(`SELECT * FROM quiz_questions WHERE lesson_id = ?`, [lessonId], (err, questions) => {
        if (err || !questions || questions.length === 0) {
            return res.status(400).json({ error: 'No hay preguntas cargadas para esta lección.' });
        }

        let correctCount = 0;
        questions.forEach(q => {
            const userAns = answers[q.id];
            if (userAns !== undefined && parseInt(userAns) === q.correct_option) {
                correctCount++;
            }
        });

        const score = Math.round((correctCount / questions.length) * 100);
        const passed = score >= 70 ? 1 : 0;

        db.run(`INSERT INTO quiz_submissions (user_id, lesson_id, course_id, score, passed) VALUES (?, ?, ?, ?, ?)`,
            [user_id, lessonId, course_id, score, passed],
            function (err) {
                if (err) return res.status(500).json({ error: 'Error al registrar intento de examen.' });

                // Marcar lección completada si aprobó el Quiz
                if (passed) {
                    db.run(`INSERT OR IGNORE INTO lesson_completions (user_id, lesson_id, course_id) VALUES (?, ?, ?)`, [user_id, lessonId, course_id]);
                }

                res.json({
                    message: passed ? '¡Felicidades! Has aprobado la evaluación.' : 'Evaluación no aprobada. Revisa los contenidos e inténtalo nuevamente.',
                    score,
                    passed,
                    correctCount,
                    totalQuestions: questions.length
                });
            }
        );
    });
});

app.get('/api/user/quiz-submissions/:userId/:courseId', (req, res) => {
    const { userId, courseId } = req.params;
    db.all(`SELECT * FROM quiz_submissions WHERE user_id = ? AND course_id = ? ORDER BY id DESC`, [userId, courseId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al obtener cuestionarios.' });
        res.json(rows || []);
    });
});

// ==========================================
// 5. MÓDULO CARPETA DE CAMPO (field_logs)
// ==========================================

app.get('/api/user/field-logs/:userId/:courseId', (req, res) => {
    const { userId, courseId } = req.params;
    db.all(`SELECT * FROM field_logs WHERE user_id = ? AND course_id = ? ORDER BY id DESC`, [userId, courseId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al consultar carpeta de campo.' });
        res.json(rows || []);
    });
});

app.post('/api/user/field-logs', (req, res) => {
    const { user_id, course_id, lesson_id, activity_title, notes, activity_date } = req.body;

    if (!user_id || !course_id || !activity_title) {
        return res.status(400).json({ error: 'El título de la actividad es obligatorio.' });
    }

    const cleanTitle = sanitizeString(activity_title);
    const cleanNotes = sanitizeString(notes || '');
    const dateStr = activity_date || new Date().toISOString().split('T')[0];

    db.run(`INSERT INTO field_logs (user_id, course_id, lesson_id, activity_title, notes, activity_date, status)
            VALUES (?, ?, ?, ?, ?, ?, 'completado')`,
        [user_id, course_id, lesson_id || null, cleanTitle, cleanNotes, dateStr],
        function (err) {
            if (err) return res.status(500).json({ error: 'Error al guardar registro en la carpeta de campo.' });
            res.json({ message: 'Registro de práctica guardado con éxito.', logId: this.lastID });
        }
    );
});

app.delete('/api/user/field-logs/:id', (req, res) => {
    const logId = req.params.id;
    db.run(`DELETE FROM field_logs WHERE id = ?`, [logId], (err) => {
        if (err) return res.status(500).json({ error: 'Error al eliminar entrada.' });
        res.json({ message: 'Registro eliminado de la carpeta de campo.' });
    });
});

// ==========================================
// 6. MÓDULO FORO / COMUNIDAD DE CONSULTAS
// ==========================================

app.get('/api/courses/:courseId/forum', (req, res) => {
    const courseId = req.params.courseId;
    const query = `
        SELECT t.*, u.nombre, u.apellido, u.role as user_role,
               (SELECT COUNT(*) FROM forum_replies r WHERE r.topic_id = t.id) as replies_count
        FROM forum_topics t
        JOIN users u ON t.user_id = u.id
        WHERE t.course_id = ?
        ORDER BY t.id DESC
    `;
    db.all(query, [courseId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al consultar foro.' });
        res.json(rows || []);
    });
});

app.post('/api/courses/:courseId/forum', (req, res) => {
    const courseId = req.params.courseId;
    const { user_id, title, content } = req.body;

    if (!user_id || !title || !content) {
        return res.status(400).json({ error: 'Título y contenido de la consulta son obligatorios.' });
    }

    const cleanTitle = sanitizeString(title);
    const cleanContent = sanitizeString(content);

    db.run(`INSERT INTO forum_topics (course_id, user_id, title, content) VALUES (?, ?, ?, ?)`,
        [courseId, user_id, cleanTitle, cleanContent],
        function (err) {
            if (err) return res.status(500).json({ error: 'Error al publicar consulta en el foro.' });
            res.json({ message: 'Tema publicado en el foro con éxito.', topicId: this.lastID });
        }
    );
});

app.get('/api/forum/topics/:topicId/replies', (req, res) => {
    const topicId = req.params.topicId;
    const query = `
        SELECT r.*, u.nombre, u.apellido, u.role as user_role
        FROM forum_replies r
        JOIN users u ON r.user_id = u.id
        WHERE r.topic_id = ?
        ORDER BY r.id ASC
    `;
    db.all(query, [topicId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al obtener respuestas del foro.' });
        res.json(rows || []);
    });
});

app.post('/api/forum/topics/:topicId/replies', (req, res) => {
    const topicId = req.params.topicId;
    const { user_id, content } = req.body;

    if (!user_id || !content) {
        return res.status(400).json({ error: 'Escribe el contenido de tu respuesta.' });
    }

    const cleanContent = sanitizeString(content);

    db.run(`INSERT INTO forum_replies (topic_id, user_id, content) VALUES (?, ?, ?)`,
        [topicId, user_id, cleanContent],
        function (err) {
            if (err) return res.status(500).json({ error: 'Error al responder la consulta.' });
            res.json({ message: 'Respuesta publicada.', replyId: this.lastID });
        }
    );
});

// ==========================================
// 7. ENDPOINTS DE PAGOS MERCADO PAGO & VERIFICACIÓN
// ==========================================

const handlePaymentSubmit = (req, res) => {
    const userId = req.body.user_id || req.body.userId;
    const courseId = req.body.course_id || req.body.courseId;
    let receiptRef = req.body.receipt_ref || req.body.receiptRef || `TRX-${Date.now()}`;
    const receiptImage = req.body.receipt_image || req.body.receiptImage;
    const notes = req.body.notes || '';
    const amount = req.body.amount || 18500;

    if (!userId || !courseId) {
        return res.status(400).json({ error: 'Debes iniciar sesión para registrar la transferencia.' });
    }

    let savedImagePath = null;
    if (receiptImage && typeof receiptImage === 'string' && receiptImage.startsWith('data:image')) {
        try {
            const matches = receiptImage.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
            if (matches) {
                const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                const buffer = Buffer.from(matches[2], 'base64');
                const filename = `receipt_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
                fs.writeFileSync(path.join(uploadsDir, filename), buffer);
                savedImagePath = `/uploads/${filename}`;
            }
        } catch (e) {
            console.error('Error al guardar captura del comprobante:', e);
        }
    }

    // Verificar usuario en la base de datos
    db.get(`SELECT id FROM users WHERE id = ?`, [userId], (err, userRow) => {
        const validUserId = userRow ? userRow.id : 3;

        db.run(`INSERT INTO enrollments (user_id, course_id, status) VALUES (?, ?, 'pending')
                ON CONFLICT(user_id, course_id) DO UPDATE SET status = 'pending'`, [validUserId, courseId], function (err) {
            if (err) {
                console.error('Error al registrar inscripción:', err);
                return res.status(500).json({ error: 'Error al registrar la inscripción.' });
            }

            db.get(`SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?`, [validUserId, courseId], (err, enroll) => {
                if (err || !enroll) return res.status(500).json({ error: 'Error al vincular el pago.' });

                db.run(`INSERT INTO payments (enrollment_id, user_id, course_id, receipt_ref, receipt_image, amount, notes, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
                    [enroll.id, validUserId, courseId, receiptRef.trim(), savedImagePath, amount || 0, sanitizeString(notes) || ''],
                    function (err) {
                        if (err) {
                            console.error('Error al registrar comprobante:', err);
                            return res.status(500).json({ error: 'Error al registrar comprobante.' });
                        }

                        db.get(`SELECT title, creator_id FROM courses WHERE id = ?`, [courseId], (err, c) => {
                            const courseTitle = c ? c.title : 'Curso';
                            const creatorId = c && c.creator_id ? c.creator_id : 1;

                            // 1. Notificar al Alumno
                            db.run(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`, [
                                validUserId,
                                'Comprobante Enviado a Verificación',
                                `Hemos recibido tu comprobante (${receiptRef}) para "${courseTitle}". El instructor del curso auditará la transferencia para darte acceso.`,
                                'payment_submitted'
                            ]);

                            // 2. Notificar al Dueño / Instructor del Curso
                            db.get(`SELECT nombre, email FROM users WHERE id = ?`, [validUserId], (err, studentUser) => {
                                const studentName = studentUser ? `${studentUser.nombre}` : 'Un estudiante';
                                const studentEmail = studentUser ? studentUser.email : '';

                                db.run(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`, [
                                    creatorId,
                                    '🔔 Comprobante Recibido por Auditar',
                                    `El alumno ${studentName} (${studentEmail}) ha enviado un comprobante para tu curso "${courseTitle}". Ingresa a tu Panel Creador para confirmar y liberar el permiso de tu curso.`,
                                    'receipt_received_for_creator'
                                ]);

                                // Enviar Emails
                                if (studentEmail) {
                                    mailer.sendReceiptConfirmationEmail(studentEmail, studentName, courseTitle, receiptRef.trim());
                                }

                                db.get(`SELECT email, nombre FROM users WHERE id = ?`, [creatorId], (err, creatorUser) => {
                                    if (creatorUser && creatorUser.email) {
                                        mailer.sendEmail(
                                            creatorUser.email,
                                            `🔔 Nuevo Comprobante Recibido: ${courseTitle}`,
                                            `Hola ${creatorUser.nombre},\n\nEl alumno ${studentName} ha subido un comprobante de pago para tu curso "${courseTitle}".\n\nPor favor ingresa a CursosMi y accede a tu Panel de Creador para auditar la transferencia y confirmar el acceso al curso.`
                                        );
                                    }
                                });
                            });
                        });

                        res.json({ message: 'Comprobante enviado exitosamente a revisión.', receipt_image: savedImagePath, receipt_ref: receiptRef });
                    }
                );
            });
        });
    });
};

app.post('/api/payments/submit', handlePaymentSubmit);
app.post('/api/payments/upload', handlePaymentSubmit);

// ============================================================================
// MERCADO PAGO API INTEGRATION & AUTOMATIC ENROLLMENT
// ============================================================================

// Helper to approve course enrollment and notify user & creator
function approveCourseEnrollment({ userId, courseId, amount, paymentRef, notes }, callback) {
    db.run(`INSERT INTO enrollments (user_id, course_id, status) VALUES (?, ?, 'approved')
            ON CONFLICT(user_id, course_id) DO UPDATE SET status = 'approved'`, [userId, courseId], function (err) {
        if (err) return callback && callback(err);

        db.get(`SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?`, [userId, courseId], (err, enroll) => {
            if (err || !enroll) return callback && callback(err || new Error('No se encontró la inscripción.'));

            db.run(`INSERT INTO payments (enrollment_id, user_id, course_id, receipt_ref, amount, status, notes)
                    VALUES (?, ?, ?, ?, ?, 'approved', ?)`,
                [enroll.id, userId, courseId, paymentRef, amount || 0, notes || 'Pago acreditado vía Mercado Pago API'],
                function (err) {
                    if (err) return callback && callback(err);

                    // Notificaciones internas y correos electrónicos
                    db.get(`SELECT title, creator_id FROM courses WHERE id = ?`, [courseId], (err, c) => {
                        const courseTitle = c ? c.title : 'Curso';
                        const creatorId = c && c.creator_id ? c.creator_id : 1;

                        db.run(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`, [
                            userId,
                            '¡Pago Acreditado! Acceso Liberado 🎉',
                            `¡Tu pago para "${courseTitle}" ha sido acreditado exitosamente con Mercado Pago! Ya puedes ingresar al aula virtual y realizar todos los módulos.`,
                            'payment_approved'
                        ]);

                        db.get(`SELECT nombre, email FROM users WHERE id = ?`, [userId], (err, studentUser) => {
                            if (studentUser && studentUser.email) {
                                mailer.sendAccessGrantedEmail(studentUser.email, studentUser.nombre, courseTitle);
                            }

                            db.run(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`, [
                                creatorId,
                                '💰 ¡Nueva Venta Acreditada!',
                                `El alumno ${studentUser ? studentUser.nombre : 'Estudiante'} se ha matriculado en tu curso "${courseTitle}" mediante pago automático por Mercado Pago.`,
                                'new_sale'
                            ]);

                            db.get(`SELECT email, nombre FROM users WHERE id = ?`, [creatorId], (err, creatorUser) => {
                                if (creatorUser && creatorUser.email) {
                                    mailer.sendEmail(
                                        creatorUser.email,
                                        `💰 ¡Nueva Venta Acreditada: ${courseTitle}!`,
                                        `Hola ${creatorUser.nombre},\n\nEl alumno ${studentUser ? studentUser.nombre : 'Estudiante'} se ha matriculado exitosamente en tu curso "${courseTitle}" mediante Mercado Pago.\n\nPuedes consultar el detalle en tu panel administrativo.`
                                    );
                                }
                            });
                        });
                    });

                    if (callback) callback(null, { success: true, enrollmentId: enroll.id });
                }
            );
        });
    });
}

// 1. Obtener Llave Pública de Mercado Pago para el cliente
app.get('/api/payments/mercadopago/public-key', (req, res) => {
    res.json({
        publicKey: process.env.MERCADOPAGO_PUBLIC_KEY || 'APP_USR-407612f8-6054-4711-bd8a-675942c8aeac'
    });
});

// 2. Crear Preferencia de Pago en Mercado Pago (Checkout Pro)
app.post('/api/payments/mercadopago/create-preference', async (req, res) => {
    const { courseId, userId } = req.body;
    if (!courseId) {
        return res.status(400).json({ error: 'El ID del curso es obligatorio.' });
    }

    const token = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5315974727875473-090714-008423085990973c826207add701b97b-3672302486';

    db.get(`SELECT * FROM courses WHERE id = ?`, [courseId], async (err, course) => {
        if (err || !course) {
            return res.status(404).json({ error: 'Curso no encontrado.' });
        }

        const validUserId = userId || 3;
        db.get(`SELECT * FROM users WHERE id = ?`, [validUserId], async (err, user) => {
            const payerEmail = user ? user.email : 'cliente@cursosmi.com';
            const payerName = user ? user.nombre : 'Estudiante';
            const payerSurname = user ? (user.apellido || '') : '';

            const protocol = req.protocol;
            const host = req.get('host') || 'localhost:3000';
            const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
            const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
            const returnUrl = `${baseUrl}/payment-return?course_id=${course.id}&user_id=${validUserId}`;
            const externalReference = `CM_C${course.id}_U${validUserId}_${Date.now()}`;

            const preferenceBody = {
                items: [
                    {
                        id: String(course.id),
                        title: course.title,
                        description: `Acceso completo al curso: ${course.title}`,
                        quantity: 1,
                        currency_id: 'ARS',
                        unit_price: Number(course.price)
                    }
                ],
                payer: {
                    name: payerName,
                    surname: payerSurname,
                    email: payerEmail
                },
                back_urls: {
                    success: returnUrl,
                    failure: returnUrl,
                    pending: returnUrl
                },
                external_reference: externalReference,
                statement_descriptor: 'CURSOSMI'
            };

            // auto_return solo está permitido en Mercado Pago para dominios públicos
            if (!isLocalhost || process.env.APP_URL) {
                preferenceBody.auto_return = 'approved';
            }

            try {
                const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(preferenceBody)
                });

                const mpData = await mpRes.json();

                if (!mpRes.ok) {
                    console.error('Error al generar preferencia en Mercado Pago:', mpData);
                    return res.status(400).json({ error: mpData.message || 'Error al conectar con la pasarela de Mercado Pago.' });
                }

                // Asegurar registro inicial en enrollments como pending
                db.run(`INSERT INTO enrollments (user_id, course_id, status) VALUES (?, ?, 'pending')
                        ON CONFLICT(user_id, course_id) DO NOTHING`, [validUserId, course.id]);

                res.json({
                    id: mpData.id,
                    init_point: mpData.init_point,
                    sandbox_init_point: mpData.sandbox_init_point,
                    external_reference: externalReference
                });
            } catch (fetchErr) {
                console.error('Error de red con Mercado Pago API:', fetchErr);
                res.status(500).json({ error: 'No se pudo comunicar con los servidores de Mercado Pago.' });
            }
        });
    });
});

// 3. Confirmar Pago y Liberar Curso (llamado tras retorno exitoso de Checkout)
app.post('/api/payments/mercadopago/confirm', async (req, res) => {
    const { paymentId, collectionId, courseId, userId, status } = req.body;
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5315974727875473-090714-008423085990973c826207add701b97b-3672302486';
    const activePaymentId = paymentId || collectionId;

    if (!courseId || !userId) {
        return res.status(400).json({ error: 'Faltan parámetros de curso o usuario.' });
    }

    let paymentVerified = false;
    let paymentAmount = 0;

    // Si viene paymentId, verificamos directamente contra la API de Mercado Pago
    if (activePaymentId && activePaymentId !== 'null' && activePaymentId !== 'undefined') {
        try {
            const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${activePaymentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (mpRes.ok) {
                const pInfo = await mpRes.json();
                if (pInfo.status === 'approved') {
                    paymentVerified = true;
                    paymentAmount = pInfo.transaction_amount || 0;
                }
            }
        } catch (e) {
            console.error('Error consultando estado de pago a Mercado Pago:', e);
        }
    }

    // Si la API confirmó o el status de retorno es approved
    if (paymentVerified || status === 'approved') {
        approveCourseEnrollment({
            userId: Number(userId),
            courseId: Number(courseId),
            amount: paymentAmount,
            paymentRef: `MP-${activePaymentId || Date.now()}`,
            notes: `Pago verificado vía Mercado Pago API (${activePaymentId || 'Checkout Pro'})`
        }, (err, result) => {
            if (err) {
                console.error('Error al liberar inscripción:', err);
                return res.status(500).json({ error: 'Error al liberar el acceso al curso.' });
            }
            return res.json({ success: true, message: '¡Pago acreditado y acceso al curso habilitado!' });
        });
    } else {
        return res.status(400).json({ error: 'El pago aún no figura como aprobado en Mercado Pago.' });
    }
});

// 4. Webhook IPN de Mercado Pago
app.post('/api/payments/webhook-mp', async (req, res) => {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5315974727875473-090714-008423085990973c826207add701b97b-3672302486';
    const paymentId = req.query['data.id'] || req.body?.data?.id || req.body?.id || req.query.id || req.body?.payment_id;

    res.status(200).send('OK');

    if (!paymentId) return;

    try {
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!mpRes.ok) return;

        const payment = await mpRes.json();
        if (payment.status === 'approved') {
            let userId = null;
            let courseId = null;

            if (payment.external_reference) {
                const match = payment.external_reference.match(/CM_C(\d+)_U(\d+)/);
                if (match) {
                    courseId = parseInt(match[1], 10);
                    userId = parseInt(match[2], 10);
                } else {
                    try {
                        const parsed = JSON.parse(payment.external_reference);
                        userId = parsed.userId;
                        courseId = parsed.courseId;
                    } catch (e) {}
                }
            }

            if (!courseId && payment.additional_info?.items?.[0]?.id) {
                courseId = parseInt(payment.additional_info.items[0].id, 10);
            }

            if (userId && courseId) {
                approveCourseEnrollment({
                    userId,
                    courseId,
                    amount: payment.transaction_amount,
                    paymentRef: `MP-${payment.id}`,
                    notes: `Aprobado por Webhook Mercado Pago (${payment.payment_method_id} - ${payment.payment_type_id})`
                }, (err) => {
                    if (err) console.error('Error al procesar webhook en inscripción:', err);
                    else console.log(`Acceso liberado por Webhook para usuario ${userId} en curso ${courseId}`);
                });
            }
        }
    } catch (err) {
        console.error('Error al procesar webhook de Mercado Pago:', err);
    }
});


// 5. Redirección amigable para retorno de pasarela Mercado Pago
app.get('/payment-return', (req, res) => {
    const queryParams = new URLSearchParams(req.query).toString();
    res.redirect(`/#/payment/feedback?${queryParams}`);
});

app.get('/api/admin/payments', (req, res) => {
    const query = `
        SELECT p.*, (u.nombre || ' ' || COALESCE(u.apellido, '')) as student_name, u.email as student_email, u.dni as student_dni, c.title as course_title, c.mp_alias, p.receipt_image as receipt_url
        FROM payments p
        JOIN users u ON p.user_id = u.id
        JOIN courses c ON p.course_id = c.id
        ORDER BY p.id DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al obtener la lista de pagos.' });
        res.json(rows || []);
    });
});

app.get('/api/admin/audit', (req, res) => {
    const queryPayments = `
        SELECT p.*, (u.nombre || ' ' || COALESCE(u.apellido, '')) as student_name, u.email as student_email, u.dni as student_dni, c.title as course_title, c.mp_alias, p.receipt_image as receipt_url
        FROM payments p
        JOIN users u ON p.user_id = u.id
        JOIN courses c ON p.course_id = c.id
        ORDER BY p.id DESC
    `;
    const queryUsers = `SELECT id, nombre, apellido, email, dni, role, created_at FROM users ORDER BY id DESC`;

    db.all(queryPayments, [], (err, payments) => {
        db.all(queryUsers, [], (err, users) => {
            res.json({
                payments: payments || [],
                users: users || []
            });
        });
    });
});

app.post('/api/admin/payments/verify', (req, res) => {
    const { payment_id, action } = req.body;

    if (!payment_id || !action) {
        return res.status(400).json({ error: 'Faltan parámetros de verificación.' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    db.get(`SELECT * FROM payments WHERE id = ?`, [payment_id], (err, payment) => {
        if (err || !payment) return res.status(404).json({ error: 'Pago no encontrado.' });

        db.run(`UPDATE payments SET status = ? WHERE id = ?`, [newStatus, payment_id], (err) => {
            if (err) return res.status(500).json({ error: 'Error al actualizar estado del pago.' });

            db.run(`UPDATE enrollments SET status = ? WHERE id = ?`, [newStatus, payment.enrollment_id], (err) => {
                if (err) return res.status(500).json({ error: 'Error al actualizar acceso del alumno.' });

                db.get(`SELECT title FROM courses WHERE id = ?`, [payment.course_id], (err, c) => {
                    const courseTitle = c ? c.title : 'Curso';
                    db.get(`SELECT nombre, email FROM users WHERE id = ?`, [payment.user_id], (err, user) => {
                        if (action === 'approve') {
                            db.run(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`, [
                                payment.user_id,
                                '¡Pago Acreditado! Acceso Liberado 🎉',
                                `¡Tu transferencia a Mercado Pago para "${courseTitle}" ha sido aprobada! Ya puedes acceder al aula virtual.`,
                                'payment_approved'
                            ]);

                            if (user && user.email) {
                                mailer.sendAccessGrantedEmail(user.email, user.nombre, courseTitle);
                            }
                        } else {
                            db.run(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`, [
                                payment.user_id,
                                'Pago Rechazado / No Acreditado',
                                `No pudimos verificar la acreditación del comprobante (${payment.receipt_ref}) para "${courseTitle}". Por favor revisa el Alias e inténtalo nuevamente.`,
                                'payment_rejected'
                            ]);
                        }
                    });
                });

                res.json({ message: `El pago ha sido ${action === 'approve' ? 'aprobado y el acceso liberado' : 'rechazado'}.` });
            });
        });
    });
});

app.post('/api/payments/webhook', (req, res) => {
    const { external_reference, status } = req.body;
    const isApproved = (status === 'approved') || (req.body.action === 'payment.updated' && status === 'approved');

    if (isApproved && external_reference) {
        const parts = external_reference.split('_');
        if (parts.length >= 4) {
            const courseId = parseInt(parts[1]);
            const userId = parseInt(parts[3]);

            db.run(`INSERT OR REPLACE INTO enrollments (user_id, course_id, status) VALUES (?, ?, 'approved')`, [userId, courseId], (err) => {
                if (!err) {
                    db.get(`SELECT title FROM courses WHERE id = ?`, [courseId], (err, c) => {
                        const courseTitle = c ? c.title : 'Curso';
                        db.run(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`, [
                            userId,
                            '¡Acceso Automático Concedido por Webhook Mercado Pago!',
                            `Tu pago para "${courseTitle}" ha sido acreditado en tiempo real. Ya puedes acceder al aula virtual.`,
                            'payment_approved'
                        ]);
                    });
                }
            });
        }
    }
    res.json({ received: true });
});

app.post('/api/payments/simulate-mp-webhook', (req, res) => {
    const { user_id, course_id } = req.body;
    if (!user_id || !course_id) {
        return res.status(400).json({ error: 'Ingresa user_id y course_id.' });
    }

    db.run(`INSERT OR REPLACE INTO enrollments (user_id, course_id, status) VALUES (?, ?, 'approved')`, [user_id, course_id], (err) => {
        if (err) return res.status(500).json({ error: 'Error al simular acreditación.' });

        db.get(`SELECT title FROM courses WHERE id = ?`, [course_id], (err, c) => {
            const courseTitle = c ? c.title : 'Curso';
            db.run(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`, [
                user_id,
                '⚡ ¡Acceso Automático por Webhook Mercado Pago!',
                `Acreditación en tiempo real procesada. Acceso liberado automáticamente a "${courseTitle}".`,
                'payment_approved'
            ]);
        });

        res.json({ message: 'Simulación de Webhook MP ejecutada exitosamente. Acceso liberado.' });
    });
});

// ==========================================
// 8. INSCRIPCIONES, LECCIONES Y CERTIFICADOS
// ==========================================

app.get('/api/user/enrollments/:userId', (req, res) => {
    const userId = req.params.userId;
    const query = `
        SELECT e.*, c.title, c.category, c.banner_url, c.primary_color, c.has_certificate, c.mp_alias
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.user_id = ?
    `;
    db.all(query, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al consultar inscripciones.' });
        res.json(rows || []);
    });
});

app.get('/api/user/inbox/:userId', (req, res) => {
    const userId = req.params.userId;
    db.all(`SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC`, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al consultar bandeja.' });
        res.json(rows || []);
    });
});

app.post('/api/user/inbox/read', (req, res) => {
    const { notification_id } = req.body;
    db.run(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [notification_id], () => {
        res.json({ success: true });
    });
});

app.get('/api/user/payments-history/:userId', (req, res) => {
    const userId = req.params.userId;
    const query = `
        SELECT p.*, c.title as course_title, c.mp_alias
        FROM payments p
        JOIN courses c ON p.course_id = c.id
        WHERE p.user_id = ?
        ORDER BY p.id DESC
    `;
    db.all(query, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al obtener historial.' });
        res.json(rows || []);
    });
});

app.get('/api/user/lessons/completed/:userId/:courseId', (req, res) => {
    const { userId, courseId } = req.params;
    db.all(`SELECT lesson_id FROM lesson_completions WHERE user_id = ? AND course_id = ?`, [userId, courseId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al consultar lecciones completadas.' });
        res.json((rows || []).map(r => r.lesson_id));
    });
});

app.post('/api/user/lessons/toggle', (req, res) => {
    const { user_id, course_id, lesson_id, completed } = req.body;

    if (!user_id || !course_id || !lesson_id) {
        return res.status(400).json({ error: 'Faltan parámetros.' });
    }

    const isComplete = !!completed;
    const query = isComplete ?
        `INSERT OR IGNORE INTO lesson_completions (user_id, lesson_id, course_id) VALUES (?, ?, ?)` :
        `DELETE FROM lesson_completions WHERE user_id = ? AND lesson_id = ?`;
    const params = isComplete ? [user_id, lesson_id, course_id] : [user_id, lesson_id];

    db.run(query, params, (err) => {
        if (err) return res.status(500).json({ error: 'Error al registrar lección.' });

        db.get(`SELECT COUNT(*) as total FROM lessons WHERE course_id = ?`, [course_id], (err, totalRow) => {
            const totalLessons = (totalRow && totalRow.total > 0) ? totalRow.total : 1;

            db.get(`SELECT COUNT(*) as done FROM lesson_completions WHERE user_id = ? AND course_id = ?`, [user_id, course_id], (err, doneRow) => {
                const doneCount = doneRow ? doneRow.done : 0;
                const progress = Math.min(100, Math.round((doneCount / totalLessons) * 100));

                db.run(`UPDATE enrollments SET progress = ? WHERE user_id = ? AND course_id = ?`, [progress, user_id, course_id], (err) => {
                    let certificateEarned = false;

                    if (progress >= 100) {
                        db.get(`SELECT has_certificate, title FROM courses WHERE id = ?`, [course_id], (err, course) => {
                            if (course && course.has_certificate) {
                                const certCode = 'CERT-' + course_id + '-' + user_id + '-' + Math.floor(100000 + Math.random() * 900000);
                                db.run(`INSERT OR IGNORE INTO certificates (user_id, course_id, cert_code) VALUES (?, ?, ?)`,
                                    [user_id, course_id, certCode],
                                    function () {
                                        if (this.changes > 0) {
                                            certificateEarned = true;
                                            db.run(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`, [
                                                user_id,
                                                '🏆 ¡Felicidades! Certificado Disponible',
                                                `Has completado el 100% del curso "${course.title}". Tu certificado de finalización ya está listo.`,
                                                'certificate_earned'
                                            ]);
                                        }
                                    }
                                );
                            }
                        });
                    }

                    db.all(`SELECT lesson_id FROM lesson_completions WHERE user_id = ? AND course_id = ?`, [user_id, course_id], (err, rows) => {
                        const completedLessons = (rows || []).map(r => r.lesson_id);
                        res.json({
                            message: isComplete ? 'Lección completada.' : 'Lección marcada como pendiente.',
                            progress,
                            doneCount,
                            totalLessons,
                            completedLessons,
                            certificateEarned: progress >= 100
                        });
                    });
                });
            });
        });
    });
});

app.get('/api/user/certificates/:userId', (req, res) => {
    const userId = req.params.userId;
    const query = `
        SELECT cert.*, c.title as course_title, u.nombre, u.apellido, u.dni
        FROM certificates cert
        JOIN courses c ON cert.course_id = c.id
        JOIN users u ON cert.user_id = u.id
        WHERE cert.user_id = ?
    `;
    db.all(query, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al consultar certificados.' });
        res.json(rows || []);
    });
});
app.get('/api/student/dashboard/:userId', (req, res) => {
    const userId = req.params.userId;

    // 1. Cursos Activos (enrollments aprobados)
    const queryActive = `
        SELECT c.*, e.progress, e.enrolled_at
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.user_id = ? AND e.status = 'approved'
    `;

    // 2. Pagos Pendientes (comprobantes en revisión)
    const queryPending = `
        SELECT p.*, c.title as course_title, c.banner_url
        FROM payments p
        JOIN courses c ON p.course_id = c.id
        WHERE p.user_id = ? AND p.status = 'pending'
    `;

    // 3. Cursos Completados (certificados)
    const queryCompleted = `
        SELECT cert.*, c.title, c.banner_url, c.category
        FROM certificates cert
        JOIN courses c ON cert.course_id = c.id
        WHERE cert.user_id = ?
    `;

    db.all(queryActive, [userId], (err, activeRows) => {
        db.all(queryPending, [userId], (err, pendingRows) => {
            db.all(queryCompleted, [userId], (err, completedRows) => {
                res.json({
                    active: activeRows || [],
                    pending: pendingRows || [],
                    completed: completedRows || []
                });
            });
        });
    });
});

app.get('/api/certificates/verify/:cert_code', (req, res) => {
    const certCode = req.params.cert_code.trim();
    const query = `
        SELECT cert.*, c.title as course_title, c.category, u.nombre, u.apellido, u.dni
        FROM certificates cert
        JOIN courses c ON cert.course_id = c.id
        JOIN users u ON cert.user_id = u.id
        WHERE LOWER(cert.cert_code) = LOWER(?)
    `;

    db.get(query, [certCode], (err, row) => {
        if (err) return res.status(500).json({ authentic: false, error: 'Error en base de datos.' });
        if (!row) return res.json({ authentic: false, message: 'Certificado no encontrado.' });

        res.json({
            authentic: true,
            cert_code: row.cert_code,
            issue_date: row.issue_date,
            student: { nombre: row.nombre, apellido: row.apellido, dni: row.dni },
            course: { title: row.course_title, category: row.category }
        });
    });
});

// Iniciar Servidor
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`Servidor CursosMi corriendo en http://localhost:${PORT}`);
    console.log(`Admin: ADMIN | Pass: 123456789123`);
    console.log(`Creador: creador@cursosmi.com | Pass: 123456789123`);
    console.log(`Estudiante: alumno@cursosmi.com | Pass: 123456789123`);
    console.log(`====================================================`);
});
