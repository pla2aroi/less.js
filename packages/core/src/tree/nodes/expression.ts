import { Context, Node, NodeArray, Null, Comment, List, WS } from '.'

export type IExpressionOptions = {
  inParens?: boolean
  parensInOp?: boolean
}

/**
 * An expression is an arbitrary list of nodes,
 * but has two unique properties:
 *   1) It switches the way math is evaluated based on blocks
 *   2) When converted to an array, it discards whitespace and
 *      comments as members of the array.
 *
 * e.g. one + two: [<Value 'one'><Op ' + '><Value 'two'>]
 *      one two <Expression <Value 'one'><Value {pre: ' ', text: 'two'}>>
 *      prop: foo --> value part is <Expression { pre: ' ', nodes: [<Value 'foo'>] }>
 *
 * A selector expression is just:
 *      #foo ~ .bar [<Value '#foo'><Op ' ~ '><Value '.bar'>]
 */
export class Expression<T extends Node = Node> extends NodeArray {
  options: IExpressionOptions
  nodes: T[]

  toArray() {
    return this.nodes.filter(node => !(node instanceof WS) && !(node instanceof Comment))
  }

  /**
   * If an evaluated Node in an expression returns a list (such as Element),
   * then we need to merge the list with the surrounding nodes.
   *
   * We also flatten expressions within expressions to be a flat node list.
   */
  eval(context: Context): Expression | List | Node {
    if (!this.evaluated) {
      super.eval(context)

      const expressions: Expression[] = []

      const processNodes = (expr: Node) => {
        let nodes = expr.nodes
        let nodesLength = nodes.length
        for (let i = 0; i < nodesLength; i++) {
          const node = nodes[i]
          if (node instanceof List) {
            node.nodes.forEach((listItem: Node) => {
              const newNodes: Node[] = nodes.map((n: Node, x) => {
                if (x === i) {
                  return new Null().inherit(n)
                }
                return n.clone()
              })
              newNodes[i] = listItem.clone()
              expressions.push(new Expression(newNodes))
            })
            expressions.forEach(expr => {
              processNodes(expr)
            })
            break
          } else if (node instanceof Expression) {
            /** Flatten sub-expressions */
            const exprNodes = node.nodes
            const exprNodesLength = exprNodes.length
            nodes = nodes
              .splice(0, i)
              .concat(exprNodes)
              .concat(nodes.splice(i + 1))
            expr.nodes = nodes
            nodesLength += exprNodesLength
            i += exprNodesLength
            processNodes(node)
          }
        }
      }

      processNodes(this)

      const numExpressions = expressions.length

      if (numExpressions === 0) {
        return this
      } else if (numExpressions === 1) {
        return expressions[0].inherit(this)
      } else {
        return new List(expressions).inherit(this)
      }
    }
    return this
  }
  /**
   * @todo - why not just do enter / exit block in the block node?
   */
  // eval(context: Context) {
  //   const { inBlock, blockInOp } = this.options
  //   let returnValue: any
  //   const mathOn = context.isMathOn()

  //   const inParenthesis = inBlock && !blockInOp

  //   let doubleParen = false
  //   if (inParenthesis) {
  //     context.enterBlock()
  //   }
  //   if (this.nodes.length > 1) {
  //     returnValue = super.eval(context)
  //   } else if (this.nodes.length === 1) {
  //     const value = this.nodes[0]
  //     if (
  //       value instanceof Expression &&
  //       value.options.inBlock &&
  //       value.options.blockInOp &&
  //       !context.inCalc
  //     ) {
  //       doubleParen = true
  //     }
  //     returnValue = value.eval(context)
  //     if (returnValue instanceof Node) {
  //       returnValue.inherit(this)
  //     }
  //   } else {
  //     returnValue = this
  //   }
  //   if (inParenthesis) {
  //     context.exitBlock()
  //   }
  //   if (inBlock && blockInOp && !mathOn && !doubleParen
  //     && (!(returnValue instanceof Dimension))) {
  //     returnValue = new Block(returnValue, {}, this.location).inherit(this)
  //   }
  //   return returnValue
  // }

  throwAwayComments() {
    this.nodes = this.nodes.filter(v => !(v instanceof Comment))
  }
}

Expression.prototype.type = 'Expression'
