import { Graph } from '../src'

describe('Graph', () => {
  describe('toApiFormat', () => {
    it('should return same with original data', () => {
      const graph = new Graph()
      const graphData = require('./ipa-bypass-cnet.json')
      const apiData = require('./ipa-bypass-cnet-api.json')
      graph.deserialize(graphData)
      const actualWorkflow = graph.toWorkflow()
      expect(Object.keys(actualWorkflow).sort()).toEqual(
        Object.keys(apiData).sort(),
      )

      for (const [nodeId, node] of Object.entries(actualWorkflow)) {
        if (!node.inputs) {
          expect(apiData[nodeId].inputs).toBeUndefined()
        }
        for (const [key, value] of Object.entries(node.inputs)) {
          if (Array.isArray(value) && value.length === 2) {
            expect(apiData[nodeId].inputs[key]).toEqual(value)
          }
        }
      }
    })
  })
})
