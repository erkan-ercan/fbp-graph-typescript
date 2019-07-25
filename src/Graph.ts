import EventEmitter from "events";
// import * as clone from "clone";
// import * as platform from "./Platform";

export default class Graph extends EventEmitter {
  prototype: any;
  caseSensitive: any;
  transaction: any;
  groups: any;
  outports: any;
  inports: any;
  initializers: any;
  edges: any;
  nodes: any;
  properties: any;
  name: any;

  static initClass() {
    this.prototype.name = "";
    this.prototype.caseSensitive = false;
    this.prototype.properties = {};
    this.prototype.nodes = [];
    this.prototype.edges = [];
    this.prototype.initializers = [];
    this.prototype.inports = {};
    this.prototype.outports = {};
    this.prototype.groups = [];
  }

  // ## Creating new graphs
  //
  // Graphs are created by simply instantiating the Graph class
  // and giving it a name:
  //
  //     myGraph = new Graph 'My very cool graph'
  constructor(name: any, options: any) {
    super();
    if (name === null) {
      name = "";
    }
    if (options === null) {
      options = {};
    }
    this.setMaxListeners(0);
    this.properties = {};
    this.nodes = [];
    this.edges = [];
    this.initializers = [];
    this.inports = {};
    this.outports = {};
    this.groups = [];
    this.transaction = {
      id: null,
      depth: 0,
    };
    this.caseSensitive = options.caseSensitive || false;
  }

  public getPortName(port: string) {
    if (this.caseSensitive) {
      return port;
    } else {
      return port.toLowerCase();
    }
  }

  // ## Group graph changes into transactions
  //
  // If no transaction is explicitly opened, each call to
  // the graph API will implicitly create a transaction for that change
  public startTransaction(id: string, metadata?: any) {
    if (this.transaction.id) {
      throw Error("Nested transactions not supported");
    }

    this.transaction.id = id;
    this.transaction.depth = 1;
    return this.emit("startTransaction", id, metadata);
  }

  public endTransaction(id: string, metadata?: any) {
    if (!this.transaction.id) {
      throw Error("Attempted to end non-existing transaction");
    }

    this.transaction.id = null;
    this.transaction.depth = 0;
    return this.emit("endTransaction", id, metadata);
  }

  public checkTransactionStart() {
    if (!this.transaction.id) {
      return this.startTransaction("implicit");
    } else if (this.transaction.id === "implicit") {
      return (this.transaction.depth += 1);
    }
  }

  public checkTransactionEnd() {
    if (this.transaction.id === "implicit") {
      this.transaction.depth -= 1;
    }
    if (this.transaction.depth === 0) {
      return this.endTransaction("implicit");
    }
  }

  // ## Modifying Graph properties
  //
  // This method allows changing properties of the graph.
  public setProperties(properties: any) {
    this.checkTransactionStart();
    let before = this.properties;
    for (let item in properties) {
      let val = properties[item];
      this.properties[item] = val;
    }
    this.emit("changeProperties", this.properties, before);
    return this.checkTransactionEnd();
  }

  public addInport(publicPort: any, nodeKey: any, portKey: any, metadata: any) {
    // Check that node exists
    if (!this.getNode(nodeKey)) {
      return;
    }

    publicPort = this.getPortName(publicPort);
    this.checkTransactionStart();
    this.inports[publicPort] = {
      process: nodeKey,
      port: this.getPortName(portKey),
      metadata,
    };
    this.emit("addInport", publicPort, this.inports[publicPort]);
    return this.checkTransactionEnd();
  }

  public removeInport(publicPort: any) {
    publicPort = this.getPortName(publicPort);
    if (!this.inports[publicPort]) {
      return;
    }

    this.checkTransactionStart();
    let port = this.inports[publicPort];
    this.setInportMetadata(publicPort, {});
    delete this.inports[publicPort];
    this.emit("removeInport", publicPort, port);
    return this.checkTransactionEnd();
  }

  public renameInport(oldPort: any, newPort: any) {
    oldPort = this.getPortName(oldPort);
    newPort = this.getPortName(newPort);
    if (!this.inports[oldPort]) {
      return;
    }
    if (newPort === oldPort) {
      return;
    }

    this.checkTransactionStart();
    this.inports[newPort] = this.inports[oldPort];
    delete this.inports[oldPort];
    this.emit("renameInport", oldPort, newPort);
    return this.checkTransactionEnd();
  }

