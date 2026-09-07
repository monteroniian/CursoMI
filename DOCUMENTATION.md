# Manual Técnico y Guía de Producción: CursosMi

## 1. Visión General del Sistema
**CursosMi** es una plataforma educativa integral desarrollada con arquitectura **Vanilla HTML5/CSS3/JS ES Modules** en el frontend y **Node.js / Express / SQLite3** en el backend.

---

## 2. Seguridad & Producción

### Variables de Entorno (`.env`)
Las claves secretas y parámetros del servidor deben administrarse exclusivamente mediante el archivo `.env` (no incluido en control de versiones gracias a `.gitignore`):

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=tu_clave_secreta_jwt_para_produccion
SESSION_SECRET=tu_clave_secreta_session_para_produccion
ADMIN_EMAIL=soporte@cursosmi.com
ADMIN_PASSWORD=TuPasswordSeguro2026!
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notificaciones@cursosmi.com
SMTP_PASS=tu_app_password
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

### Protección contra Fuerza Bruta & Cabeceras HTTP
- **Express Rate Limiting**: Protege las rutas `/api/auth/login` y `/api/auth/register` (límite de 20 intentos por 15 minutos).
- **Helmet HTTP Headers**: Configuración de cabeceras seguras para prevenir ataques XSS, Clickjacking y MIME-sniffing.

---

## 3. Guía de Despliegue (Hosting & Dominio)

| Componente | Opción Recomendada | Configuración |
|---|---|---|
| **Backend & BD** | Render / Railway / Fly.io | Despliegue automático desde GitHub. En Render, configurar un *Persistent Disk* para mantener `database.sqlite` o conectar PostgreSQL. |
| **Frontend** | Vercel / Netlify / Express | Servido con CDN global y certificado SSL automáticos. |
| **Dominio & SSL** | Namecheap / DonWeb | Configurar registros DNS `A` y `CNAME` apuntando al servidor con HTTPS forzado. |

---

## 4. Checklist Rápido de Pre-Lanzamiento (Pre-Launch)

- [x] Archivo `.env` configurado fuera de Git (con `.gitignore` activo).
- [x] Paquetes de seguridad instalados (`helmet`, `express-rate-limit`, `dotenv`).
- [x] Open Graph Meta Tags (`og:title`, `og:image`, `og:description`) y Favicon `logo.png` habilitados en `index.html`.
- [x] Base de datos SQLite con 15 tablas relacionales y claves foráneas activas (`PRAGMA foreign_keys = ON;`).
- [x] Flujo de compra Mercado Pago con QR en Canvas y Alias de transferencia habilitado.
- [x] Aula Virtual Dual con quizzes (70%+ score), bitácora y foro de debate verificada.
