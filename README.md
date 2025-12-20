# 🐳 Full Stack Auth Service (Containerized)

Aplicación web Full Stack diseñada con una arquitectura de microservicios. Cuenta con un sistema de autenticación, frontend ligero y un backend en Python, todo orquestado mediante **Docker Compose** para un despliegue rápido y consistente.

![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)

## 🚀 Características Clave

* **Arquitectura Desacoplada:** Separación clara entre Frontend (Cliente) y Backend (API).
* **Containerización:** Entorno de desarrollo aislado y reproducible usando Docker.
* **Orquestación:** Uso de `docker-compose` para levantar todos los servicios con un solo comando.
* **Autenticación:** Gestión de inicio de sesión de usuarios (Frontend + API).

## 🛠️ Tecnologías

* **Backend:** Python (API RESTful en `main.py`).
* **Frontend:** HTML5, CSS3, Vanilla JavaScript.
* **Infraestructura:** Docker, Docker Compose.

## 📂 Estructura del Proyecto

```text
.
├── backend/            # Lógica del servidor y API
│   ├── main.py         # Punto de entrada de la aplicación
│   ├── Dockerfile      # Configuración de imagen del backend
│   └── requirements.txt
├── frontend/           # Interfaz de usuario
│   ├── app.js          # Lógica del cliente
│   ├── login.html      # Vista de autenticación
│   └── Dockerfile      # Configuración de imagen del frontend
└── docker-compose.yml  # Orquestación de servicios
