# Guía de Compilación de Nova Facturación para Escritorio (Windows)

¡Felicidades! Se ha configurado **Nova Facturación** con soporte híbrido de escritorio usando **Electron**. Toda la lógica de negocios, incluyendo el control de inventario, ventas, clientes, cierres de caja y NCFs, está diseñada con un sistema de persistencia local resiliente (`localStorage`), lo que le permite funcionar **100% sin internet** de forma rápida, fluida y con excelente rendimiento.

Esta guía le explica paso a paso cómo descargar este código y transformarlo en un instalador `.exe` para cualquier computadora con Windows.

---

## 🚀 Requisitos en su PC de Windows

Antes de compilar, asegúrese de tener instalado el siguiente programa en su computadora Windows:

1. **Node.js** (Versión 18 o superior recomendada)
   * Descárguelo desde: https://nodejs.org/ (Recomendamos la versión "LTS").
   * Durante la instalación, haga clic en Siguiente/Siguiente hasta finalizar.

---

## 📂 Paso 1: Descargar el Código del Proyecto

Para llevar el código de AI Studio a su computadora local de Windows:

1. En el panel superior o menú de configuración de **Google AI Studio**, busque la opción de **Exportar** (o descargar como archivo `.ZIP`).
2. Descargue el archivo `.ZIP` del proyecto en su computadora.
3. Descomprima el archivo `.ZIP` en una carpeta de su elección (por ejemplo: `C:\Proyectos\NovaFacturacion`).

---

## 🛠️ Paso 2: Instalar Dependencias

Abra la terminal de Windows en la carpeta del proyecto. Puede hacerlo de la siguiente forma:
1. Abra la carpeta del proyecto en el Explorador de Archivos de Windows.
2. En la barra de direcciones superior de la carpeta, escriba `cmd` y presione la tecla **Enter**. Se abrirá una pantalla negra de comandos apuntando a la carpeta de su aplicación.
3. Ejecute el siguiente comando para instalar todos los paquetes necesarios del proyecto (incluyendo Electron y las herramientas para compilar):

```bash
npm install
```

*Espere un momento a que termine la instalación. Se creará una carpeta llamada `node_modules`.*

---

## 🏃 Paso 3: Probar la Aplicación en Modo de Desarrollo

Antes de empaquetar, puede iniciar y probar su aplicación de escritorio de inmediato ejecutando:

```bash
npm run electron:start
```

Esto abrirá la ventana oficial de escritorio de **Nova Facturación** ejecutándose localmente en su máquina de forma offline.

---

## 📦 Paso 4: Crear el Instalador para Windows (.exe)

Para compilar y empaquetar la aplicación en un instalador oficial de Windows que pueda compartir o instalar en cualquier PC:

1. Ejecute el siguiente comando en su terminal:

```bash
npm run electron:dist
```

### ¿Qué hace este comando?
1. Compila los archivos web (`vite build`) para optimizar el peso y rendimiento.
2. Empaqueta el código para escritorio en la plataforma de destino.
3. Genera un instalador profesional con un asistente de instalación NSIS (Siguiente, Siguiente, Instalar).

Una vez que el comando termine, se habrá creado una nueva carpeta llamada **`dist-electron/`** en el directorio raíz de su proyecto.

**📍 Su instalador estará ubicado en:**  
`dist-electron/Nova Facturacion Setup 0.0.0.exe` (o similar, dependiendo de la versión).

---

## 🌟 Ventajas del Modo Escritorio 100% Offline

1. **Cero Dependencia de Red**: Puede abrir y usar el programa en almacenes, fincas o tiendas donde el internet falle constantemente o no exista.
2. **Sin Servidor Externo**: No requiere tener un backend en la nube ni de forma local activa; la aplicación procesa la información de forma local e instantánea.
3. **Inicio Seguro de Cuenta**: Para iniciar sesión u obtener licencias, el sistema realiza la validación de forma instantánea usando el almacenamiento seguro persistente de la computadora.
4. **Respaldos Sencillos**: Toda la información de productos, inventario y facturas se guarda localmente en el motor de almacenamiento de la app, permitiendo máxima confidencialidad.

---

### 📧 Soporte y Asistencia
Si tiene dudas, preguntas sobre la compilación o requiere soporte extra para su licencia de Nova Facturación, puede ponerse en contacto con:
* **Correo Electrónico**: christheriault880@gmail.com
