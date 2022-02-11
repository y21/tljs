import { Dom } from "./dom";
import { unwrapPointerOption } from "./util";
import { wasm } from "./wasm";

/**
 * HTML Tag Attributes
 */
export class Attributes {
    protected dom: Dom;
    protected nodeId: number;
    constructor(dom: Dom, nodeId: number) {
        this.dom = dom;
        this.nodeId = nodeId;
    }

    /**
     * Returns the number of attributes
     */
    count() {
        this.dom.throwIfResourceFreed();
        return wasm.tl_node_tag_attributes_count(this.dom.getPointer(), this.nodeId);
    }

    /**
     * Looks up an attribute by key
     */
    get(key: string) {
        this.dom.throwIfResourceFreed();
        const [sptr, slen] = writeRustString(key);
        const maybeValuePtr = wasm.tl_node_tag_attributes_get(this.dom.getPointer(), this.nodeId, sptr, slen);
        const [isSome, value] = unwrapPointerOption(maybeValuePtr);
        wasm.drop_string_option(maybeValuePtr);
        if (!isSome) return null;
        if (value === 0) return "";
        return readRustString(value, true);
    }
}
