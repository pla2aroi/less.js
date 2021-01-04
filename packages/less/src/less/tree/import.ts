import Node, { IFileInfo, INodeOptions, isNodeArgs, NodeArgs, NodeCollection } from './node';
import { Media, URL, Quoted, Ruleset, Anonymous, Variable, Property } from '.';
import * as utils from '../utils';
import LessError from '../less-error';
import type { Context } from '../contexts';

type V1Args = [
    path: Quoted | URL,
    features: Node,
    options?: any,
    index?: number,
    fileInfo?: IFileInfo
];

//
// CSS @import node
//
// The general strategy here is that we don't want to wait
// for the parsing to be completed, before we start importing
// the file. That's because in the context of a browser,
// most of the time will be spent waiting for the server to respond.
//
// On creation, we push the import path to our import queue, though
// `import,push`, we also pass it a callback, which it'll call once
// the file has been fetched, and parsed.
//
class Import extends Node {
    type: 'Import'
    path: Quoted | URL | Variable | Property | Anonymous
    features: Node
    root: Node | string
    options: INodeOptions & {
        css: boolean
        less: boolean
        inline: boolean
    }

    /** 
     * Added by the import visitor, and used
     * for skipping multiple or optional imports
     */
    skip: boolean | Function
    /** @todo - should this be a getter on this.root? */
    importedFilename: string
    /** Optionally set on this node by the import visitor */
    error: any

    constructor(...args: NodeArgs | V1Args) {
        if (!isNodeArgs(args)) {
            const [
                path,
                features,
                options,
                index,
                fileInfo
            ] = args;
            super({ path, features, root: undefined }, options, index, fileInfo);
        } else {
            const [
                nodes,
                options,
                location,
                fileInfo
            ] = args;
            (<NodeCollection>nodes).root = undefined;
            super(nodes, options, location, fileInfo);
        }

        if (this.options.less !== undefined || this.options.inline) {
            this.options.css = !this.options.less || this.options.inline;
        } else {
            const pathValue = this.getPath();
            if (pathValue && /[#\.\&\?]css([\?;].*)?$/.test(pathValue)) {
                this.options.css = true;
            }
        }
    }

    genCSS(context: Context, output) {
        if (this.options.css && this.path._fileInfo.reference === undefined) {
            output.add('@import ', this._fileInfo, this._index);
            this.path.genCSS(context, output);
            if (this.features) {
                output.add(' ');
                this.features.genCSS(context, output);
            }
            output.add(';');
        }
    }

    getPath() {
        const path = this.path;
        return (path instanceof URL) ?
            path.value.value : path.value;
    }

    isVariableImport() {
        let path: Node | string = this.path;
        if (path instanceof URL) {
            path = path.value;
        }
        if (path instanceof Quoted) {
            return path.containsVariables();
        }

        return true;
    }

    evalForImport(context: Context) {
        let path = this.path;

        if (path instanceof URL) {
            path = path.value;
        }

        // or clone?
        this.path = path.eval(context);
        return this;
    }

    evalPath(context: Context) {
        const path = this.path.eval(context);
        const fileInfo = this._fileInfo;

        if (!(path instanceof URL)) {
            // Add the rootpath if the URL requires a rewrite
            const pathValue = path.value;
            if (fileInfo &&
                pathValue &&
                context.pathRequiresRewrite(pathValue)) {
                path.nodes = context.rewritePath(pathValue, fileInfo.rootpath);
            } else {
                path.nodes = context.normalizePath(path.value);
            }
        }

        return path;
    }

    eval(context: Context) {
        const result = this.doEval(context);
        if (this.options.reference || this.blocksVisibility()) {
            if (result.length || result.length === 0) {
                result.forEach(function (node) {
                    node.addVisibilityBlock();
                }
                );
            } else {
                result.addVisibilityBlock();
            }
        }
        return result;
    }

    doEval(context: Context) {
        let ruleset;
        let registry;
        const features = this.features && this.features.eval(context);

        if (this.options.isPlugin) {
            const root = this.root;
            if (root && root instanceof Node) {
                try {
                    root.eval(context);
                }
                catch (e) {
                    e.message = 'Plugin error during evaluation';
                    throw new LessError(e, root.imports, root.filename);
                }
            
                registry = context.frames[0] && context.frames[0].functionRegistry;
                if (registry && root.functions) {
                    registry.addMultiple(root.functions);
                }
            }

            return [];
        }

        if (this.skip) {
            if (typeof this.skip === 'function') {
                this.skip = this.skip();
            }
            if (this.skip) {
                return [];
            }
        }
        if (this.options.inline) {
            const contents = new Anonymous(<string> this.root, 0,
                {
                    filename: this.importedFilename,
                    reference: this.path._fileInfo && this.path._fileInfo.reference
                }, true, true);

            return this.features ? new Media([contents], [(<Node>this.features.value)]) : [contents];
        } else if (this.options.css) {
            const newImport = new Import({ path: this.evalPath(context), features }, this.options, this._location, this._fileInfo);
            if (!newImport.options.css && this.error) {
                throw this.error;
            }
            return newImport;
        } else if (this.root && this.root instanceof Ruleset) {
            ruleset = new Ruleset(null, utils.copyArray(this.root.rules));
            ruleset.evalImports(context);

            return this.features ? new Media(ruleset.rules, [(<Node>this.features.value)]) : ruleset.rules;
        } else {
            return [];
        }
    }
}

Import.prototype.type = 'Import';
Import.prototype.allowRoot = true;
export default Import;