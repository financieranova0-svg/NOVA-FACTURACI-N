const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: "Nova Facturación - Desktop v1.2",
    backgroundColor: '#0f172a', // Slate-900 background to match app aesthetic
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: true
    }
  });

  // Adjust application menu for professional Windows touch
  createApplicationMenu();

  // Load app: use env or default to production offline file
  if (process.env.ELECTRON_DEV === 'true') {
    mainWindow.loadURL('http://localhost:3000');
    // Open DevTools in dev mode
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createApplicationMenu() {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        { label: 'Reiniciar Aplicación', role: 'reload' },
        { label: 'Forzar Recarga', role: 'forceReload' },
        { type: 'separator' },
        { label: 'Salir', role: 'quit' }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { label: 'Deshacer', role: 'undo' },
        { label: 'Rehacer', role: 'redo' },
        { type: 'separator' },
        { label: 'Cortar', role: 'cut' },
        { label: 'Copiar', role: 'copy' },
        { label: 'Pegar', role: 'paste' },
        { label: 'Seleccionar todo', role: 'selectAll' }
      ]
    },
    {
      label: 'Vista',
      submenu: [
        { label: 'Pantalla Completa', role: 'togglefullscreen' },
        { label: 'Acercar', role: 'zoomIn' },
        { label: 'Alejar', role: 'zoomOut' },
        { label: 'Restablecer Zoom', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Herramientas de Desarrollador', role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Soporte Técnico Nova',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('mailto:christheriault880@gmail.com?subject=Soporte%20Escritorio%20Nova%20Facturacion');
          }
        },
        { type: 'separator' },
        { label: 'Acerca de Nova Facturación', click: showAboutDialog }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function showAboutDialog() {
  const { dialog } = require('electron');
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Acerca de Nova Facturación',
    message: 'Nova Facturación v1.2 PRO Desktop',
    detail: 'Sistema de Facturación de un solo pago, optimizado para funcionamiento 100% Offline offline sin necesidad de conexión a internet.\n\nDesarrollado para República Dominicana.',
    buttons: ['Aceptar']
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