  public setInportMetadata(publicPort: any, metadata: any) {
    publicPort = this.getPortName(publicPort);
    if (!this.inports[publicPort]) {
      return;
    }

    this.checkTransactionStart();
    let before = this.inports[publicPort].metadata;
    if (!this.inports[publicPort].metadata) {
      this.inports[publicPort].metadata = {};
    }
    for (let item in metadata) {
      let val = metadata[item];
      if (val != null) {
        this.inports[publicPort].metadata[item] = val;
      } else {
        delete this.inports[publicPort].metadata[item];
      }
    }
    this.emit(
      "changeInport",
      publicPort,
      this.inports[publicPort],
      before,
      metadata,
    );
    return this.checkTransactionEnd();
  }

  public addOutport(
    publicPort: any,
    nodeKey: any,
    portKey: any,
    metadata: any,
  ) {
    // Check that node exists
    if (!this.getNode(nodeKey)) {
      return;
    }

    publicPort = this.getPortName(publicPort);
    this.checkTransactionStart();
    this.outports[publicPort] = {
      process: nodeKey,
      port: this.getPortName(portKey),
      metadata,
    };
    this.emit("addOutport", publicPort, this.outports[publicPort]);

    return this.checkTransactionEnd();
  }

  public removeOutport(publicPort: any) {
    publicPort = this.getPortName(publicPort);
    if (!this.outports[publicPort]) {
      return;
    }

    this.checkTransactionStart();

    let port = this.outports[publicPort];
    this.setOutportMetadata(publicPort, {});
    delete this.outports[publicPort];
    this.emit("removeOutport", publicPort, port);

    return this.checkTransactionEnd();
  }

  public setOutportMetadata(publicPort: any, metadata: any) {
    publicPort = this.getPortName(publicPort);
    if (!this.outports[publicPort]) {
      return;
    }

    this.checkTransactionStart();
    let before = this.outports[publicPort].metadata;
    if (!this.outports[publicPort].metadata) {
      this.outports[publicPort].metadata = {};
    }
    for (let item in metadata) {
      let val = metadata[item];
      if (val != null) {
        this.outports[publicPort].metadata[item] = val;
      } else {
        delete this.outports[publicPort].metadata[item];
      }
    }
    this.emit(
      "changeOutport",
      publicPort,
      this.outports[publicPort],
      before,
      metadata,
    );
    return this.checkTransactionEnd();
  }

  // ## Grouping nodes in a graph
  //
  public addGroup(group: any, nodes: any, metadata: any) {
    this.checkTransactionStart();

    let g = {
      name: group,
      nodes,
      metadata,
    };
    this.groups.push(g);
    this.emit("addGroup", g);

    return this.checkTransactionEnd();
  }

  public renameGroup(oldName: any, newName: any) {
    this.checkTransactionStart();
    for (let group of this.groups) {
      if (!group) {
        continue;
      }
      if (group.name !== oldName) {
        continue;
      }
      group.name = newName;
      this.emit("renameGroup", oldName, newName);
    }
    return this.checkTransactionEnd();
  }

  public removeGroup(groupName: any) {
    this.checkTransactionStart();

    for (let group of this.groups) {
      if (!group) {
        continue;
      }
      if (group.name !== groupName) {
        continue;
      }
      this.setGroupMetadata(group.name, {});
      this.groups.splice(this.groups.indexOf(group), 1);
      this.emit("removeGroup", group);
    }

    return this.checkTransactionEnd();
  }

  public setGroupMetadata(groupName: any, metadata: any) {
    this.checkTransactionStart();
    let group: any;
    for (group of Array.from(this.groups)) {
      if (!group) {
        continue;
      }
      if (group.name !== groupName) {
        continue;
      }
      let before = group.metadata;
      for (let item in metadata) {
        let val = metadata[item];
        if (val != null) {
          group.metadata[item] = val;
        } else {
          delete group.metadata[item];
        }
      }
      this.emit("changeGroup", group, before, metadata);
    }
    return this.checkTransactionEnd();
  }

