# Documentación Técnica y Análisis del Sistema - Hotel Aura de Mallorca

Bienvenido al repositorio de documentación técnica y análisis de arquitectura de **Hotel Aura de Mallorca**.

Esta documentación ha sido creada dentro de la subcarpeta `docs/analisis_sistema/` respetando de forma estricta la integridad de los documentos y entregas previas situados en `docs/`, así como las restricciones de conservación del repositorio.

---

## 1. Índice de Documentos

1. [Normas y Restricciones del Repositorio](./normas_y_restricciones.md):
   - Definición de componentes protegidos (`docs/`, `database/`, archivos raíz).
   - Exclusión del subproyecto `translator/`.
   - Alcance autorizado de análisis y desarrollo.
   - Políticas de estilo (uso exclusivo de guion simple `-`).

2. [Arquitectura General del Sistema](./arquitectura_general.md):
   - Diagrama integral de interacción de componentes.
   - SPA en React 19 + API REST en Express 5 + Base de datos MySQL.
   - Flujos de autenticación JWT, servicio predictivo de meteorología y pasarela de pago.

3. [Análisis Técnico del Backend](./backend.md):
   - Catálogo detallado de los más de 35 endpoints del servidor Express (`backend/index.js`).
   - Middlewares de seguridad (`verifyUser`, `decodeBase64Image`).
   - Sistema de sanciones por cancelación reiterada (`userPunishmentCheck`).
   - Manejo de registro rápido mediante código QR y subida de imágenes.

4. [Análisis Técnico del Frontend](./frontend.md):
   - Estructura de vistas y enrutador React Router v7.
   - Arquitectura modular basada en modales (`BookingModal` con asistente de 8 pasos, `UserModal`, `DuplicateBookingModal`).
   - Servicios de comunicación (`serverAPI`, `weatherAPI`).
   - Integración de Stripe Elements y Google reCAPTCHA.

5. [Análisis del Modelo de Datos](./base_de_datos.md):
   - Diagrama Entidad-Relacion en Mermaid.
   - Detalle de tablas relacionales en `database/db.sql`.
   - Restricciones de integridad referencial, lógica de usuarios (`isEnabled`, `enabledByAdmin`) y catálogo de servicios.

6. [Guía de Despliegue y Entorno](./despliegue_y_entorno.md):
   - Diccionario completo de variables de entorno para frontend y backend.
   - Configuración de Apache VirtualHost con Reverse Proxy (`ProxyPass /api`).
   - Gestión de demonios con PM2 y configuración de cortafuegos UFW.

---

## 2. Resumen de Restricciones del Proyecto

| Recurso | Estado | Directriz |
|---|---|---|
| `docs/*` (raíz de docs) | **Protegido** | Prohibido editar o borrar archivos existentes. Documentación adicional vive en `docs/analisis_sistema/`. |
| Archivos raíz (`*.pdf`, `*.txt`, `README.md`) | **Protegido** | Prohibido editar o modificar. |
| `database/` | **Solo Lectura** | Se analiza su arquitectura pero no se edita el script `db.sql` ni diagramas. |
| `translator/` | **Excluido** | Subproyecto derivado; no se analiza ni se modifica. |
| `frontend/` y `backend/` | **Activo** | Alcance de análisis y desarrollo principal. |
