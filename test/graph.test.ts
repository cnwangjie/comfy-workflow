import { type APIFormat, Graph } from '../src'

const graphData = require('./ipa-bypass-cnet.json')
const apiData = require('./ipa-bypass-cnet-api.json')
const fullApiData = require('./ipa-full-api.json')

const isEqualWorkflow = (a: APIFormat.Workflow, b: APIFormat.Workflow) => {
  for (const [nodeId, node] of Object.entries(a)) {
    if (!node.inputs) {
      expect(b[nodeId].inputs).toBeUndefined()
    }
    for (const [key, value] of Object.entries(node.inputs)) {
      if (Array.isArray(value) && value.length === 2) {
        expect(b[nodeId].inputs[key]).toEqual(value)
      }
    }
  }
}

describe('Graph', () => {
  describe('toApiFormat', () => {
    it('should return same with original data', () => {
      const graph = new Graph()
      graph.deserialize(graphData)
      const actualWorkflow = graph.toWorkflow()
      expect(Object.keys(actualWorkflow).sort()).toEqual(
        Object.keys(apiData).sort(),
      )
      isEqualWorkflow(actualWorkflow, apiData)
    })
  })

  describe('fromApiFormat', () => {
    it('should parse api format correctly', () => {
      const graph = Graph.fromWorkflow(fullApiData)
      graph.bypassNodeById(38, true) // bypass cnet
      const actualWorkflow = graph.toWorkflow()
      isEqualWorkflow(actualWorkflow, apiData)
    })
  })
})
