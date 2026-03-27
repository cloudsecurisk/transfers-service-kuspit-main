# 🚀 Servicio Kuspit - Motor de Transferencias Bancarias Espiral

[![Node.js Version](https://img.shields.io/badge/Node.js-v24%2B-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-00758F?style=flat&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Tests](https://img.shields.io/badge/Node:test-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-1D63ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Express](https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com)
[![npm](https://img.shields.io/badge/npm-CB3837?style=flat&logo=npm&logoColor=white)](https://www.npmjs.com/)
[![Pino](https://img.shields.io/badge/Pino-4CAF50?style=flat&logo=pino&logoColor=white)](https://getpino.io/)
[![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=flat&logo=eslint&logoColor=white)](https://eslint.org/)
[![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=flat&logo=swagger&logoColor=black)](https://swagger.io/)
[![Kuspit](https://img.shields.io/badge/Kuspit_Bank-401251?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNzMuNjcxIiBoZWlnaHQ9Ijc1LjI0NCIgdmlld0JveD0iMCAwIDE3My42NzEgNzUuMjQ0Ij48ZGVmcz48c3R5bGU+LmF7ZmlsbDojZmZmZmZmO30uYntmaWxsOiNmZmZmZmY7fTwvc3R5bGU+PC9kZWZzPjxwYXRoIGNsYXNzPSJhIiBkPSJNMjg0Ljc3MywyNjguNTEyYTMuNywzLjcsMCwxLDEtNy40LDAsMy42NjMsMy42NjMsMCwwLDEsMy43MzctMy43NzksMy41NywzLjU3LDAsMCwxLDMuNjY1LDMuNzc5IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMTM1LjY5MSAtMjUyLjQ3OCkiLz48cGF0aCBjbGFzcz0iYSIgZD0iTTE4MC4yNTUsMjU2LjI4MkExMTIuMDY5LDExMi4wNjksMCwwLDAsNTAuMzM4LDI3OC44OTNWMjU3LjM1NEg0NC4yOTJWMjk0Ljk2Yy40OTItLjY3MywxLTEuMzQ3LDEuNTA2LTIuMDExLjExNC0uMTUuMjEzLS4yODUuMzMyLS40MzIuNC0uNTMzLjgyMi0xLjA1NywxLjI0Ny0xLjU4NC4yMzEtLjMuNDU4LS42LjctLjg4OS40LS40OTQuODA4LS45NzMsMS4yMjUtMS40NjcuMjU1LS4zMTEuNTI1LS42MjkuNzkxLS45NDYuNDA3LS40NjcuODI2LS45MzQsMS4yMzYtMS40LjI3OC0uMzE3LjU1OC0uNjM0Ljg0NC0uOTQ4LjQxMy0uNDU5LjgzOS0uOTA4LDEuMjYtMS4zNTcuMjkzLS4zMTIuNTkyLS42MjkuODgxLS45MzQuNDMtLjQ0My44NjItLjg4NiwxLjI4Ni0xLjMyMy4zMDktLjMuNjA1LS42MDguOTExLS45MDcuNDQ2LS40MzcuODg2LS44NjksMS4zMzYtMS4zLjMwOC0uMjg3LjYxMy0uNTc0LjkxNy0uODY4LjQ2Mi0uNDI1LjkyNy0uODUsMS4zODQtMS4yNjZhMTEyLjI2MiwxMTIuMjYyLDAsMCwxLDExOS42NjYtMjAuMDU3LjUyNy41MjcsMCwwLDAsLjY4MS0uMjUyLjU2OC41NjgsMCwwLDAtLjIzOC0uNzMzIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNDQuMjkyIC0yNDQuNzk3KSIvPjxwYXRoIGNsYXNzPSJiIiBkPSJNMTEyLjYxNCwzMTcuNjUySDEwNy4yOWwtLjM5MS02LjE2OGgtLjE1NGExNC4wMzgsMTQuMDM4LDAsMCwxLTEyLjM1NSw3LjAyN2MtNS44NjYsMC0xMi44ODktMy4yNzgtMTIuODg5LTE2LjU0NVYyNzkuODc1aDYuMTU3djIwLjkxN2MwLDcuMTc5LDIuOCwxMi4wMTgsOC45NzYsMTIuMDE4YTkuODI3LDkuODI3LDAsMCwwLDguOTU0LTYuMjQ2LDEwLjEwNSwxMC4xMDUsMCwwLDAsLjYxLTMuNTA5VjI3OS44NzVoNi4xcy4wNzksMzQuODE4LjMxLDM3Ljc3N202LjY5NC03LjAyNWExNy42NzcsMTcuNjc3LDAsMCwwLDguOTUsMi43MzRjNC45NDUsMCw3LjI1Ni0yLjUsNy4yNTYtNS42MjksMC0zLjI3NS0xLjkyNi01LjA2Ni02Ljk0NS02Ljk0LTYuNzA2LTIuNDE3LTkuODgtNi4xNTktOS44OC0xMC42OTIsMC02LjA5LDQuODYxLTExLjA4NCwxMi44OS0xMS4wODRhMTguNDgzLDE4LjQ4MywwLDAsMSw5LjE4NiwyLjM0NGwtMS43LDQuOTkxYTE0LjQsMTQuNCwwLDAsMC03LjY0MS0yLjE4OWMtNC4wMDksMC02LjI0NSwyLjM0NS02LjI0NSw1LjE1NiwwLDMuMTIzLDIuMjM2LDQuNTI3LDcuMSw2LjQsNi40OSwyLjQ5NCw5LjgsNS43NzksOS44LDExLjQsMCw2LjYzNS01LjEsMTEuMzk1LTEzLjk2OSwxMS4zOTVhMjEuMDg0LDIxLjA4NCwwLDAsMS0xMC41LTIuNjU5Wk0xNDYuOTMxLDI5Mi4yYzAtNC44MzYtLjE1OS04LjczNy0uMzEyLTEyLjMyN2g2LjA5NGwuMzE0LDYuNDc3aC4xNTRhMTQuNjQ1LDE0LjY0NSwwLDAsMSwxMy4yNzktNy4zMzVjOS4wMiwwLDE1LjgyMSw3LjcyNywxNS44MjEsMTkuMiwwLDEzLjU4NC04LjE4NywyMC4zLTE2Ljk4MywyMC4zLTQuOTQ5LDAtOS4yNjEtMi4xODUtMTEuNTA3LTUuOTM0aC0uMTQ5djE3LjQ5MmgtNi43MTFabTYuNzExLDEwLjA3NWExNC42MjcsMTQuNjI3LDAsMCwwLC4zMTUsMi44MDUsMTAuNSwxMC41LDAsMCwwLDEwLjE4Miw4LjA0NGM3LjE4LDAsMTEuMzQxLTUuOTM0LDExLjM0MS0xNC42LDAtNy41NjktMy45MzMtMTQuMDUxLTExLjEwNy0xNC4wNTFhMTAuODczLDEwLjg3MywwLDAsMC0xMC4yNjksOC41MDksMTEuMTgsMTEuMTgsMCwwLDAtLjQ2MSwyLjgwOFptMzMuMjQ4LTIyLjRoNi4yMjR2MzcuNzc3SDE4Ni44OVptMjIuNDktOS4wNTN2OS4wNTNoOC41NjJWMjg1LjFIMjA5LjM4djIwLjM3MWMwLDQuNjc5LDEuMzE0LDcuMzM1LDUuMDk0LDcuMzM1YTEwLjQxMSwxMC40MTEsMCwwLDAsMy40ODktLjMxdjUuMDM0YTEyLjIxMywxMi4yMTMsMCwwLDEtNS4yNjQuOTc2LDkuMzg3LDkuMzg3LDAsMCwxLTcuMzMxLTIuOTczYy0xLjkzNy0yLjAyOS0yLjYzNi01LjM4NC0yLjYzNi05LjgzVjI4NS4xaC0zLjQ1di01LjIyOWgzLjQ1VjI3Mi45M1pNNjIuMzQyLDI4OS43MTFhMzUuNzQ0LDM1Ljc0NCwwLDAsMC00LjY0Niw0Ljc1Mkw3My4wOCwzMTcuNjUyaDcuOTVabS0xOC4wNSwyMS4ydjYuNzM2aDYuMDQ2VjMwMi43MmE1OS4xNjIsNTkuMTYyLDAsMCwwLTYuMDQ2LDguMiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTQ0LjI5MiAtMjU0LjgyNCkiLz48L3N2Zz4=)](https://kuspit.com)
[![Espiral](https://img.shields.io/badge/Built_by_Espiral-0C6DA8?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MS42IDQ1LjQ0Ij48ZGVmcz48c3R5bGU+LmNscy0xe2ZpbGw6I2ZmZmZmZjt9PC9zdHlsZT48L2RlZnM+PGcgaWQ9IkNhcGFfMiIgZGF0YS1uYW1lPSJDYXBhIDIiPjxnIGlkPSJDYXBhXzEtMiIgZGF0YS1uYW1lPSJDYXBhIDEiPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTUxLjYsMTYuMzNoMHYtLjA5YS44MS44MSwwLDAsMC0uODEtLjhIMzcuNTV2LS4yMmEuODEuODEsMCwwLDAtLjgxLS44MWgtLjMxQTE1LjEzLDE1LjEzLDAsMCwwLDIyLjg5LDFWLjgxQS44MS44MSwwLDAsMCwyMi4wOCwwaC0uMjFBMjEuODksMjEuODksMCwwLDAsMCwyMS44N3YuMzJBLjgxLjgxLDAsMCwwLC44MSwyM0guOTRBMjIuNjEsMjIuNjEsMCwwLDAsMjEuNyw0NC4xM3YuNWEuODIuODIsMCwwLDAsLjguODFoLjI4QTI4Ljg1LDI4Ljg1LDAsMCwwLDUxLjYsMTYuNjJaTTI1LjMyLDE2aDEwLjZBMTIuMTgsMTIuMTgsMCwwLDEsMjUuMzMsMjcuNDhWMTYuMUEuMjguMjgsMCwwLDAsMjUuMzIsMTZaTTIyLDIuNTdBMTMuNTQsMTMuNTQsMCwwLDEsMzQuOCwxNC40SDIzLjYxYS44LjgsMCwwLDAtLjguODF2LjA5SDIyWm0tMS42MS0uOXMwLC4wNiwwLC4wOFYxNS4zSDEzLjExYS44MS44MSwwLDAsMC0uODEuNzd2LjE0YTEyLDEyLDAsMCwwLDEuMTYsNS4xNUgxLjYyQTIwLjI3LDIwLjI3LDAsMCwxLDIwLjM3LDEuNjdaTTIzLDQyLjU5QTIxLDIxLDAsMCwxLDIuNTYsMjNIMTQuMzhhMTIsMTIsMCwwLDAsOC40Myw1LjIxdi4yMWEuNzkuNzksMCwwLDAsLjIyLjU0Wm0uNjktMTUuOTRhMTAuNDgsMTAuNDgsMCwwLDEtOS43OC05Ljc0aDkuNzhabS44MywxNy4xMmEuODguODgsMCwwLDAsLjA5LS4zN1YyOS4xNkExMy44NiwxMy44NiwwLDAsMCwzNy40NSwxN0g1MEEyNy4zMSwyNy4zMSwwLDAsMSwyNC41NSw0My43N1oiLz48L2c+PC9nPjwvc3ZnPg==)](https://espiralapp.com)



Este repositorio contiene el servicio para la integración con la API de Kuspit, parte del sistema multirepo para el Motor de Transferencias Bancarias de Espiral. Este adaptador maneja operaciones como vinculación de clientes, solicitud de tokens, transferencias y consultas de saldos, mientras que las validaciones generales (e.g., autenticación OAuth) se delegan al repositorio proxy central.

---

## 📖 Índice
- [Descripción del Proyecto](#-descripción-del-proyecto)
- [Arquitectura](#️-arquitectura)
- [Stack Tecnológico](#️-stack-tecnológico)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación y Puesta en Marcha](#️-instalación-y-puesta-en-marcha)
- [Scripts Principales](#️-scripts-principales)
- [Estructura de Directorios](#-estructura-de-directorios)
- [Cómo Usar el Adaptador](#-cómo-usar-el-adaptador)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [Contribuciones](#-contribuciones)
- [Derechos de Propiedad](#-derechos-de-propiedad)

## 📝 Descripción del Proyecto

Este adaptador abstrae la interacción con la API de Kuspit para operaciones bancarias como vinculación de clientes, gestión de tokens OAuth, apertura de cuentas, transferencias SPEI, consultas de movimientos y retiros. Forma parte del ecosistema multirepo de Espiral, donde cada banco tiene su repo dedicado, y un proxy central maneja validaciones comunes (e.g., permisos, logging). 

El objetivo es estandarizar la integración con Kuspit mientras se mantiene aislamiento para actualizaciones independientes por banco.

## 🏗️ Arquitectura

El adaptador implementa la interfaz común, con métodos para llamadas API específicas de Kuspit. Usa `fetch` nativo para HTTP requests, con soporte para form-urlencoded y multipart (e.g., uploads de documentos).

- **Proxy Central**: Maneja auth, logging y compliance.
- **Adaptador Kuspit**: Lógica banco-specific, con método privado `makeRequest` para HTTP.


## ⚙️ Stack Tecnológico

- **Runtime**: Node.js (v20+)
- **Lenguaje**: TypeScript
- **Gestor de Paquetes**: npm
- **Contenedores**: Docker
- **Base de Datos**: MySQL con Prisma ORM
- **HTTP Client**: Native Fetch (con soporte para FormData/URLSearchParams)
- **Logging**: Pino
- **Testing**: Node:test
- **Linting & Formatting**: ESLint v9
- **Documentación**: Swagger/JSDoc

## ✅ Requisitos Previos

- Node.js (v20+), gestionado con nvm.
- npm para dependencias.
- Docker.
- Acceso a env vars para Kuspit API (e.g., KUSPIT_API_URL, client_id/secret).

## 🛠️ Instalación y Puesta en Marcha

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/tu-org/kuspit-bank-adapter.git
   cd kuspit-bank-adapter
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Configurar variables de entorno: Copia .env.example a .env.dev y ajusta (e.g., DB creds, Kuspit keys).
   ```bash
   cp .env.example .env.dev
   ```

4. Generar cliente de Prisma (typings):
   ```bash
   npm run db:generate
   ```

5. Ejecutar migraciones DB:
   ```bash
   npm run db:migrate
   ```

6. Iniciar en modo dev:
   ```bash
   npm run dev
   ```

## ▶️ Scripts Principales

- `npm run dev`: Inicia en modo desarrollo con node y su soporte nativo a TS.
- `npm run build`: Realiza los procesos de comprobación de TypeScript.
- `npm run start`: Inicia en producción utilizando Docker.
- `npm test`: Ejecuta tests con node:test.
- `npm run lint`: Linta con ESLint v9.
- `npm run lint:write`: Formatea con ESLint v9.
- `npm run db:migrate`: Ejecuta prisma migrate dev (desarrollo).
- `npm run db:deploy`: Ejecuta prisma migrate deploy (producción/CI).
- `npm run db:generate`: Ejecuta prisma generate para actualizar el cliente.
- `npm run db:studio`: Abre Prisma Studio para visualizar datos.

## 📁 Estructura de Directorios

```
config/                    # Config files
prisma/                    # Prisma config
├── schema.prisma          # Database schema & models
└── migrations/            # SQL migrations
src/
├── adapters/              # Lógica específica de Kuspit
│    ├── kuspit/
│    └── kuspit-bank-adapter.ts
├── shared/                # Utilidades reutilizables
│   ├── logger.ts          # Pino config
│   ├── errors-handler.ts  # AppError
│   └── utils/             # e.g., makeRequest para HTTP
├── core/                  # Models y lógica común (si aplica)
│   └── models/            # Sequelize models (e.g., Account)
├── routes/                # Rutas de testing (dev-only)
│   └── test-routes.ts
├── app.ts                 # Express setup
└── index.ts               # Entry point (DB connect + server start)
tests/                     # Node tests
eslint.config.ts           # ESLint config
tsconfig.json              # TS config
```

## ✨ Cómo Usar el Adaptador

1. Instancia el adapter:
   ```typescript
   const adapter = new KuspitBankAdapter();
   ```

2. Llama métodos (e.g., linkClient):
   ```typescript
   const params = { /* KuspitLinkParams */ };
   const result = await adapter.linkClient(params);
   ```

3. Para testing manual (dev-only): Usa rutas en /test (e.g., POST /test/linkClient con body params).
4. Integra con proxy: En el repo central, usa BankFactory.getAdapter('kuspit') para llamadas validadas.

## 🧪 Testing

- Usa Node:Test.
- Ejemplos en tests/auth.test.ts para linkClient, requestToken, refreshToken.

## 🛑 Troubleshooting

- **Error Fetch**: Verifica KUSPIT_API_URL en .env; mockea en tests si offline.
- **DB Connect Fail**: Check Docker running (`docker ps`); creds en .env. Asegúrate de que DATABASE_URL en el .env tenga el formato correcto para Prisma (mysql://user:pass@host:port/db).
- **Prisma Client Error**: Si cambias el schema.prisma, recuerda correr npm run db:generate.
- **TS Errors**: Limpia node_modules y npm install.
- Para más, abre issue o check logs.

## 🤝 Contribuciones

Bienvenidas internamente. Sigue:
1. Fork/clona.
2. Branch: `git checkout -b feature/nueva`.
3. Commit: `git commit -m 'Añade feature'`.
4. PR con descripción.

Adhiérete a ESLint para style.

## 📄 Derechos de Propiedad

Este proyecto es software propietario de Espiral. Todos los derechos reservados. No se permite copia/modificación/uso sin autorización explícita. Contacta al equipo para acceso.