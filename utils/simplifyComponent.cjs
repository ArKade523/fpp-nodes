const fs = require('fs');

const simplifyComponent = file => {
  const fppObject = JSON.parse(fs.readFileSync(file));
  const simplifiedComponent = {
    name: '',
    kind: '',
    ports: [],
    id: '',
    locMap: {}
  };

  let parentOfComponent = fppObject[0].members[0][1];

  // check if the component is inside of a module
  if (fppObject[0].members[0][1].DefModule) {
    parentOfComponent = fppObject[0].members[0][1].DefModule.node.astNode.data.members[0][1];
  }

  const componentNode = parentOfComponent.DefComponent.node.astNode.data;
  simplifiedComponent.id = parentOfComponent.DefComponent.node.astNode.id;
  const locMap = JSON.parse(fs.readFileSync(file.split('fpp-ast.json')[0] + 'fpp-loc-map.json'));
  simplifiedComponent.locMap = locMap[simplifiedComponent.id];
  
  simplifiedComponent.name = componentNode.name;
  simplifiedComponent.kind = componentNode.kind;
  
  
  for (const member of componentNode.members) {
    if (member[1].SpecCommand) continue;
    else if (member[1].SpecPortInstance) {
      if (member[1].SpecPortInstance.node.astNode.data.General){
        const port = member[1].SpecPortInstance.node.astNode.data.General;
        let portTypeNamespace = '';
        let portType = '';
        if (port.port.Option.Some.astNode.data.Qualified) {
          portTypeNamespace = port.port.Option.Some.astNode.data.Qualified.qualifier.astNode.data.Unqualified.name;
          portType = port.port.Option.Some.astNode.data.Qualified.name.astNode.data;
        } else if (port.port.Option.Some.astNode.data.Unqualified) {
          portType = port.port.Option.Some.astNode.data.Unqualified.name.astNode.data;
        }
        
        simplifiedComponent.ports.push({
          name: port.name,
          kind: port.kind,
          type: `${portTypeNamespace}${portType}`
          
        })
      }
    }
  }

  return simplifiedComponent;
}

module.exports = simplifyComponent;