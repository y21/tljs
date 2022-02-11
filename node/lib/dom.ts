import { wasm } from "./wasm";

/**
 * The main DOM
 */
export class Dom extends Resource {
    private source: RustString;

    constructor(ptr: number, source: RustString) {
        super(ptr);
        this.source = source;
    }

    /**
     * Looks up an element by its ID
     * 
     * If ID tracking was previously enabled, this operation is ~O(1), otherwise it is O(n)
     */
    getElementById(id: string) {
        this.throwIfResourceFreed();
        const [sptr, slen] = writeRustString(id);
        const maybeNodeIdPtr = _wasm.tl_dom_get_element_by_id(this.getPointer(), sptr, slen);
        const [isSome, nodeId] = tryUnwrapPointerOption(maybeNodeIdPtr);
        _wasm.drop_node_handle_option(maybeNodeIdPtr);

        return isSome ? new Node(this, nodeId) : null;
    }

    /**
     * Returns an array of nodes that match the given class name
     */
    getElementsByClassName(className: string) {
        // todo: this can be optimised a lot
        this.throwIfResourceFreed();
        const [sptr, slen] = writeRustString(className);
        const vptr = _wasm.tl_dom_get_elements_by_class_name(this.getPointer(), sptr, slen);
        return readNodeVecAndDrop(this, vptr);
    }

    /**
     * Returns a handle to the HTML node that matches the given CSS selector
     */
    querySelector(selector: string) {
        this.throwIfResourceFreed();
        const [sptr, slen] = writeRustString(selector);
        const maybeNodeIdPtr = _wasm.tl_dom_query_selector_single(this.ptr, sptr, slen);
        const [isSome, nodeId] = tryUnwrapPointerOption(maybeNodeIdPtr);
        _wasm.drop_node_handle_option(maybeNodeIdPtr);

        return isSome ? new Node(this, nodeId) : null;
    }

    /**
     * Returns an array of handles to the HTML nodes that match the given CSS selector
     */
    querySelectorAll(selector: string) {
        this.throwIfResourceFreed();
        const [sptr, slen] = writeRustString(selector);
        const vptr = _wasm.tl_dom_query_selector_all(this.ptr, sptr, slen);
        // null pointer means the selector failed to parse
        // todo: maybe return a concrete error?
        if (vptr === 0) return [];

        return readNodeVecAndDrop(this, vptr);
    }

    /**
     * Returns a handle to a collection of *all* elements in the DOM
     */
    nodes() {
        this.throwIfResourceFreed();
        const tuplePtr = _wasm.tl_dom_subnodes(this.ptr);
        const [slicePtr, sliceLen] = readSliceVTable(tuplePtr);
        return new GlobalNodeCollection(this, slicePtr, sliceLen);
    }

    /**
     * Returns a handle to a collection of direct subnodes ("children") of this DOM (i.e. <html>)
     */
    children() {
        this.throwIfResourceFreed();
        const tuplePtr = _wasm.tl_dom_children(this.ptr);
        const [slicePtr, sliceLen] = readSliceVTable(tuplePtr);
        return new ChildrenCollection(this, slicePtr, sliceLen);
    }

    /**
     * Returns the number of elements in the DOM
     */
    nodeCount() {
        this.throwIfResourceFreed();
        return _wasm.tl_dom_nodes_count(this.ptr);
    }

    /**
     * Returns the version of this HTML document
     */
    version() {
        this.throwIfResourceFreed();
        const ord = _wasm.tl_dom_version(this.ptr);
        return numberToHTMLVersion(ord);
    }

    /**
     * Frees the underlying WebAssembly memory associated to this DOM
     * 
     * Calling this function will invalidate any handle that points to this DOM in any way.
     * Attempting to use a resource after it's been freed will throw an exception.
     */
    free() {
        super.free();
        wasm.drop_dom(this.ptr);
        this.source.free();
        domRegistry.unregister(this);
    }
}

/**
 * The version of this HTML document
 */
export enum HTMLVersion {
    HTML5,
    STRICT_HTML401,
    TRANSITIONAL_HTML401,
    FRAMESET_HTML401
}

// https://github.com/y21/tl/blob/b125f9de78f4247c65c42804040f2e7cb0810504/src/parser/base.rs#L15
function numberToHTMLVersion(ord: number) {
    switch (ord) {
        case 0: return HTMLVersion.HTML5;
        case 1: return HTMLVersion.STRICT_HTML401;
        case 2: return HTMLVersion.TRANSITIONAL_HTML401;
        case 3: return HTMLVersion.FRAMESET_HTML401;
    }
}