  // ## Adding a node to the graph
  //
  // Nodes are identified by an ID unique to the graph. Additionally,
  // a node may contain information on what FBP component it is and
  // possible display coordinates.
  //
  // For example:
  //
  //     myGraph.addNode 'Read, 'ReadFile',
  //       x: 91
  //       y: 154
  //
  // Addition of a node will emit the `addNode` event.
  public addNode(id: any, component: any, metadata: any) {
    this.checkTransactionStart();

    if (!metadata) {
      metadata = {};
    }
    let node = {
      id,
      component,
      metadata,
    };
    this.nodes.push(node);
    this.emit("addNode", node);

    this.checkTransactionEnd();
    return node;
  }

  // ## Removing a node from the graph
  //
  // Existing nodes can be removed from a graph by their ID. This
  // will remove the node and also remove all edges connected to it.
  //
  //     myGraph.removeNode 'Read'
  //
  // Once the node has been removed, the `removeNode` event will be
  // emitted.
  public removeNode(id: any) {
    let priv;
    let node: any = this.getNode(id);
    if (!node) {
      return;
    }

    this.checkTransactionStart();

    let toRemove = [];
    let edge: any;
    for (edge of Array.from(this.edges)) {
      if (edge.from.node === node.id || edge.to.node === node.id) {
        toRemove.push(edge);
      }
    }
    for (edge of Array.from(toRemove)) {
      this.removeEdge(
        edge.from.node,
        edge.from.port,
        edge.to.node,
        edge.to.port,
      );
    }

    toRemove = [];
    var initializer: any;
    for (initializer of Array.from(this.initializers)) {
      if (initializer.to.node === node.id) {
        toRemove.push(initializer);
      }
    }
    for (initializer of Array.from(toRemove)) {
      this.removeInitial(initializer.to.node, initializer.to.port);
    }

    toRemove = [];
    for (var pub in this.inports) {
      priv = this.inports[pub];
      if (priv.process === id) {
        toRemove.push(pub);
      }
    }
    for (pub of Array.from(toRemove)) {
      this.removeInport(pub);
    }

    toRemove = [];
    for (pub in this.outports) {
      priv = this.outports[pub];
      if (priv.process === id) {
        toRemove.push(pub);
      }
    }
    for (pub of Array.from(toRemove)) {
      this.removeOutport(pub);
    }

    for (let group of this.groups) {
      if (!group) {
        continue;
      }
      let index = group.nodes.indexOf(id);
      if (index === -1) {
        continue;
      }
      group.nodes.splice(index, 1);
    }

    this.setNodeMetadata(id, {});

    if (-1 !== this.nodes.indexOf(node)) {
      this.nodes.splice(this.nodes.indexOf(node), 1);
    }

    this.emit("removeNode", node);

    return this.checkTransactionEnd();
  }

  // ## Getting a node
  //
  // Nodes objects can be retrieved from the graph by their ID:
  //
  //     myNode = myGraph.getNode 'Read'
  public getNode(id: any) {
    var node: any;
    for (node of Array.from(this.nodes)) {
      if (!node) {
        continue;
      }
      if (node.id === id) {
        return node;
      }
    }
    return null;
  }

  // ## Renaming a node
  //
  // Nodes IDs can be changed by calling this method.
  public renameNode(oldId: any, newId: any) {
    let priv;
    this.checkTransactionStart();

    let node = this.getNode(oldId);
    if (!node) {
      return;
    }
    node.id = newId;

    let edge: any;
    for (edge of Array.from(this.edges)) {
      if (!edge) {
        continue;
      }
      if (edge.from.node === oldId) {
        edge.from.node = newId;
      }
      if (edge.to.node === oldId) {
        edge.to.node = newId;
      }
    }

    let iip: any;
    for (iip of Array.from(this.initializers)) {
      if (!iip) {
        continue;
      }
      if (iip.to.node === oldId) {
        iip.to.node = newId;
      }
    }

    for (var pub in this.inports) {
      priv = this.inports[pub];
      if (priv.process === oldId) {
        priv.process = newId;
      }
    }
    for (pub in this.outports) {
      priv = this.outports[pub];
      if (priv.process === oldId) {
        priv.process = newId;
      }
    }

    let group: any;
    for (group of Array.from(this.groups)) {
      if (!group) {
        continue;
      }
      let index = group.nodes.indexOf(oldId);
      if (index === -1) {
        continue;
      }
      group.nodes[index] = newId;
    }

    this.emit("renameNode", oldId, newId);
    return this.checkTransactionEnd();
  }

