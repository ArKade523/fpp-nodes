const fs = require('fs');
const Visitor = require('./visitor.cjs');

class ComponentVisitor extends Visitor {
  constructor() {
    super();
    this.simplifiedComponent = {
      name: '',
      module: '',
      kind: '',
      ports: [],
      id: '',
      locMap: {}
    };
  }

  onDefModule(node) {
    this.simplifiedComponent.module = node.node.AstNode.data.name;
  }

  onDefComponent(node) {
    const componentNode = node.node.AstNode.data;
    this.simplifiedComponent.id = node.node.AstNode.id;
    this.simplifiedComponent.name = componentNode.name;
    this.simplifiedComponent.kind = componentNode.kind;
  }

  onSpecPortInstance(node) {
    if (node.node.AstNode.data.General) {
      const port = node.node.AstNode.data.General;
      let portTypeNamespace = '';
      let portType = '';
      if (port.port.Option.Some.AstNode.data.Qualified) {
        portTypeNamespace = port.port.Option.Some.AstNode.data.Qualified.qualifier.AstNode.data.Unqualified.name;
        portType = port.port.Option.Some.AstNode.data.Qualified.name.AstNode.data;
      } else if (port.port.Option.Some.AstNode.data.Unqualified) {
        portType = port.port.Option.Some.AstNode.data.Unqualified.name.AstNode.data;
      }
        
      this.simplifiedComponent.ports.push({
        name: port.name,
        kind: port.kind,
        type: `${portTypeNamespace}${portType}`
      });
    }
  }
}

const simplifyComponent = file => {
  const fppObject = JSON.parse(fs.readFileSync(file));
  const locMap = JSON.parse(fs.readFileSync(file.split('fpp-ast.json')[0] + 'fpp-loc-map.json'));

  const visitor = new ComponentVisitor();
  visitor.visit(fppObject);
  visitor.simplifiedComponent.locMap = locMap[visitor.simplifiedComponent.id];

  return visitor.simplifiedComponent;
}

module.exports = simplifyComponent;