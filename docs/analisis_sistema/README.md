# Documentacion Tecnica y Analisis del Sistema - Hotel Aura de Mallorca

Bienvenido al repositorio de documentacion tecnica y analisis de arquitectura de **Hotel Aura de Mallorca**.

Esta documentacion ha sido creada dentro de la subcarpeta `docs/analisis_sistema/` respetando de forma estricta la integridad de los documentos y entregas previas situados en `docs/`, asi como las restricciones de conservacion del repositorio.

---

## 1. Indice de Documentos

1. [Normas y Restricciones del Repositorio](./normas_y_restricciones.md):
   - Definicion de componentes protegidos (`docs/`, `database/`, archivos raiz).
   - Exclusion del subproyecto `translator/`.
   - Alcance autorizado de analisis y desarrollo.
   - Politicas de estilo (uso exclusivo de guion simple `-`).

2. [Arquitectura General del Sistema](./arquitectura_general.md):
   - Diagrama integral de interaccion de componentes.
   - SPA en React 19 + API REST en Express 5 + Base de datos MySQL.
   - Flujos de autenticacion JWT, servicio predictivo de meteorologia y pasarela de pago.

3. [Analisis Tecnico del Backend](./backend.md):
   - Catalogo detallado de los mas de 35 endpoints del servidor Express (`backend/index.js`).
   - Middlewares de seguridad (`verifyUser`, `decodeBase64Image`).
   - Sistema de sanciones por cancelacion reiterada (`userPunishmentCheck`).
   - Manejo de registro rapido mediante codigo QR y subida de imagenes.

4. [Analisis Tecnico del Frontend](./frontend.md):
   - Estructura de vistas y enrutador React Router v7.
   - Arquitectura modular basada en modales (`BookingModal` con asistente de 8 pasos, `UserModal`, `DuplicateBookingModal`).
   - Servicios de comunicacion (`serverAPI`, `weatherAPI`).
   - Integracion de Stripe Elements y Google reCAPTCHA.

5. [Analisis del Modelo de Datos](./base_de_datos.md):
   - Diagrama Entidad-Relacion en Mermaid.
   - Detalle de tablas relacionales en `database/db.sql`.
   - Restricciones de integridad referencial, logica de usuarios (`isEnabled`, `enabledByAdmin`) y catalogo de servicios.

6. [Guia de Despliegue y Entorno](./despliegue_y_entorno.md):
   - Diccionario completo de variables de entorno para frontend y backend.
   - Configuracion de Apache VirtualHost con Reverse Proxy (`ProxyPass /api`).
   - Gestion de demonios con PM2 y configuracion de cortafuegos UFW.

---

## 2. Resumen de Restricciones del Proyecto

| Recurso | Estado | Directriz |
|---|---|---|
| `docs/*` (raiz de docs) | **Protegido** | Prohibido editar o borrar archivos existentes. Documentacion adicional vive en `docs/analisis_sistema/`. |
| Archivos raiz (`*.pdf`, `*.txt`, `README.md`) | **Protegido** | Prohibido editar o modificar. |
| `database/` | **Solo Lectura** | Se analiza su arquitectura pero no se edita el script `db.sql` ni diagramas. |
| `translator/` | **Excluido** | Subproyecto derivado; no se analiza ni se modifica. |
| `frontend/` y `backend/` | **Activo** | Alcance de analisis y desarrollo principal. |
