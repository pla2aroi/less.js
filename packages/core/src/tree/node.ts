import { CstNodeLocation } from 'chevrotain'
import { RewriteUrlMode } from '../constants'
import { IOptions } from '../options'
import { EvalContext } from '../contexts'

export type SimpleValue = string | number | boolean | number[] | string[]
export type ISimpleProps = {
  /**
   * Primitive or simple representation of value.
   * This is used in valueOf() for math operations,
   * and also in indexing and lookups for some nodes
   */
  value?: SimpleValue
  /**
   * The reason this exists in addition to value is that this is the
   * ACTUAL text representation of value
   *   e.g. 1) a color may have a value of [0, 0, 0, 1], but a text value of 'black'
   *        2) an element's simple selector may have a value of '[foo="bar"]',
   *           but a text value of '[foo=bar]' (for normalization)
   */
  text?: string
}

/**
 * The result of an eval can be one of these types
 */
export type EvalReturn = Node[] | Node | false

export interface IChildren {
  /**
   * Used when the value of a node can be represented by a single list of Nodes
   */
  values?: Node[]
  [key: string]: Node[]
}

export type ProcessFunction = (node: Node) => EvalReturn

export type IProps = Node[] | (ISimpleProps & IChildren)
export interface ILocationInfo extends CstNodeLocation {}
/**
 * In practice, this will probably be inherited through the prototype chain
 * during creation.
 * 
 * So the "own properties" should be CstNodeLocation info, but should do an
 * Object.create() from the location info of the stylesheet root location info
 */
export interface IFileInfo {
  filename: string
  currentDirectory: string
  entryPath: string
}

export type IRootOptions = {
  /** Passed in for every file root node */
  fileInfo?: IFileInfo
  /** Only one node, the root node, should pass this in */
  options?: IOptions
}

export type INodeOptions = IRootOptions & {
  [key: string]: boolean | number
}

export abstract class Node {

  /** This will always be present as an array, even if it is empty */
  values: Node[]
  children: IChildren
  childKeys: string[]

  /** Used if string does not equal normalized primitive */
  value: SimpleValue
  text: string

  options: INodeOptions
  evalOptions: IOptions
  fileInfo: IFileInfo

  /**
   * This will be the start values from the first token and the end
   * values from the last token, as well as file info
   */
  location: ILocationInfo

  parent: Node
  root: Node
  fileRoot: Node

  visibilityBlocks: number
  
  // false - the node must not be visible
  // true - the node must be visible
  // undefined or null - the node has the same visibility as its parent
  // renamed from nodeVisible
  isVisible: boolean

  type: string
  evaluated: boolean

  constructor(props: IProps, opts: INodeOptions = {}, location?: ILocationInfo) {
    if (Array.isArray(props)) {
      const values = props
      this.children = { values }
      this.values = values
      this.childKeys = ['values']
    } else {
      const { value, text, ...children } = props

      this.children = children
      if (!children.values) {
        this.children.values = []
      }
      this.values = this.children.values
      this.childKeys = Object.keys(children)
      this.value = value
      this.text = text
    }
    
    this.setParent()
    this.location = location
  
    const { fileInfo, options, ...rest } = opts
    this.options = rest
    if (options) {
      this.root = this
      this.evalOptions = options
    }
    if (fileInfo) {
      this.fileRoot = this
      this.fileInfo = fileInfo
    }

    this.evaluated = false
    this.visibilityBlocks = 0
  }

  protected setParent() {
    this.childKeys.forEach(key => {
      const nodes = this.children[key]
      nodes.forEach(node => {
        node.parent = this
        if (!node.fileRoot) {
          node.fileRoot = this.fileRoot
        }
        if (!node.root) {
          node.root = this.root
        }
      })
    })
  }

  protected normalizeValues(values: Node | Node[]): Node[] {
    if (!Array.isArray(values)) {
      if (values === undefined) {
        return []
      }
      return [values]
    }
    return values
  }

  accept(visitor) {
    this.processChildren(this, (node: Node) => visitor.visit(node))
  }

  valueOf() {
    if (this.value !== undefined) {
      return this.value
    }
    if (this.text !== undefined) {
      return this.text
    }
    return this.values.join('')
  }

  toString() {
    if (this.text !== undefined) {
      return this.text
    }
    if (this.value !== undefined) {
      return this.value.toString()
    }
    return this.values.join('')
  }