  // ## Changing a node's metadata
  //
  // Node metadata can be set or changed by calling this method.
  public setNodeMetadata(id: any, metadata: any) {
    let node = this.getNode(id);
    if (!node) {
      return;
    }

    this.checkTransactionStart();

    let before = node.metadata;
    if (!node.metadata) {
      node.metadata = {};
    }

    for (let item in metadata) {
      let val = metadata[item];
      if (val != null) {
        node.metadata[item] = val;
      } else {
        delete node.metadata[item];
      }
    }

    this.emit("changeNode", node, before, metadata);
    return this.checkTransactionEnd();
  }

  // ## Connecting nodes
  //
  // Nodes can be connected by adding edges between a node's outport
  // and another node's inport:
  //
  //     myGraph.addEdge 'Read', 'out', 'Display', 'in'
  //     myGraph.addEdgeIndex 'Read', 'out', null, 'Display', 'in', 2
  //
  // Adding an edge will emit the `addEdge` event.
  public addEdge(
    outNode: any,
    outPort: any,
    inNode: any,
    inPort: any,
    metadata: any,
  ) {
    if (metadata == null) {
      metadata = {};
    }
    outPort = this.getPortName(outPort);
    inPort = this.getPortName(inPort);

    let edge: any;
    for (edge of Array.from(this.edges)) {
      // don't add a duplicate edge
      if (
        edge.from.node === outNode &&
        edge.from.port === outPort &&
        edge.to.node === inNode &&
        edge.to.port === inPort
      ) {
        return;
      }
    }
    if (!this.getNode(outNode)) {
      return;
    }
    if (!this.getNode(inNode)) {
      return;
    }

    this.checkTransactionStart();

    edge = {
      from: {
        node: outNode,
        port: outPort,
      },
      to: {
        node: inNode,
        port: inPort,
      },
      metadata,
    };
    this.edges.push(edge);
    this.emit("addEdge", edge);

    this.checkTransactionEnd();
    return edge;
  }

  // Adding an edge will emit the `addEdge` event.
  public addEdgeIndex(
    outNode: any,
    outPort: any,
    outIndex: any,
    inNode: any,
    inPort: any,
    inIndex: any,
    metadata: any,
  ) {
    if (metadata == null) {
      metadata = {};
    }
    if (!this.getNode(outNode)) {
      return;
    }
    if (!this.getNode(inNode)) {
      return;
    }

    outPort = this.getPortName(outPort);
    inPort = this.getPortName(inPort);

    if (inIndex === null) {
      inIndex = undefined;
    }
    if (outIndex === null) {
      outIndex = undefined;
    }
    if (!metadata) {
      metadata = {};
    }

    this.checkTransactionStart();

    let edge = {
      from: {
        node: outNode,
        port: outPort,
        index: outIndex,
      },
      to: {
        node: inNode,
        port: inPort,
        index: inIndex,
      },
      metadata,
    };
    this.edges.push(edge);
    this.emit("addEdge", edge);

    this.checkTransactionEnd();
    return edge;
  }

  // ## Disconnected nodes
  //
  // Connections between nodes can be removed by providing the
  // nodes and ports to disconnect.
  //
  //     myGraph.removeEdge 'Display', 'out', 'Foo', 'in'
  //
  // Removing a connection will emit the `removeEdge` event.
  public removeEdge(node: any, port: any, node2: any, port2: any) {
    let edge, index;
    this.checkTransactionStart();
    port = this.getPortName(port);
    port2 = this.getPortName(port2);
    let toRemove = [];
    let toKeep = [];
    if (node2 && port2) {
      for (index = 0; index < this.edges.length; index++) {
        edge = this.edges[index];
        if (
          edge.from.node === node &&
          edge.from.port === port &&
          edge.to.node === node2 &&
          edge.to.port === port2
        ) {
          this.setEdgeMetadata(
            edge.from.node,
            edge.from.port,
            edge.to.node,
            edge.to.port,
            {},
          );
          toRemove.push(edge);
        } else {
          toKeep.push(edge);
        }
      }
    } else {
      for (index = 0; index < this.edges.length; index++) {
        edge = this.edges[index];
        if (
          (edge.from.node === node && edge.from.port === port) ||
          (edge.to.node === node && edge.to.port === port)
        ) {
          this.setEdgeMetadata(
            edge.from.node,
            edge.from.port,
            edge.to.node,
            edge.to.port,
            {},
          );
          toRemove.push(edge);
        } else {
          toKeep.push(edge);
        }
      }
    }

    this.edges = toKeep;
    for (edge of Array.from(toRemove)) {
      this.emit("removeEdge", edge);
    }

    return this.checkTransactionEnd();
  }

