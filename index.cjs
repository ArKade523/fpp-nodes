const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const simplifyComponent = require("./utils/simplifyComponent.cjs");
const { findFppJsonFiles, runFppToJson } = require("./utils/handleFppFiles.cjs");

ipcMain.handle('read-components', async (event) => {
  // const filePath = path.join(__dirname, 'src/components-json');
  // recursively read all files in the fpp folder
  const filePath = path.join(__dirname, 'fpp')
  let components = [];
  await runFppToJson(filePath).then(async () => {
    const files = await findFppJsonFiles(filePath);
    components = files.map(file => {
      return simplifyComponent(file);
    });
  });

  return components;
});

ipcMain.handle('write-component', (event, component) => {
  const filePath = path.join(__dirname, 'src/components-json', `${component.name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(component, null, 2));
});

ipcMain.handle('watch-component-dir', (event) => {
  const filePath = path.join(__dirname, 'src/components-json');
  
  fs.watch(filePath, (eventType, filename) => {
    event.reply('component-dir-changed', eventType, filename);
  });
});

ipcMain.handle('import-fpp', async (event, fppPath) => {})

app.on("ready", () => {
  const mainWindow = new BrowserWindow({
    height: 1080,
    width: 1920,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });
  mainWindow.loadFile(path.join(__dirname, "public/index.html"));
  mainWindow.webContents.openDevTools();
});