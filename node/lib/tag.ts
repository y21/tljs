import { Dom } from "./dom";
import { Node } from "./node";
import { wasm } from "./wasm";

/**
 * A handle to a tag that was downcasted from a node
 */
export class Tag extends Node {
    constructor(dom: Dom, id: number) {
        super(dom, id);
    }

    /**
     * Returns the name of this tag
     */
    name() {
        this.dom.throwIfResourceFreed();
        const ptr = wasm.tl_node_tag_name(this.dom.getPointer(), this.id);
        return readRustString(ptr, true);
    }

    /**
     * Returns a handle to attributes of this HTML tag
     */
    attributes() {
        this.dom.throwIfResourceFreed();
        return new Attributes(this.dom, this.id);
    }
}

export class RawTag extends Node { }
export class Comment extends Node { }