  // ## Getting an edge
  //
  // Edge objects can be retrieved from the graph by the node and port IDs:
  //
  //     myEdge = myGraph.getEdge 'Read', 'out', 'Write', 'in'
  public getEdge(node: any, port: any, node2: any, port2: any) {
    port = this.getPortName(port);
    port2 = this.getPortName(port2);
    for (let index = 0; index < this.edges.length; index++) {
      let edge = this.edges[index];
      if (!edge) {
        continue;
      }
      if (edge.from.node === node && edge.from.port === port) {
        if (edge.to.node === node2 && edge.to.port === port2) {
          return edge;
        }
      }
    }
    return null;
  }

  // ## Changing an edge's metadata
  //
  // Edge metadata can be set or changed by calling this method.
  public setEdgeMetadata(
    node: any,
    port: any,
    node2: any,
    port2: any,
    metadata: any,
  ) {
    let edge = this.getEdge(node, port, node2, port2);
    if (!edge) {
      return;
    }

    this.checkTransactionStart();
    let before = edge.metadata;
    if (!edge.metadata) {
      edge.metadata = {};
    }

    for (let item in metadata) {
      let val = metadata[item];
      if (val != null) {
        edge.metadata[item] = val;
      } else {
        delete edge.metadata[item];
      }
    }

    this.emit("changeEdge", edge, before, metadata);
    return this.checkTransactionEnd();
  }

  // ## Adding Initial Information Packets
  //
  // Initial Information Packets (IIPs) can be used for sending data
  // to specified node inports without a sending node instance.
  //
  // IIPs are especially useful for sending configuration information
  // to components at FBP network start-up time. This could include
  // filenames to read, or network ports to listen to.
  //
  //     myGraph.addInitial 'somefile.txt', 'Read', 'source'
  //     myGraph.addInitialIndex 'somefile.txt', 'Read', 'source', 2
  //
  // If inports are defined on the graph, IIPs can be applied calling
  // the `addGraphInitial` or `addGraphInitialIndex` methods.
  //
  //     myGraph.addGraphInitial 'somefile.txt', 'file'
  //     myGraph.addGraphInitialIndex 'somefile.txt', 'file', 2
  //
  // Adding an IIP will emit a `addInitial` event.
  public addInitial(data: any, node: any, port: any, metadata: any) {
    if (!this.getNode(node)) {
      return;
    }

    port = this.getPortName(port);
    this.checkTransactionStart();
    let initializer = {
      from: {
        data,
      },
      to: {
        node,
        port,
      },
      metadata,
    };
    this.initializers.push(initializer);
    this.emit("addInitial", initializer);

    this.checkTransactionEnd();
    return initializer;
  }

  public addInitialIndex(
    data: any,
    node: any,
    port: any,
    index: any,
    metadata: any,
  ) {
    if (!this.getNode(node)) {
      return;
    }
    if (index === null) {
      index = undefined;
    }

    port = this.getPortName(port);
    this.checkTransactionStart();
    let initializer = {
      from: {
        data,
      },
      to: {
        node,
        port,
        index,
      },
      metadata,
    };
    this.initializers.push(initializer);
    this.emit("addInitial", initializer);

    this.checkTransactionEnd();
    return initializer;
  }

  public addGraphInitial(data: any, node: any, metadata: any) {
    let inport = this.inports[node];
    if (!inport) {
      return;
    }
    return this.addInitial(data, inport.process, inport.port, metadata);
  }

  public addGraphInitialIndex(data: any, node: any, index: any, metadata: any) {
    let inport = this.inports[node];
    if (!inport) {
      return;
    }
    return this.addInitialIndex(
      data,
      inport.process,
      inport.port,
      index,
      metadata,
    );
  }

