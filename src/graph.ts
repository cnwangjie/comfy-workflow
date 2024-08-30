import { APIFormat } from '.'
import { type ComfyNode, zComfyWorkflow } from './graph-json'

export type ID = string | number
export type Vector2 = [number, number]
export type Vector4 = [number, number, number, number]

export class GraphLink {
  constructor(
    public id: number,
    public type: string,
    public srcId: ID,
    public srcSlot: number,
    public dstId: ID,
    public dstSlot: number,
  ) {}
}

export class NodeSlot {
  constructor(
    public name: string,
    public type: string,
    public rest: object = {},
  ) {}
}

export class NodeInputSlot extends NodeSlot {
  constructor(
    public name: string,
    public type: string,
    public link: number | null,
    public extra: object = {},
  ) {
    super(name, type, extra)
  }
}

export class NodeOutputSlot extends NodeSlot {
  constructor(
    public name: string,
    public type: string,
    public links: number[] | null,
    public extra: object = {},
  ) {
    super(name, type, extra)
  }
}

export class GraphNode {
  constructor(
    public graph: Graph,
    public id: ID,
    public type: string,
    public pos: Vector2 = [0, 0],
    public size: Vector2 = [0, 0],
    public flags: object = {},
    public order = 0,
    public mode = 0,
    public inputs: NodeInputSlot[] = [],
    public outputs: NodeOutputSlot[] = [],
    public properties: object = {},
    public widgets_values: unknown[] = [],
  ) {}

  static fromJSON(graph: Graph, node: ComfyNode) {
    const inputs = node.inputs?.map(({ name, type, link, ...extra }) => {
      return new NodeInputSlot(name, type, link, extra)
    })

    const outputs = node.outputs?.map(({ name, type, links, ...extra }) => {
      return new NodeOutputSlot(name, type, links, extra)
    })

    return new GraphNode(
      graph,
      node.id,
      node.type,
      node.pos,
      [node.size[0], node.size[1]],
      node.flags,
      node.order,
      node.mode,
      inputs,
      outputs,
      node.properties,
      node.widgets_values,
    )
  }

  getInputNode(slot: number) {
    if (!this.inputs) return null
    if (slot >= this.inputs.length) return null
    const input = this.inputs[slot]
    if (input?.link == null) return null
    const link_info = this.graph.links.get(input.link)
    if (!link_info) return null
    return this.graph.getNodeById(link_info.srcId)
  }

  getInputLink(slot: number) {
    if (!this.inputs) return null
    const slot_info = this.inputs[slot]
    if (slot_info.link == null) return null
    return this.graph.links.get(slot_info.link)
  }

  findOutputSlot(name: string): number
  findOutputSlot(name: string, returnObj: true): NodeOutputSlot
  findOutputSlot(name: string, returnObj = false) {
    if (!this.outputs) {
      return -1
    }
    for (const [i, output] of this.outputs.entries()) {
      if (name === output.name) {
        return !returnObj ? i : output
      }
    }
    return -1
  }

  connect(slot: number, targetNode: GraphNode, targetSlot = 0) {
    if (!this.outputs || slot >= this.outputs.length) {
      return null
    }
    // avoid loopback
    if (targetNode === this) {
      return null
    }

    const input = targetNode.inputs[targetSlot]
    if (!input) return null
    const output = this.outputs[slot]

    if (!output) return null

    // if there is something already plugged there, disconnect
    if (targetNode.inputs[targetSlot].link != null) {
      targetNode.inputs[targetSlot].link = null
    }

    const nextId = ++this.graph.lastLinkId

    // create link class
    const link = new GraphLink(
      nextId,
      input.type || output.type,
      this.id,
      slot,
      targetNode.id,
      targetSlot,
    )

    // add to graph links list
    this.graph.links.set(link.id, link)

    // connect in output
    if (output.links == null) {
      output.links = []
    }
    output.links.push(link.id)
    // connect in input
    targetNode.inputs[targetSlot].link = link.id
    return link
  }
}

export class GraphGroup {
  constructor(
    public title: string,
    public bounding: Vector4,
    public color: string,
    public fontSize: number,
    public locked = false,
  ) {}
}

export class Graph {
  public lastNodeId: ID = 0
  public lastLinkId = 0
  public nodes: Record<ID, GraphNode> = {}
  public links: Map<number, GraphLink> = new Map()
  public groups: GraphGroup[] = []
  public config: Record<string, unknown> = {}
  public extra: object = {}
  public version = 0

  clear() {
    this.lastNodeId = 0
    this.lastLinkId = 0
    this.nodes = {}
    this.links = new Map()
    this.groups = []
    this.config = {}
    this.extra = {}
    this.version = 0
    return this
  }

  deserialize(json: unknown) {
    this.clear()
    const data = zComfyWorkflow.parse(json)
    this.lastNodeId = data.last_node_id
    this.lastLinkId = data.last_link_id
    for (const node of data.nodes) {
      this.nodes[node.id] = GraphNode.fromJSON(this, node)
    }
    for (const [id, srcId, srcSlot, dstId, dstSlot, type] of data.links) {
      if (
        srcId == null ||
        srcSlot == null ||
        dstId == null ||
        dstSlot == null
      ) {
        continue
      }
      this.links.set(
        id,
        new GraphLink(id, type, srcId, srcSlot, dstId, dstSlot),
      )
    }
    if (data.groups) {
      for (const group of data.groups) {
        this.groups.push(
          new GraphGroup(
            group.title,
            group.bounding,
            group.color,
            group.font_size,
            group.locked,
          ),
        )
      }
    }
    if (data.config) {
      this.config = data.config
    }
    if (data.extra) {
      this.extra = data.extra
    }
    this.version = data.version
    return this
  }

