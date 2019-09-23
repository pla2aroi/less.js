import Node from '../node';
import Variable from './variable';
import Rules from './rules';
import Selector from './selector';

/**
 * @todo - This should be a lot simpler now that rulesets and qualified rules
 *         have their rules collections normalized
 */
class NamespaceValue extends Node {
    constructor(ruleCall, lookups, important, index, fileInfo) {
        super();

        this.value = ruleCall;
        this.lookups = lookups;
        this.important = important;
        this._index = index;
        this._fileInfo = fileInfo;
    }

    eval(context) {
        let i;
        let j;
        let name;
        let rules = this.value.eval(context);

        for (i = 0; i < this.lookups.length; i++) {
            name = this.lookups[i];

            /**
             * Eval'd DRs return ruless.
             * Eval'd mixins return rules, so let's make a rules if we need it.
             * We need to do this because of late parsing of values
             */
            if (Array.isArray(rules)) {
                rules = new Rules([new Selector()], rules);
            }

            if (name === '') {
                rules = rules.lastDeclaration();
            }
            else if (name.charAt(0) === '@') {
                if (name.charAt(1) === '@') {
                    name = `@${new Variable(name.substr(1)).eval(context).value}`;
                }
                if (rules.variables) {
                    rules = rules.variable(name);
                }
                
                if (!rules) {
                    throw { type: 'Name',
                        message: `variable ${name} not found`,
                        filename: this.fileInfo().filename,
                        index: this.getIndex() };
                }
            }
            else {
                if (name.substring(0, 2) === '$@') {
                    name = `$${new Variable(name.substr(1)).eval(context).value}`;
                }
                else {
                    name = name.charAt(0) === '$' ? name : `$${name}`;
                }
                if (rules.properties) {
                    rules = rules.property(name);
                }
            
                if (!rules) {
                    throw { type: 'Name',
                        message: `property "${name.substr(1)}" not found`,
                        filename: this.fileInfo().filename,
                        index: this.getIndex() };
                }
                // Properties are an array of values, since a rules can have multiple props.
                // We pick the last one (the "cascaded" value)
                rules = rules[rules.length - 1];
            }

            if (rules.value) {
                rules = rules.eval(context).value;
            }
            if (rules.rules) {
                rules = rules.rules.eval(context);
            }
        }
        return rules;
    }
}

NamespaceValue.prototype.type = 'NamespaceValue';
export default NamespaceValue;
