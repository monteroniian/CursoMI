# 🚀 Guía Oficial de Despliegue a Servidor de Producción: CursosMi

Esta guía te explica paso a paso cómo subir tu plataforma a internet en un servidor profesional, con **dominio propio** y **certificado de seguridad SSL (HTTPS)**.

---

## 📋 Resumen de Opciones de Alojamiento

| Opción | Dificultad | Costo Estimado | Ideal Para |
|---|---|---|---|
| **Opción A: Render.com** *(Recomendada)* | Muy Fácil (Sin Linux) | Gratis / $7 USD/mes | Despliegue rápido con GitHub, SSL automático y disco persistente. |
| **Opción B: Railway.app** | Muy Fácil | ~$5 USD/mes | Despliegue en 2 minutos con Docker. |
| **Opción C: VPS Ubuntu (Docker)** | Media (Línea de comandos) | $3 - $5 USD/mes | Control total, máximo rendimiento y sin límites. |

---

## 🌟 Opción A: Despliegue en Render.com (Paso a Paso)

Render es una de las opciones más utilizadas para Node.js por su estabilidad, certificado SSL automático y facilidad de conexión con GitHub.

### Paso 1: Subir el proyecto a GitHub
1. Crea un repositorio en [GitHub.com](https://github.com) (ej. `cursosmi`).
2. Sube todos los archivos del proyecto a ese repositorio (el archivo `.gitignore` ya protege tus claves secretas para no subirlas públicamente).

### Paso 2: Crear el Web Service en Render
1. Regístrate o inicia sesión en [Render.com](https://render.com).
2. Haz clic en **New +** y selecciona **Web Service**.
3. Conecta tu cuenta de GitHub y elige tu repositorio `cursosmi`.
4. Completa la configuración básica:
   - **Name**: `cursosmi` (o el nombre de tu academia).
   - **Region**: Selecciona la más cercana (ej. *Ohio (US East)* o *Frankfurt*).
   - **Branch**: `main` (o `master`).
   - **Runtime**: `Node`.
   - **Build Command**: `npm ci`
   - **Start Command**: `node server.js`
   - **Plan**: `Starter` (recomendado para habilitar Persistent Disk para SQLite).

### Paso 3: Agregar Disco Persistente (Para guardar la base de datos y comprobantes)
En la sección **Disks** dentro de la configuración del servicio:
- Haz clic en **Add Disk**.
- **Name**: `cursosmi-disk`
- **Mount Path**: `/app/uploads` (y tu archivo `database.sqlite`).
- **Size**: `1 GB` (suficiente para miles de alumnos y comprobantes).

### Paso 4: Cargar Variables de Entorno (Environment Variables)
En la pestaña **Environment**, agrega las siguientes variables (copiadas de tu archivo `.env`):

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=cursosmi_jwt_secret_production_key_2026_987x!
SESSION_SECRET=cursosmi_session_secret_production_key_2026_123z!
ADMIN_EMAIL=ADMIN
ADMIN_PASSWORD=123456789123
MERCADOPAGO_PUBLIC_KEY=APP_USR-407612f8-6054-4711-bd8a-675942c8aeac
MERCADOPAGO_ACCESS_TOKEN=APP_USR-5315974727875473-090714-008423085990973c826207add701b97b-3672302486
APP_URL=https://tu-servicio.onrender.com
```

5. Haz clic en **Deploy Web Service**. En 2 minutos tu sitio estará en línea con una URL segura: `https://tu-servicio.onrender.com`.

---

## 🛠️ Opción C: Despliegue en un VPS Propio (Ubuntu con Docker)

Si prefieres contratar un servidor VPS (Hetzner, DonWeb, Hostinger, DigitalOcean):

### Paso 1: Conectar al VPS vía SSH
```bash
ssh root@IP_DE_TU_SERVIDOR
```

### Paso 2: Instalar Docker & Docker Compose
```bash
# Actualizar el sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
apt install docker-compose-plugin -y
```

### Paso 3: Clonar el proyecto y configurar `.env`
```bash
git clone https://github.com/tu-usuario/tu-repositorio.git /var/www/cursosmi
cd /var/www/cursosmi

# Copiar plantilla y editar variables con tus claves reales
cp .env.example .env
nano .env
```

### Paso 4: Levantar el contenedor con Docker Compose
```bash
docker compose up -d --build
```
Tu plataforma ya estará ejecutándose en el puerto 3000.

### Paso 5: Configurar Nginx y Certificado SSL Gratuito (HTTPS)
Instala Nginx y Certbot:
```bash
apt install nginx certbot python3-certbot-nginx -y
```

Crea el archivo `/etc/nginx/sites-available/cursosmi`:
```nginx
server {
    server_name tudominio.com www.tudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Habilita el sitio y genera el certificado SSL automático:
```bash
ln -s /etc/nginx/sites-available/cursosmi /etc/nginx/sites-enabled/
systemctl reload nginx

# Obtener certificado SSL Let's Encrypt automático:
certbot --nginx -d tudominio.com -d www.tudominio.com
```

---

## 🌐 Conectar tu Dominio Propio (ej. `cursosmi.com`)

En el proveedor donde compraste el dominio (DonWeb, Namecheap, GoDaddy, Hostinger):
1. Accede al panel de **Administración de DNS**.
2. Agrega los siguientes registros:
   - **Registro A**:
     - Host: `@`
     - Valor: `IP_DE_TU_SERVIDOR` (o la IP que te indique Render).
   - **Registro CNAME**:
     - Host: `www`
     - Valor: `@` (o `tu-servicio.onrender.com`).

---

## 💳 Configuración Final en Mercado Pago Developers

1. Ingresa a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers).
2. Entra a tu aplicación.
3. Ve a la sección **Webhooks / Notificaciones IPN**.
4. Pega la URL oficial de tu servidor:
   ```text
   https://tudominio.com/api/payments/webhook-mp
   ```
5. Marca los eventos de **Pagos (Payments)** y guarda los cambios.

¡Listo! Tu plataforma estará 100% operativa en internet, con cobro automático de cursos y acreditación instantánea.
