import EventEmitter from "events";

const entryToPrettyString = (entry: any) => {
  const a = entry.args;
  switch (entry.cmd) {
    case "addNode":
      return `${a.id}(${a.component})`;
    case "removeNode":
      return `DEL ${a.id}(${a.component})`;
    case "renameNode":
      return `RENAME ${a.oldId} ${a.newId}`;
    case "changeNode":
      return `META ${a.id}`;
    case "addEdge":
      return `${a.from.node} ${a.from.port} -> ${a.to.port} ${a.to.node}`;
    case "removeEdge":
      return `${a.from.node} ${a.from.port} -X> ${a.to.port} ${a.to.node}`;
    case "changeEdge":
      return `META ${a.from.node} ${a.from.port} -> ${a.to.port} ${a.to.node}`;

    //TODO : comeback with other cases.

    default:
      throw `Unknown journal entry: ${entry.cmd}`;
  }
};