  toWorkflow() {
    const output: APIFormat.Workflow = {}
    for (const node of this.computeExecutionOrder()) {
      const skipNode = node.mode === 2 || node.mode === 4

      // if (node.isVirtualNode) {
      //   continue
      // }

      if (node.mode === 2 || node.mode === 4) {
        // Don't serialize muted nodes
        continue
      }

      const inputs: APIFormat.Inputs = {}
      // const widgets = node.widgets

      // // Store all widget values
      // if (widgets) {
      //   for (const i in widgets) {
      //     const widget = widgets[i]
      //     if (!widget.options || widget.options.serialize !== false) {
      //       inputs[widget.name] = widget.serializeValue
      //         ? await widget.serializeValue(node, i)
      //         : widget.value
      //     }
      //   }
      // }

      // Store all node links
      for (let i = 0; i < node.inputs.length; i += 1) {
        let parent = node.getInputNode(i)
        if (!parent) continue
        let link = node.getInputLink(i)
        while (parent && parent.mode === 4) {
          let found = false
          if (link && parent.mode === 4) {
            const all_inputs = [link.srcSlot]
            if (parent.inputs) {
              for (let j = 0; j < parent.inputs.length; j += 1) {
                all_inputs.push(j)
              }
              for (const parent_input of all_inputs) {
                if (parent.inputs[parent_input]?.type === node.inputs[i].type) {
                  link = parent.getInputLink(parent_input)
                  if (link) {
                    parent = parent.getInputNode(parent_input)
                  }
                  found = true
                  break
                }
              }
            }
          }

          if (!found) {
            break
          }
        }

        if (link) {
          // if (parent?.updateLink) {
          //   link = parent.updateLink(link)
          // }
          if (link) {
            inputs[node.inputs[i].name] = [String(link.srcId), link.srcSlot]
          }
        }
      }

      const node_data = {
        inputs,
        class_type: node.type,
      }

      output[node.id] = node_data
    }

    return output
  }

  nodeCount() {
    return Object.keys(this.nodes).length
  }

  getNodeById(id: ID) {
    return this.nodes[id]
  }

  computeExecutionOrder() {
    const L = []
    const S: GraphNode[] = []
    const M: Record<ID, GraphNode> = {}
    const visited_links: Record<number, boolean> = {} //to avoid repeating links
    const remaining_links: Record<ID, number> = {} //to a

    //search for the nodes without inputs (starting nodes)
    for (const node of Object.values(this.nodes)) {
      M[node.id] = node //add to pending nodes

      let num = 0 //num of input connections
      if (node.inputs) {
        for (const input of node.inputs) {
          if (input.link != null) {
            num += 1
          }
        }
      }

      if (num === 0) {
        //is a starting node
        S.push(node)
      } //num of input links
      else {
        remaining_links[node.id] = num
      }
    }

    while (S.length > 0) {
      //get an starting node
      const node = S.shift()
      if (!node) throw new Error('unreachable')
      L.push(node) //add to ordered list
      delete M[node.id] //remove from the pending nodes

      if (!node.outputs.length) continue

      //for every output
      for (const output of node.outputs) {
        //not connected
        if (!output.links?.length) continue

        //for every connection
        for (const linkId of output.links) {
          const link = this.links.get(linkId)
          if (!link) continue

          //already visited link (ignore it)
          if (visited_links[link.id]) continue

          const target_node = this.getNodeById(link.dstId)
          if (target_node == null) {
            visited_links[link.id] = true
            continue
          }

          visited_links[link.id] = true //mark as visited
          remaining_links[target_node.id] -= 1 //reduce the number of links remaining
          if (remaining_links[target_node.id] === 0) {
            S.push(target_node)
          } //if no more links, then add to starters array
        }
      }
    }

    //the remaining ones (loops)
    for (const i in M) {
      L.push(M[i])
    }

    //save order number in the node
    for (let i = 0; i < L.length; i += 1) {
      L[i].order = i
    }

    return L
  }

  bypassNodeById(nodeId: ID, bypass = true) {
    const node = this.getNodeById(nodeId)
    if (node) node.mode = bypass ? 4 : 0
  }

  static fromWorkflow(workflow: APIFormat.Workflow) {
    const graph = new Graph()
    for (const [id, data] of Object.entries(workflow)) {
      graph.nodes[id] = new GraphNode(graph, id, data.class_type)
    }

    for (const [id, node] of Object.entries(graph.nodes)) {
      const data = workflow[id]
      for (const input in data.inputs ?? {}) {
        const value = data.inputs[input]
        if (APIFormat.isOutput(value)) {
          const [fromId, fromSlot] = value
          const fromNode = graph.getNodeById(fromId)
          const toSlot = node.inputs?.findIndex(inp => inp.name === input)
          // FIXME: lost the following logic because it requires the widget data
          // if (toSlot == null || toSlot === -1) {
          // 	try {
          // 		// Target has no matching input, most likely a converted widget
          // 		const widget = node.widgets?.find((w) => w.name === input);
          // 		if (widget && node.convertWidgetToInput?.(widget)) {
          // 			toSlot = node.inputs?.length - 1;
          // 		}
          // 	} catch (error) {}
          // }
          if (toSlot != null || toSlot !== -1) {
            fromNode.connect(fromSlot, node, toSlot)
          }
        }
      }
    }
    return graph
  }
}