  /**
   * Derived nodes can pass in context to eval and clone at the same time
   */
  clone(context?: EvalContext): any {
    const Clazz = Object.getPrototypeOf(this)
    const newNode = new Clazz({
      value: this.value,
      text: this.text
    /** For now, there's no reason to mutate this.location, so its reference is just copied */
    }, {...this.options}, this.location)

    newNode.childKeys = [...this.childKeys]
    this.processChildren(newNode, (node: Node) => node.clone(context))
    newNode.values = newNode.children.values
  
    if (context) {
      newNode.evaluated = true
    } else {
      newNode.evaluated = this.evaluated
    }
    /** Copy basic node props */
    newNode.parent = this.parent
    newNode.root = this.root
    newNode.fileRoot = this.fileRoot
    newNode.fileInfo = this.fileInfo
    newNode.evalOptions = this.evalOptions
    newNode.visibilityBlocks = this.visibilityBlocks
    newNode.isVisible = this.isVisible
    newNode.type = this.type

    return newNode
  }

  protected getFileInfo(): IFileInfo {
    return this.fileRoot.fileInfo
  }

  /**
   * This is an in-place mutation of a node array
   * 
   * Unresolved Q: would a new array be more performant than array mutation?
   * The reason we do this is because the array may not mutate at all depending
   * on the result of processing
   * 
   * This also allows `this.value` to retain a pointer to `this.children.value`
   */
  protected processNodeArray(nodeArray: Node[], processFunc: ProcessFunction) {
    let thisLength = nodeArray.length
    for (let i = 0; i < thisLength; i++) {
      const item = nodeArray[i]
      const node = processFunc(item)
      if (Array.isArray(node)) {
        const nodeLength = node.length
        if (node.length === 0) {
          nodeArray.splice(i, 1)
          i--
          continue
        }
        else {
          nodeArray.splice(i, 1, ...node)
          thisLength += nodeLength
          i += nodeLength
          continue
        }
      }
      if (node === undefined || node === null || node === false) {
        nodeArray.splice(i, 1)
        i--
        continue
      }
      nodeArray[i] = node
    }
    return nodeArray
  }

  protected processChildren(node: Node, processFunc: ProcessFunction) {
    this.childKeys.forEach(key => {
      let nodes = this.children[key]
      if (nodes) {
        if (node !== this) {
          nodes = [...nodes]
          node.children[key] = this.processNodeArray(nodes, processFunc)
        } else {
          this.processNodeArray(nodes, processFunc)
        }
      }
    })
  }

  /**
   * By default, nodes will just evaluate nested values
   * However, some nodes after evaluating will of course override
   * this to produce different node types or primitive values
   */
  eval(context?: EvalContext): any {
    if (!this.evaluated) {
      this.processChildren(this, (node: Node) => node.eval(context))
    }
    this.evaluated = true
    return this
  }

  /**
   * Output is a kind of string builder?
   * @todo - All genCSS and toCSS will get moved out of the AST and
   *         into visitor processing.
  */
  genCSS(output: any, context?: EvalContext) {
    output.add(this.toString())
  }

  // Returns true if this node represents root of ast imported by reference
  // blocksVisibility() {
  //     if (this.visibilityBlocks == null) {
  //         this.visibilityBlocks = 0;
  //     }
  //     return this.visibilityBlocks !== 0;
  // }

  // addVisibilityBlock() {
  //     if (this.visibilityBlocks == null) {
  //         this.visibilityBlocks = 0;
  //     }
  //     this.visibilityBlocks = this.visibilityBlocks + 1;
  // }

  // removeVisibilityBlock() {
  //     if (this.visibilityBlocks == null) {
  //         this.visibilityBlocks = 0;
  //     }
  //     this.visibilityBlocks = this.visibilityBlocks - 1;
  // }

  // Turns on node visibility - if called node will be shown in output regardless
  // of whether it comes from import by reference or not
  // ensureVisibility() {
  //     this.nodeVisible = true;
  // }

  // Turns off node visibility - if called node will NOT be shown in output regardless
  // of whether it comes from import by reference or not
  // ensureInvisibility() {
  //     this.nodeVisible = false;
  // }

  // return values:
  // isVisible() {
  //     return this.nodeVisible;
  // }

  // visibilityInfo() {
  //     return {
  //         visibilityBlocks: this.visibilityBlocks,
  //         nodeVisible: this.nodeVisible
  //     };
  // }

  copyVisibilityInfo(info: {isVisible: boolean; visibilityBlocks: number }) {
    if (!info) {
      return
    }
    this.visibilityBlocks = info.visibilityBlocks
    this.isVisible = info.isVisible
  }
}

export default Node