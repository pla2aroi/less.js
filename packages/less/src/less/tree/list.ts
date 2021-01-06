import Node, { isNodeArgs, NodeArgs, OutputCollector } from './node';
import type { Context } from '../contexts';

/**
 * A (comma) separated list of nodes.
 * 
 * This can be a selector, a CSS value,
 * or function arguments.
 */
class List<T extends Node = Node> extends Node {
    type: 'List'
    value: T[]

    constructor(...args: NodeArgs | [Node, number?] | [Node[], number?]) {
        if (isNodeArgs(args)) {
            super(...args);
            return;
        }
        const [value, index] = args;
        if (!Array.isArray(value)) {
            super({ value: [value] }, {}, index);
        } else {
            super({ value }, {}, index);
        }
    }

    eval(context: Context) {
        if (this.value.length === 1) {
            return this.value[0].eval(context);
        } else {
            return super.eval(context);
        }
    }

    genCSS(context: Context, output: OutputCollector) {
        this.value.forEach((val, i) => {
            val.genCSS(context, output);
            if (i + 1 < this.value.length) {
                output.add((context && context.options.compress) ? ',' : ', ');
            }
        });
    }
}

List.prototype.type = 'List';

export default List;
