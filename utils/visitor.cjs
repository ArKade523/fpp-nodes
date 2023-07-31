class Visitor {
  visit(node) {
    if (Array.isArray(node)) {
      node.forEach((child) => this.visit(child));
    } else if (typeof node === 'object' && node !== null) {
      for (let key in node) {
        if (this[`on${key}`]) {
          this[`on${key}`](node[key]);
        }
        this.visit(node[key]);
      }
    }
  }

  onDefModule(node) {
    // to be implemented by subclasses
  }

  onDefComponent(node) {
    // to be implemented by subclasses
  }

  onSpecPortInstance(node) {
    // to be implemented by subclasses
  }
}

module.exports = Visitor;
