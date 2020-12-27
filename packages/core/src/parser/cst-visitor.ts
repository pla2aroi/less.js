import { CstChild, CstNode, IToken } from '@less/css-parser'
import { isToken, processWS } from './util'
import {
  Node,
  Rule,
  Rules,
  Value,
  Expression,
  List,
  MergeType,
  Declaration,
  IDeclarationProps,
  Op,
  Num,
  Operation,
  Name,
  Paren,
  WS,
  Comment,
  Dimension,
  Color,
  Selector,
  RulesCall
} from '../tree/nodes'
export class CstVisitor {
  [k: string]: any

  visit(ctx: CstChild): any {
    if (!ctx) {
      return
    }
    if (isToken(ctx)) {
      const {
        image,
        startLine,
        startColumn,
        startOffset,
        endLine,
        endColumn,
        endOffset
      } = ctx
      return new Value(
        image,
        {},
        {
          startLine,
          startColumn,
          startOffset,
          endLine,
          endColumn,
          endOffset
        }
      )
    }
    const visit = this[ctx.name]
    return visit ? visit.call(this, ctx) : {}
  }

  visitArray(coll: CstChild[]) {
    return coll.map(node => this.visit(node))
  }

  /** Start building AST */
  root({ children, location }: CstNode) {
    const nodes = this.visitArray(children)
    return new Rules(nodes, {}, location)
  }

  rule({ children, location }: CstNode) {
    let [pre, rule] = children
    const ws = processWS(<IToken>pre)
    const node = this.visit(rule)
    node.pre = ws
    return node
  }

  qualifiedRule({ children, location }: CstNode) {

  }

  compoundSelector({ children, location }: any) {
    return children
  }
}

export default new CstVisitor()