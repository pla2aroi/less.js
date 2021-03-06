import { Dimension } from '../nodes'

const unitConversions: { [k: string]: any } = {
  length: {
    m: 1,
    cm: 0.01,
    mm: 0.001,
    in: 0.0254,
    px: 0.0254 / 96,
    pt: 0.0254 / 72,
    pc: (0.0254 / 72) * 12
  },
  duration: {
    s: 1,
    ms: 0.001
  },
  angle: {
    rad: 1 / (2 * Math.PI),
    deg: 1 / 360,
    grad: 1 / 400,
    turn: 1
  }
}

let keyed = false

export const convertDimension = (node: Dimension, toUnit: string) => {
  if (!(node instanceof Dimension)) {
    return
  }
  if (!keyed) {
    /** Simplify lookups */
    Object.keys(unitConversions).forEach((key: 'length' | 'duration' | 'angle') => {
      Object.keys(unitConversions[key]).forEach(unit => (unitConversions[unit] = key))
    })
    keyed = true
  }
  const fromUnit = node.nodes[1].value
  const fromType = unitConversions[fromUnit]
  const toType = unitConversions[toUnit]

  if (!fromType || !toType || fromType !== toType) {
    return
  }

  const fromFactor = unitConversions[fromType][fromUnit]
  const toFactor = unitConversions[toType][toUnit]

  const fromValue = node.value

  /** @todo - needs unit testing */
  const result = (fromValue * fromFactor * toFactor) / fromFactor

  return new Dimension([result, toUnit])
}
