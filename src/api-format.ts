export interface Workflow {
  [key: string]: Node
}
export interface Node {
  inputs: Inputs
  class_type: string
  _meta?: Record<string, any>
}
export type InputValue = string | number | boolean | object
export interface Inputs {
  [key: string]: InputValue | Output
}
export type Output = [string, number]

export const isOutput = (v: unknown): v is Output => {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === 'string' &&
    typeof v[1] === 'number'
  )
}
