# Uber Clone Frontend

Frontend E2E de una aplicación tipo Uber, desarrollado con React, TypeScript, Vite y Axios.

## Integrantes

- Renzo Chang
- Mateo Llallire

## Descripción

Este proyecto implementa el frontend de un sistema tipo Uber. Permite registrar usuarios, iniciar sesión, manejar roles de pasajero y conductor, solicitar viajes, aceptar viajes, completar viajes y calificar viajes.

El frontend consume un backend mediante una API REST. Por defecto, el backend debe estar corriendo en:

    http://localhost:8080

El frontend corre por defecto en:

    http://localhost:5173

## Tecnologías usadas

- React
- TypeScript
- Vite
- Axios
- CSS

## Requisitos

Antes de ejecutar el proyecto, tener instalado:

- Node.js
- npm
- Backend del proyecto corriendo en `http://localhost:8080`

## Instalación

Clonar el repositorio:

    git clone https://github.com/RenzoChenHeng/E2E2.git
    cd E2E2

Instalar dependencias:

    npm install

En PowerShell, si aparece un error relacionado a `npm.ps1`, usar:

    npm.cmd install

## Variables de entorno

El frontend usa por defecto la URL:

    http://localhost:8080

Si se desea cambiar la URL del backend, crear un archivo `.env` en la raíz del proyecto:

    VITE_API_URL=http://localhost:8080

## Ejecutar en modo desarrollo

    npm run dev

En PowerShell también puede usarse:

    npm.cmd run dev

Luego abrir en el navegador:

    http://localhost:5173

## Compilar el proyecto

    npm run build

O en PowerShell:

    npm.cmd run build

## Previsualizar la versión compilada

Primero compilar:

    npm run build

Luego ejecutar:

    npm run preview

Abrir en el navegador:

    http://localhost:4173

## Funcionalidades principales

- Registro de usuario.
- Inicio de sesión.
- Guardado de JWT en `localStorage`.
- Envío automático del token en requests protegidos usando `Authorization: Bearer <token>`.
- Redirección según rol.
- Dashboard de pasajero.
- Solicitud de viaje.
- Visualización de conductores disponibles.
- Dashboard de conductor.
- Visualización de viajes pendientes.
- Aceptar viajes.
- Completar viajes.
- Ver detalle de viaje.
- Calificar viaje.

## Endpoints consumidos

### Autenticación

- `POST /auth/register`
- `POST /auth/login`
- `GET /users/me`

### Viajes

- `GET /trips`
- `POST /trips`
- `GET /trips/pending`
- `GET /trips/my`
- `GET /trips/:id`
- `PATCH /trips/:id/accept`
- `PATCH /trips/:id/complete`
- `POST /trips/:id/rate`

### Conductores

- `GET /drivers/available`

## Importante

Este repositorio contiene solo el frontend.

Para que el login, registro y flujo de viajes funcionen correctamente, el backend debe estar ejecutándose en:

    http://localhost:8080

Si el backend no está prendido, la aplicación puede mostrar un error como:

    Network Error

Eso no significa que el frontend esté roto, sino que no pudo conectarse al backend.

## Comandos útiles

Instalar dependencias:

    npm install

Levantar frontend:

    npm run dev

Compilar:

    npm run build
