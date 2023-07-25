const fs = require('fs');
const path = require('path');

const getFiles = directoryPath => {
    const dirents = fs.readdirSync(directoryPath, { withFileTypes: true });
    const filesObject = {
      path: directoryPath,
      files: [],
      directories: []
    };
  
    for (const dirent of dirents) {
      if (dirent.isDirectory()) {
        filesObject.directories.push(getFiles(path.join(directoryPath, dirent.name)));
      } else {
        filesObject.files.push(dirent.name);
      }
    }
  
    return filesObject;
}

module.exports = getFiles;