import * as APIFormat from './api-format'

export class NodeOutput {
  constructor(
    public workflow: Workflow,
    public node: Node,
    public index: number,
  ) {}

  toApiFormat(): APIFormat.Output {
    return [this.node.id, this.index]
  }
}

export class Node {
  inputs: Map<string, APIFormat.InputValue | NodeOutput> = new Map()

  constructor(
    public workflow: Workflow,
    public id: string,
    public classType: string,
    public meta?: Record<string, any>,
  ) {}

  output(index: number): NodeOutput {
    return new NodeOutput(this.workflow, this, index)
  }

  setInput(name: string, value: APIFormat.InputValue) {
    this.inputs.set(name, value)
    return this
  }

  setInputs(inputs: Record<string, APIFormat.InputValue>) {
    for (const [name, value] of Object.entries(inputs)) {
      this.setInput(name, value)
    }
    return this
  }

  toApiFormat(): APIFormat.Node {
    const inputs: APIFormat.Inputs = {}
    for (const [name, value] of this.inputs) {
      inputs[name] =
        value instanceof NodeOutput ? [value.node.id, value.index] : value
    }
    return {
      class_type: this.classType,
      inputs,
      _meta: this.meta,
    }
  }
}

export class Workflow {
  protected index = 0
  protected nodes: Map<string, Node> = new Map()

  constructor() {}

  genId() {
    while (true) {
      this.index += 1
      const id = `${this.index}`
      if (!this.nodes.has(id)) return id
    }
  }

  node(classType: string, nodeId = this.genId(), meta?: Record<string, any>) {
    const node = new Node(this, nodeId, classType, meta)
    this.nodes.set(nodeId, node)
    return node
  }

  getNode(id: string) {
    return this.nodes.get(id)
  }

  toApiFormat() {
    const r: APIFormat.Workflow = {}
    for (const [nodeId, node] of this.nodes) {
      r[nodeId] = node.toApiFormat()
    }
    return r
  }

  static fromApiFormat(workflow: APIFormat.Workflow) {
    return new Workflow().mergeApiFormat(workflow)
  }

  merge(workflow: Workflow) {
    return this.mergeApiFormat(workflow.toApiFormat())
  }

  mergeApiFormat(workflow: APIFormat.Workflow) {
    const w = this

    for (const [nodeId, node] of Object.entries(workflow)) {
      const n = new Node(w, nodeId, node.class_type, node._meta)
      w.nodes.set(nodeId, n)
    }

    for (const [nodeId, node] of Object.entries(workflow)) {
      const n = w.nodes.get(nodeId)!
      for (const [name, value] of Object.entries(node.inputs)) {
        if (APIFormat.isOutput(value)) {
          const t = w.nodes.get(value[0])
          if (!t)
            throw new Error(
              `Invalid workflow format: node "${value[0]}" not found`,
            )
          n.setInput(name, t.output(value[1]))
        } else {
          n.setInput(name, value)
        }
      }
    }

    return w
  }
}
