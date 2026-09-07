const nodemailer = require('nodemailer');

// Configuración de transporte SMTP
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || 'demo@cursosmi.com',
        pass: process.env.SMTP_PASS || 'demopassword'
    }
});

/**
 * Enviar correo transaccional de recepción de comprobante
 */
async function sendReceiptConfirmationEmail(toEmail, userName, courseTitle, receiptRef) {
    const subject = `📥 Comprobante Recibido: ${courseTitle} - CursosMi`;
    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #090d14; color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #1e293b;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #6366f1; margin: 0;">CursosMi</h1>
                <p style="color: #94a3b8; font-size: 14px;">Plataforma Educativa de Cursos & Creadores</p>
            </div>
            <div style="background: #111723; padding: 20px; border-radius: 8px; border: 1px solid #1e293b;">
                <h2 style="color: #10b981; margin-top: 0;">¡Comprobante de Pago Recibido!</h2>
                <p>Hola <strong>${userName}</strong>,</p>
                <p>Hemos recibido correctamente la captura / número de transacción de tu transferencia de Mercado Pago:</p>
                <div style="background: rgba(99, 102, 241, 0.1); border-left: 4px solid #6366f1; padding: 12px; margin: 15px 0; border-radius: 4px;">
                    <p style="margin: 0; font-size: 14px;"><strong>Curso:</strong> ${courseTitle}</p>
                    <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>N° de Transacción:</strong> ${receiptRef}</p>
                </div>
                <p style="color: #94a3b8; font-size: 14px;">Nuestro equipo / creador del curso verificará la acreditación del pago en su Alias de Mercado Pago y tu acceso al Aula Virtual será liberado en breve.</p>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #64748b; font-size: 12px;">
                <p>© ${new Date().getFullYear()} CursosMi. Todos los derechos reservados.</p>
            </div>
        </div>
    `;

    return sendMail({ to: toEmail, subject, html });
}

/**
 * Enviar correo transaccional de acreditación / acceso liberado
 */
async function sendAccessGrantedEmail(toEmail, userName, courseTitle) {
    const subject = `🎉 ¡Acceso Liberado! Ya puedes cursar: ${courseTitle}`;
    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #090d14; color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #1e293b;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #6366f1; margin: 0;">CursosMi</h1>
                <p style="color: #94a3b8; font-size: 14px;">Plataforma Educativa de Cursos & Creadores</p>
            </div>
            <div style="background: #111723; padding: 20px; border-radius: 8px; border: 1px solid #1e293b;">
                <h2 style="color: #10b981; margin-top: 0;">¡Tu Pago ha sido Acreditado! 🚀</h2>
                <p>Hola <strong>${userName}</strong>,</p>
                <p>¡Buenas noticias! Tu transferencia a Mercado Pago para el curso <strong>${courseTitle}</strong> ha sido verificada con éxito.</p>
                <p style="color: #94a3b8; font-size: 14px;">Ya tienes acceso completo al Aula Virtual, con todas las lecciones en video, textos explicativos, recursos descargables y emisión de certificado al finalizar.</p>
                <div style="text-align: center; margin: 25px 0;">
                    <a href="http://localhost:3000" style="background: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">Ingresar al Aula Virtual</a>
                </div>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #64748b; font-size: 12px;">
                <p>© ${new Date().getFullYear()} CursosMi. Todos los derechos reservados.</p>
            </div>
        </div>
    `;

    return sendMail({ to: toEmail, subject, html });
}

/**
 * Enviar correo genérico
 */
async function sendEmail(toEmail, subject, textOrHtml) {
    const html = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #090d14; color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #1e293b;"><p style="white-space: pre-line;">${textOrHtml}</p></div>`;
    return sendMail({ to: toEmail, subject, html });
}

/**
 * Función genérica de envío con fallback seguro
 */
async function sendMail({ to, subject, html }) {
    console.log(`[EMAIL DISPATCH] Intentando enviar correo a: ${to} | Asunto: ${subject}`);
    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"CursosMi Notificaciones" <notificaciones@cursosmi.com>',
            to,
            subject,
            html
        });
        console.log(`[EMAIL EXITO] Correo enviado correctamente a ${to}. MessageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.warn(`[EMAIL FALLBACK] Nodemailer SMTP no configurado o devolvió error (${err.message}). Correo registrado en logs.`);
        return { success: true, simulated: true };
    }
}

module.exports = {
    sendReceiptConfirmationEmail,
    sendAccessGrantedEmail,
    sendEmail
};
