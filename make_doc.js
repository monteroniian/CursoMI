const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

async function buildDocx() {
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                // Título del Documento
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "DOCUMENTACIÓN OFICIAL & MANUAL DEL SISTEMA",
                            bold: true,
                            size: 32,
                            color: "F59E0B",
                            font: "Arial"
                        }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                    children: [
                        new TextRun({
                            text: "CursosMi • Plataforma Educativa, Pasarela Mercado Pago & 3 Membresías",
                            bold: true,
                            italic: true,
                            size: 24,
                            color: "00F2FE",
                            font: "Arial"
                        }),
                    ],
                }),

                // 1. Resumen Ejecutivo
                new Paragraph({
                    text: "1. Resumen Ejecutivo & Visión General de CursosMi",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 300, after: 150 }
                }),
                new Paragraph({
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "CursosMi es una plataforma educativa integral para la publicación, aprendizaje y monetización de cursos digitales modularizados de 10 clases. Cuenta con soporte multi-rol (Estudiante, Creador e Instructor, Administrador), integración de cobros directos por Mercado Pago (QR y Alias), aula virtual multiformato con Videos HD, PDFs descargables, Cuestionarios/Quizzes, Carpeta de Campo, Foro de Comunidad y Emisión de Certificados Oficiales Verificables.",
                            font: "Arial",
                            size: 22
                        })
                    ]
                }),

                // 2. Roles y Membresías
                new Paragraph({
                    text: "2. Membresías y 3 Tipos de Roles",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 300, after: 150 }
                }),
                new Paragraph({
                    spacing: { after: 100 },
                    children: [
                        new TextRun({ text: "• Estudiante / Alumno: ", bold: true, font: "Arial", size: 22 }),
                        new TextRun({ text: "Acceso al catálogo de cursos, pago por Alias/QR, aula virtual dual (Video/Lectura), descarga de materiales PDF, cuestionarios/quizzes, carpeta de campo, foro y certificados con cert_code.", font: "Arial", size: 22 })
                    ]
                }),
                new Paragraph({
                    spacing: { after: 100 },
                    children: [
                        new TextRun({ text: "• Creador / Instructor: ", bold: true, font: "Arial", size: 22 }),
                        new TextRun({ text: "Publicación y edición de cursos de 10 lecciones, personalización de portada, color de marca, configuración de Alias Mercado Pago, carga de exámenes y atención de dudas en el foro.", font: "Arial", size: 22 })
                    ]
                }),
                new Paragraph({
                    spacing: { after: 200 },
                    children: [
                        new TextRun({ text: "• Administrador: ", bold: true, font: "Arial", size: 22 }),
                        new TextRun({ text: "Control total del sistema, verificación de comprobantes con 1 solo clic, gestión interactiva de usuarios y cambio de roles entre Estudiante, Creador y Admin.", font: "Arial", size: 22 })
                    ]
                }),

                // 3. Estructura de Cursada, Cuestionarios y Carpeta de Campo
                new Paragraph({
                    text: "3. Estructura Modular de 10 Clases, Evaluaciones & Carpeta de Campo",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 300, after: 150 }
                }),
                new Paragraph({
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "Cada curso incluye una estructura fija o configurable de 10 módulos (Módulo I: Introducción, Bioseguridad, Visagismo, Fades, Barba, Styling, Marketing y Proyecto Práctico). Cada lección dispone de reproductor de video en alta definición, modo de lectura con imágenes, guías en PDF descargables e imprimibles, cuestionario/quiz interactivo de evaluación (aprobación al 70%+) y registro de seguimiento de actividades en la Carpeta de Campo del alumno.",
                            font: "Arial",
                            size: 22
                        })
                    ]
                }),

                // 4. Pasarela Mercado Pago y Certificación
                new Paragraph({
                    text: "4. Pasarela Mercado Pago, Verificación & Diplomas Oficiales",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 300, after: 150 }
                }),
                new Paragraph({
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "El checkout genera un código QR dinámico y muestra el Alias MP del instructor. El estudiante ingresa el número de transacción y sube la captura de pantalla del comprobante. El administrador o creador verifica y habilita el aula virtual con 1 clic. Al completar el 100% de la cursada, la plataforma emite automáticamente un diploma imprimible con código único de validación (cert_code) verificable públicamente.",
                            font: "Arial",
                            size: 22
                        })
                    ]
                }),

                // 5. Stack Tecnológico & Base de Datos SQLite
                new Paragraph({
                    text: "5. Arquitectura Técnica & Esquema SQLite",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 300, after: 150 }
                }),
                new Paragraph({
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: "El backend está construido con Node.js, Express y SQLite3 con Foreign Keys activas (tables: users, sessions, courses, lessons, lesson_completions, quiz_questions, quiz_submissions, field_logs, forum_topics, forum_replies, enrollments, payments, notifications, certificates, reviews). El frontend utiliza Vanilla Javascript ES6 y CSS3 moderno responsivo.",
                            font: "Arial",
                            size: 22
                        })
                    ]
                })
            ]
        }]
    });

    const buffer = await Packer.toBuffer(doc);
    const outputPath = path.join(__dirname, 'Documentacion_CursosMi.docx');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Documento Word generado exitosamente en: ${outputPath}`);
}

buildDocx().catch(err => console.error('Error al generar docx:', err));
