const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

ipcMain.handle('read-components', (event) => {
  const filePath = path.join(__dirname, 'src/components-json');
  const files = fs.readdirSync(filePath);
  const components = files.map(file => {
    const content = fs.readFileSync(path.join(filePath, file), 'utf8');
    return JSON.parse(content);
  });
  return components;
});

ipcMain.handle('write-component', (event, component) => {
  const filePath = path.join(__dirname, 'src/components-json', `${component.name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(component, null, 2));
});

app.on("ready", () => {
  const mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });
  mainWindow.loadFile(path.join(__dirname, "public/index.html"));
  // mainWindow.webContents.openDevTools();
});