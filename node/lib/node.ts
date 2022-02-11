import { Dom } from "./dom";
import { RawTag, Tag } from "./tag";
import { wasm } from "./wasm";

enum DowncastTarget {
    TAG,
    RAW,
    COMMENT,
}

/**
 * A handle to a node in the DOM tree.
 */
export class Node {
    protected dom: Dom;
    protected id: number;
    constructor(dom: Dom, id: number) {
        this.dom = dom;
        this.id = id;
    }

    private downcastable(kind: DowncastTarget) {
        switch (kind) {
            case DowncastTarget.TAG:
                return wasm.tl_node_is_tag(this.dom.getPointer(), this.id);
            case DowncastTarget.RAW:
                return wasm.tl_node_is_raw(this.dom.getPointer(), this.id);
            case DowncastTarget.COMMENT:
                return wasm.tl_node_is_comment(this.dom.getPointer(), this.id);
        }
    }

    /**
     * Returns the inner text of this node.
     */
    innerText() {
        this.dom.throwIfResourceFreed();
        const ptr = wasm.tl_node_inner_text(this.dom.getPointer(), this.id);
        return readRustString(ptr, true);
    }

    /**
     * Returns the inner HTML of this node.
     */
    innerHTML() {
        this.dom.throwIfResourceFreed();
        const ptr = wasm.tl_node_inner_html(this.dom.getPointer(), this.id);
        return readRustString(ptr, true);
    }

    /**
     * Attempts to downcast this node handle to a concrete HTML tag.
     * Some operations are only valid on HTML tags.
     */
    asTag() {
        return this.downcastable(DowncastTarget.TAG) ? new Tag(this.dom, this.id) : null;
    }

    /**
     * Attempts to downcast this node handle to a raw HTML node (text).
     */
    asRaw() {
        return this.downcastable(DowncastTarget.RAW) ? new RawTag(this.dom, this.id) : null;
    }

    /**
     * Attempts to downcast this node handle to an HTML comment (<!-- comment -->).
     */
    asComment() {
        return this.downcastable(DowncastTarget.COMMENT) ? new Comment(this.dom, this.id) : null;
    }
}
