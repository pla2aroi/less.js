import Node, { INodeOptions, isNodeArgs, NodeArgs } from './node';
import Paren from './paren';
import Comment from './comment';
import Dimension from './dimension';
import * as Constants from '../constants';
const MATH = Constants.Math;

type V1Args = [
    value: Node[],
    noSpacing?: boolean
]
class Expression extends Node {
    type: 'Expression'
    nodes: Node[]
    options: INodeOptions & {
        noSpacing: boolean
    }

    constructor(...args: NodeArgs | V1Args) {
        if (isNodeArgs(args)) {
            super(...args);
            return
        }
        const [value, noSpacing] = args

        if (!value) {
            throw new Error('Expression requires an array parameter');
        }
        super(value, { noSpacing });
    }

    eval(context) {
        let returnValue;
        const mathOn = context.isMathOn();
        const inParenthesis = this.parens;

        let doubleParen = false;
        if (inParenthesis) {
            context.inParenthesis();
        }
        if (this.nodes.length > 1) {
            returnValue = new Expression(this.nodes.map(function (e) {
                if (!e.eval) {
                    return e;
                }
                return e.eval(context);
            }), this.options.noSpacing);
        } else if (this.nodes.length === 1) {
            if (this.nodes[0].parens && !this.nodes[0].parensInOp && !context.inCalc) {
                doubleParen = true;
            }
            returnValue = this.nodes[0].eval(context);
        } else {
            returnValue = this;
        }
        if (inParenthesis) {
            context.outOfParenthesis();
        }
        if (this.parens && this.parensInOp && !mathOn && !doubleParen 
            && (!(returnValue instanceof Dimension))) {
            returnValue = new Paren(returnValue);
        }
        return returnValue;
    }

    genCSS(context, output) {
        for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i].genCSS(context, output);
            if (!this.options.noSpacing && i + 1 < this.nodes.length) {
                output.add(' ');
            }
        }
    }

    throwAwayComments() {
        this.nodes = this.nodes.filter(function(v) {
            return !(v instanceof Comment);
        });
    }
}

Expression.prototype.type = 'Expression';

export default Expression;