  // ## Removing Initial Information Packets
  //
  // IIPs can be removed by calling the `removeInitial` method.
  //
  //     myGraph.removeInitial 'Read', 'source'
  //
  // If the IIP was applied via the `addGraphInitial` or
  // `addGraphInitialIndex` functions, it can be removed using
  // the `removeGraphInitial` method.
  //
  //     myGraph.removeGraphInitial 'file'
  //
  // Remove an IIP will emit a `removeInitial` event.
  public removeInitial(node: any, port: any) {
    let edge;
    port = this.getPortName(port);
    this.checkTransactionStart();

    let toRemove = [];
    let toKeep = [];
    for (let index = 0; index < this.initializers.length; index++) {
      edge = this.initializers[index];
      if (edge.to.node === node && edge.to.port === port) {
        toRemove.push(edge);
      } else {
        toKeep.push(edge);
      }
    }
    this.initializers = toKeep;
    for (edge of Array.from(toRemove)) {
      this.emit("removeInitial", edge);
    }

    return this.checkTransactionEnd();
  }

  public removeGraphInitial(node: any) {
    let inport = this.inports[node];
    if (!inport) {
      return;
    }
    return this.removeInitial(inport.process, inport.port);
  }

  public toDOT() {
    let cleanID = (id: any) => id.replace(/\s*/g, "");
    let cleanPort = (port: any) => port.replace(/\./g, "");

    let dot = "digraph {\n";

    let node: any;
    for (node of Array.from(this.nodes)) {
      dot += `    ${cleanID(node.id)} [label=${node.id} shape=box]\n`;
    }

    for (let id = 0; id < this.initializers.length; id++) {
      var data;
      let initializer = this.initializers[id];
      if (typeof initializer.from.data === "function") {
        data = "Function";
      } else {
        ({ data } = initializer.from);
      }
      dot += `    data${id} [label=\"'${data}'\" shape=plaintext]\n`;
      dot += `    data${id} -> ${cleanID(
        initializer.to.node,
      )}[headlabel=${cleanPort(
        initializer.to.port,
      )} labelfontcolor=blue labelfontsize=8.0]\n`;
    }

    let edge: any;
    for (edge of Array.from(this.edges)) {
      dot += `    ${cleanID(edge.from.node)} -> ${cleanID(
        edge.to.node,
      )}[taillabel=${cleanPort(edge.from.port)} headlabel=${cleanPort(
        edge.to.port,
      )} labelfontcolor=blue labelfontsize=8.0]\n`;
    }

    dot += "}";

    return dot;
  }

  public toYUML() {
    let yuml = [];

    let initializer: any;
    for (initializer of Array.from(this.initializers)) {
      yuml.push(`(start)[${initializer.to.port}]->(${initializer.to.node})`);
    }

    let edge: any;
    for (edge of Array.from(this.edges)) {
      yuml.push(`(${edge.from.node})[${edge.from.port}]->(${edge.to.node})`);
    }
    return yuml.join(",");
  }

  public toJSON() {
    let priv;
    let json = {
      caseSensitive: this.caseSensitive,
      properties: { name: null },
      inports: {},
      outports: {},
      groups: [{}],
      processes: {},
      connections: [{}],
    };

    if (this.name) {
      json.properties.name = this.name;
    }
    for (let property in this.properties) {
      let value = this.properties[property];
      json.properties[property] = value;
    }

    for (var pub in this.inports) {
      priv = this.inports[pub];
      json.inports[pub] = priv;
    }
    for (pub in this.outports) {
      priv = this.outports[pub];
      json.outports[pub] = priv;
    }

    let group: any;
    for (group of Array.from(this.groups)) {
      let groupData = {
        name: group.name,
        nodes: group.nodes,
        metadata: null,
      };
      if (Object.keys(group.metadata).length) {
        groupData.metadata = group.metadata;
      }
      json.groups.push(groupData);
    }

    let node: any;
    for (node of Array.from(this.nodes)) {
      json.processes[node.id] = { component: node.component };
      if (node.metadata) {
        json.processes[node.id].metadata = node.metadata;
      }
    }

    let edge: any;
    for (edge of Array.from(this.edges)) {
      let connection = {
        src: {
          process: edge.from.node,
          port: edge.from.port,
          index: edge.from.index,
        },
        tgt: {
          process: edge.to.node,
          port: edge.to.port,
          index: edge.to.index,
        },
        metadata: null,
      };
      if (Object.keys(edge.metadata).length) {
        connection.metadata = edge.metadata;
      }
      json.connections.push(connection);
    }

    let initializer: any;
    for (initializer of Array.from(this.initializers)) {
      json.connections.push({
        data: initializer.from.data,
        tgt: {
          process: initializer.to.node,
          port: initializer.to.port,
          index: initializer.to.index,
        },
      });
    }

    return json;
  }

