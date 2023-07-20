const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const simplifyComponent = require("./simplifyComponent.cjs");

const findFppJsonFiles = async (dirname) => {
  if (!dirname.endsWith('/')) dirname = dirname + '/';

  let fppJsonFiles = [];

  const files = await fs.promises.readdir(dirname);
  for (const file of files) {
    const filePath = path.join(dirname, file);
    const stat = await fs.promises.lstat(filePath);
    
    if (stat.isDirectory()) {
      const subdirectoryFiles = await findFppJsonFiles(filePath);
      fppJsonFiles = fppJsonFiles.concat(subdirectoryFiles);
    } else {
      if (file.endsWith('fpp-ast.json')) {
        console.log(`Found fpp-ast.json file: ${filePath}`);
        fppJsonFiles.push(filePath);
      }
    }
  }

  return fppJsonFiles;
};

ipcMain.handle('read-components', async (event) => {
  // const filePath = path.join(__dirname, 'src/components-json');
  // recursively read all files in the fpp folder
  const filePath = path.join(__dirname, 'fpp')
  const files = await findFppJsonFiles(filePath);
  const components = files.map(file => {
    return simplifyComponent(JSON.parse(fs.readFileSync(file)));
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
  mainWindow.webContents.openDevTools();
});