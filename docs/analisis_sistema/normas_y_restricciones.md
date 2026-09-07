# Normas y Restricciones del Proyecto - Hotel Aura de Mallorca

Este documento formaliza las directrices estrictas de gestion, acceso y modificacion de componentes dentro del repositorio.

---

## 1. Zonas de Acceso Restringido y Protegidas

### 1.1. Directorio `docs/` (Existente)
- **Regla**: Queda estrictamente prohibido modificar, sobrescribir o eliminar cualquier archivo o directorio preexistente en `docs/` (entregas FCT, diagramas Gantt/PERT, wireframes, modelos relacionales, PDFs, etc.).
- **Excepcion**: Unicamente se permite la creacion y mantenimiento de subcarpetas dedicadas exclusivamente a documentacion tecnica anadida (como `docs/analisis_sistema/`).

### 1.2. Directorio `database/`
- **Regla**: El directorio `database/` y sus archivos (`db.sql`, diagramas ER) son de **solo lectura**.
- **Prohibicion**: Queda terminantemente prohibido editar, refactorizar o alterar los scripts SQL o diagramas dentro de esta carpeta. Toda referencia a la base de datos en nuevos desarrollos debe respetar el esquema aqui definido.

### 1.3. Subproyecto `translator/`
- **Regla**: `translator` es un subproyecto derivado totalmente excluido del flujo de trabajo actual.
- **Prohibicion**: Esta prohibido editarlo, modificar su codigo, instalarle dependencias o incluirlo en analisis de arquitectura del hotel.

### 1.4. Archivos en el Directorio Raiz (Root)
- **Regla**: Queda prohibido editar o alterar los archivos situados en la raiz del proyecto:
  - `README.md` original (se debe mantener intacto tal cual se creo para el proyecto).
  - Documentos PDF (`Presentació projecte.pdf`, `Guió Documentació - Documentos de Google.pdf`, `exemples-requisits.pdf`, `manual_ganttproject.pdf`).
  - Archivos de texto o configuraciones de servidor en la raiz (`phpmyadmin-virtualhost.txt`, etc.).
  - Certificados o asociaciones de dominio (`apple-developer-merchantid-domain-association`).

---

## 2. Alcance Operativo Autorizado

El ciclo de desarrollo y analisis se concentra de forma exclusiva en:
1. **`frontend/`**: Aplicacion cliente construida con React 19, Vite, Bootstrap y TypeScript.
2. **`backend/`**: Servidor API REST con Node.js, Express y MySQL.
3. **`database/` (Solo lectura)**: Comprension estructural del modelo de datos para integracion con backend y frontend.
4. **`docs/analisis_sistema/`**: Repositorio de documentacion tecnica y arquitectonica.

---

## 3. Politica de Estilo y Redaccion

- Por politica global, nunca se deben utilizar guiones largos (em dashes o en dashes). Se utiliza siempre el guion simple estandar (`-`).
- La documentacion tecnica debe ser clara, modular y mantener referencias cruzadas entre frontend, backend y persistencia.