  public save(file: any, callback: any) {
    //TODO
    // if (platform.isBrowser()) {
    //   return callback(new Error("Saving graphs not supported on browser"));
    // }

    let json = JSON.stringify(this.toJSON(), null, 4);
    if (!file.match(/\.json$/)) {
      file = `${file}.json`;
    }
    return require("fs").writeFile(file, json, "utf-8", function(
      err: any,
      data: any,
    ) {
      if (err) {
        return callback(err);
      }
      return callback(null, file);
    });
  }
}
Graph.initClass();

export { Graph };

export function createGraph(name: any, options: any) {
  return new Graph(name, options);
}

export function loadJSON(passedDefinition: any, callback: any, metadata: any) {
  let definition, priv, pub;
  if (metadata == null) {
    metadata = {};
  }
  if (typeof passedDefinition === "string") {
    definition = JSON.parse(passedDefinition);
  } else {
    definition = JSON.parse(JSON.stringify(passedDefinition));
  }

  if (!definition.properties) {
    definition.properties = {};
  }
  if (!definition.processes) {
    definition.processes = {};
  }
  if (!definition.connections) {
    definition.connections = [];
  }
  let caseSensitive = definition.caseSensitive || false;

  let graph = new Graph(definition.properties.name, { caseSensitive });

  graph.startTransaction("loadJSON", metadata);
  let properties = {};
  for (let property in definition.properties) {
    let value = definition.properties[property];
    if (property === "name") {
      continue;
    }
    properties[property] = value;
  }
  graph.setProperties(properties);

  for (let id in definition.processes) {
    let def = definition.processes[id];
    if (!def.metadata) {
      def.metadata = {};
    }
    graph.addNode(id, def.component, def.metadata);
  }

  let conn: any;
  for (conn of Array.from(definition.connections)) {
    metadata = conn.metadata ? conn.metadata : {};
    if (conn.data !== undefined) {
      if (typeof conn.tgt.index === "number") {
        graph.addInitialIndex(
          conn.data,
          conn.tgt.process,
          graph.getPortName(conn.tgt.port),
          conn.tgt.index,
          metadata,
        );
      } else {
        graph.addInitial(
          conn.data,
          conn.tgt.process,
          graph.getPortName(conn.tgt.port),
          metadata,
        );
      }
      continue;
    }
    if (
      typeof conn.src.index === "number" ||
      typeof conn.tgt.index === "number"
    ) {
      graph.addEdgeIndex(
        conn.src.process,
        graph.getPortName(conn.src.port),
        conn.src.index,
        conn.tgt.process,
        graph.getPortName(conn.tgt.port),
        conn.tgt.index,
        metadata,
      );
      continue;
    }
    graph.addEdge(
      conn.src.process,
      graph.getPortName(conn.src.port),
      conn.tgt.process,
      graph.getPortName(conn.tgt.port),
      metadata,
    );
  }

  if (definition.inports) {
    for (pub in definition.inports) {
      priv = definition.inports[pub];
      graph.addInport(
        pub,
        priv.process,
        graph.getPortName(priv.port),
        priv.metadata,
      );
    }
  }
  if (definition.outports) {
    for (pub in definition.outports) {
      priv = definition.outports[pub];
      graph.addOutport(
        pub,
        priv.process,
        graph.getPortName(priv.port),
        priv.metadata,
      );
    }
  }

  if (definition.groups) {
    let group: any;
    for (group of Array.from(definition.groups)) {
      graph.addGroup(group.name, group.nodes, group.metadata || {});
    }
  }

  graph.endTransaction("loadJSON");

  return callback(null, graph);
}

export function loadFBP(
  fbpData: any,
  callback: any,
  metadata: any,
  caseSensitive: any,
) {
  let definition;
  if (metadata == null) {
    metadata = {};
  }
  if (caseSensitive == null) {
    caseSensitive = false;
  }
  try {
    definition = require("fbp").parse(fbpData, { caseSensitive });
  } catch (e) {
    return callback(e);
  }
  return exports.loadJSON(definition, callback, metadata);
}

