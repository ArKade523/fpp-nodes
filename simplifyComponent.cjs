const fs = require('fs');

const simplifyComponent = fppObject => {
  const simplifiedComponent = {
    name: '',
    kind: '',
    ports: []
  };

  const componentNode = fppObject[0].members[0][1].DefModule.node.data.members[0][1].DefComponent.node.data;

  simplifiedComponent.name = componentNode.name;
  simplifiedComponent.kind = componentNode.kind;

  
  for (const member of componentNode.members) {
    if (member[1].SpecCommand) continue;
    else if (member[1].SpecPortInstance) {
      if (member[1].SpecPortInstance.node.data.General){
        const port = member[1].SpecPortInstance.node.data.General;
        let portTypeNamespace = '';
        let portType = '';
        if (port.port.Option.Some.data.Qualified) {
          portTypeNamespace = port.port.Option.Some.data.Qualified.qualifier.data.Unqualified.name;
          portType = port.port.Option.Some.data.Qualified.name.data;
        } else if (port.port.Option.Some.data.Unqualified) {
          portType = port.port.Option.Some.data.Unqualified.name.data;
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