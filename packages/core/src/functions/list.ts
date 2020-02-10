import {
  Comment,
  Dimension,
  Declaration,
  Expression,
  Rules,
  Node,
  Num,
  Selector,
  // Element,
  // Mixin,
  Quoted,
  WS
} from '../tree/nodes'

import { define } from './helpers'

export const _SELF = define(function (n: Node) {
  return n
}, [Node])
export const extract = define(function (value: Node, index: Num) {
  // (1-based index)
  let i = index.value - 1

  return value.toArray()[i]
}, [Node], [Num])

export const length = define(function (value: Node) {
  return new Num(value.toArray().length)
}, [Node])

/**
 * Creates a Less list of incremental values.
 * Modeled after Lodash's range function, also exists natively in PHP
 *
 * @param start
 * @param end  - e.g. 10 or 10px - unit is added to output
 * @param step
 */
export const range = define(function (start: Num | Dimension, end: Num | Dimension, step: Num) {
  let from: number
  let to: Node
  let stepValue = 1
  const list = []
  if (end) {
    to = end
    from = start.value
    if (step) {
      stepValue = step.value
    }
  } else {
    from = 1
    to = start
  }
  let unit: string
  if (to instanceof Dimension) {
    unit = to.nodes[1].value
  }
  const listValue = unit
    ? (val: number) => new Dimension([val, unit])
    : (val: number) => new Num(val)

  for (let i = from; i <= to.value; i += stepValue) {
    list.push(listValue(i))
    list.push(new WS())
  }
  if (list.length > 1) {
    list.pop()
  }

  return new Expression(list)
}, [Num, Dimension], [Num, Dimension], [Num])

export const each = define(function (list: Node, rs: Mixin) {
  const rules = []
  let newRules
  let iterator

  if (list.value && !(list instanceof Quote)) {
    if (Array.isArray(list.value)) {
      iterator = list.value
    } else {
      iterator = [list.value]
    }
  } else if (list.ruleset) {
    iterator = list.ruleset.rules
  } else if (list.rules) {
    iterator = list.rules
  } else if (Array.isArray(list)) {
    iterator = list
  } else {
    iterator = [list]
  }

  let valueName = '@value'
  let keyName = '@key'
  let indexName = '@index'

  if (rs.params) {
    valueName = rs.params[0] && rs.params[0].name
    keyName = rs.params[1] && rs.params[1].name
    indexName = rs.params[2] && rs.params[2].name
    rs = rs.rules
  } else {
    rs = rs.ruleset
  }

  for (let i = 0; i < iterator.length; i++) {
    let key
    let value
    const item = iterator[i]
    if (item instanceof Declaration) {
      key = typeof item.name === 'string' ? item.name : item.name[0].value
      value = item.value
    } else {
      key = new Dimension(i + 1)
      value = item
    }

    if (item instanceof Comment) {
      continue
    }

    newRules = rs.rules.slice(0)
    if (valueName) {
      newRules.push(
        new Declaration(valueName, value, false, false, this.index, this.currentFileInfo)
      )
    }
    if (indexName) {
      newRules.push(
        new Declaration(
          indexName,
          new Dimension(i + 1),
          false,
          false,
          this.index,
          this.currentFileInfo
        )
      )
    }
    if (keyName) {
      newRules.push(new Declaration(keyName, key, false, false, this.index, this.currentFileInfo))
    }

    rules.push(
      new Ruleset(
        [new Selector([new Element('', '&')])],
        newRules,
        rs.strictImports,
        rs.visibilityInfo()
      )
    )
  }

  return new Ruleset(
    [new Selector([new Element('', '&')])],
    rules,
    rs.strictImports,
    rs.visibilityInfo()
  ).eval(this.context)
}, [Num, Dimension], [Num, Dimension], [Num])