export function loadHTTP(url: any, callback: any) {
  let req = new XMLHttpRequest();
  req.onreadystatechange = function() {
    if (req.readyState !== 4) {
      return;
    }
    if (req.status !== 200) {
      return callback(new Error(`Failed to load ${url}: HTTP ${req.status}`));
    }
    return callback(null, req.responseText);
  };
  req.open("GET", url, true);
  return req.send();
}

export function loadFile(
  file: any,
  callback: any,
  metadata: any,
  caseSensitive: any,
) {
  if (metadata == null) {
    metadata = {};
  }
  if (caseSensitive == null) {
    caseSensitive = false;
  }
  //TODO
  //   if (platform.isBrowser()) {
  //     // On browser we can try getting the file via AJAX
  //     exports.loadHTTP(file, function (err, data) {
  //       if (err) {
  //         return callback(err);
  //       }
  //       if (file.split('.').pop() === 'fbp') {
  //         return exports.loadFBP(data, callback, metadata);
  //       }
  //       let definition = JSON.parse(data);
  //       return exports.loadJSON(definition, callback, metadata);
  //     });
  //     return;
  //   }
  // Node.js graph file
  return require("fs").readFile(file, "utf-8", function(err: any, data: any) {
    if (err) {
      return callback(err);
    }

    if (file.split(".").pop() === "fbp") {
      return exports.loadFBP(data, callback, {}, caseSensitive);
    }

    let definition = JSON.parse(data);
    return exports.loadJSON(definition, callback, {});
  });
}

// remove everything in the graph
let resetGraph = function(graph: any) {
  // Edges and similar first, to have control over the order
  // If we'd do nodes first, it will implicitly delete edges
  // Important to make journal transactions invertible
  let v: any;
  let group: any;
  for (group of Array.from(graph.groups).reverse()) {
    if (group != null) {
      graph.removeGroup(group.name);
    }
  }
  let object = graph.outports;
  for (var port in object) {
    v = object[port];
    graph.removeOutport(port);
  }
  let object1 = graph.inports;
  for (port in object1) {
    v = object1[port];
    graph.removeInport(port);
  }
  // XXX: does this actually null the props??
  graph.setProperties({});

  let iip: any;
  for (iip of Array.from(graph.initializers.reverse())) {
    graph.removeInitial(iip.to.node, iip.to.port);
  }

  let edge: any;
  for (edge of Array.from(graph.edges.reverse())) {
    graph.removeEdge(
      edge.from.node,
      edge.from.port,
      edge.to.node,
      edge.to.port,
    );
  }
  return (() => {
    let result = [];

    let node: any;
    for (node of Array.from(graph.nodes.reverse())) {
      result.push(graph.removeNode(node.id));
    }
    return result;
  })();
};

// Note: Caller should create transaction
// First removes everything in @base, before building it up to mirror @to
let mergeResolveTheirsNaive = function(base: any, to: any) {
  let priv;
  resetGraph(base);

  let node: any;
  for (node of Array.from(to.nodes)) {
    base.addNode(node.id, node.component, node.metadata);
  }

  let edge: any;
  for (edge of Array.from(to.edges)) {
    base.addEdge(
      edge.from.node,
      edge.from.port,
      edge.to.node,
      edge.to.port,
      edge.metadata,
    );
  }

  let iip: any;
  for (iip of Array.from(to.initializers)) {
    base.addInitial(iip.from.data, iip.to.node, iip.to.port, iip.metadata);
  }
  base.setProperties(to.properties);
  for (var pub in to.inports) {
    priv = to.inports[pub];
    base.addInport(pub, priv.process, priv.port, priv.metadata);
  }
  for (pub in to.outports) {
    priv = to.outports[pub];
    base.addOutport(pub, priv.process, priv.port, priv.metadata);
  }
  return Array.from(to.groups).map((group: any) =>
    base.addGroup(group.name, group.nodes, group.metadata),
  );
};

export function equivalent(a: any, b: any, options: any) {
  // TODO: add option to only compare known fields
  // TODO: add option to ignore metadata
  if (options == null) {
    options = {};
  }
  let A = JSON.stringify(a);
  let B = JSON.stringify(b);
  return A === B;
}

export { mergeResolveTheirsNaive as mergeResolveTheirs };
