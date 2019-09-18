import Node from '../node'

/**
 * A () [] or {} block that holds an expression
 * Previously named 'Paren'
 * 
 * value will typically be [Anonymous<'('>, Node, Anonymous<')'>]
 */
class Block extends Node {}
Block.prototype.type = 'Block'
export default Block