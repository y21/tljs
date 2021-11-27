import { WasmExports } from './bindings';

let _wasm: WasmExports;
let initializerCallback: WasmBinaryCallback = defaultCallback;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type WasmBinaryCallback = () => Promise<ArrayBuffer>;

function defaultCallback() {
    // @ts-ignore
    const fs = require('fs/promises');
    // @ts-ignore
    return fs.readFile(`${__dirname}/bindings.wasm`);
}

/**
 * Sets the initializer callback function.
 * 
 * This can be used to override the default WebAssembly binary loading mechanism.
 * You might want to use this if you want to load the binary from a different location (e.g. CDN),
 * or you are using this library in the browser and `require('fs')` is not available.
 */
export function setInitializerCallback(cb: WasmBinaryCallback) {
    initializerCallback = cb;
}

/**
 * Attempts to initialize the WebAssembly module using the registered callback
 */
export async function initializeWasm() {
    const binary = await initializerCallback();
    const module = await WebAssembly.instantiate(binary);
    _wasm = module.instance.exports as any;
}

/**
 * Sets the WebAssembly module.
 * 
 * This sets the underlying module that is used to interact with the HTML parser written in Rust.
 * You might want to use this if you want to use a different WebAssembly module than the one shipped with this library,
 * or if you want to instantiate the module beforehand.
 */
export function setWasmExports(wasm: WasmExports) {
    _wasm = wasm;
}

async function getWasm(): Promise<WasmExports> {
    if (!_wasm) await initializeWasm();
    return _wasm;
}

function withMemory<T>(callback: (dv: DataView) => T): T {
    const memory = _wasm.memory.buffer;
    const dv = new DataView(memory);
    return callback(dv);
}

function assertNonNulByte(input: string) {
    if (input.includes('\0')) throw new Error('Input string contains NUL byte');
}

function assertPointer(ptr: number, note: string) {
    if (ptr === 0) throw new Error(`Null pointer: \`${note}\``);
    else if (ptr < 0) throw new Error(`Negative pointer: \`${note}\``);
}

function writeCStringChecked(input: string): number {
    assertNonNulByte(input);
    input += '\0';

    const buffer = encoder.encode(input);
    const ptr = _wasm.alloc(buffer.length);
    assertPointer(ptr, 'wasm.alloc(buffer.length)');
    new Uint8Array(_wasm.memory.buffer).set(buffer, ptr);
    return ptr;
}

function readCString(ptr: number): string {
    assertPointer(ptr, 'readCString(ptr)');
    const buffer = new Uint8Array(_wasm.memory.buffer);
    let end;
    for (let i = 0; i < buffer.length; i++) {
        if (buffer[i + ptr] === 0) {
            end = i;
            break;
        }
    }
    if (end === undefined) throw new Error('Could not find NUL byte');
    const slice = buffer.slice(ptr, end + ptr);
    const string = decoder.decode(slice);
    _wasm.drop_c_string(ptr);
    return string;
}

function tryUnwrapPointerOption(optionPointer: number): [boolean, number] {
    return withMemory((dv) => {
        const some = dv.getUint8(optionPointer) === 0; /* 0 == Some */
        const value = dv.getUint32(optionPointer + 4, true);
        return [some, value];
    });
}

function readSliceVTable(ptr: number): [number, number] {
    const [slicePtr, sliceLen] = withMemory((dv) => {
        return [dv.getUint32(ptr, true), dv.getUint32(ptr + 4, true)];
    });
    _wasm.drop_collection_vtable(ptr);
    return [slicePtr, sliceLen];
}

function readVecVTable(ptr: number): [number, number, number] /* ptr, len, cap */ {
    return withMemory((dv) => {
        const vptr = dv.getUint32(ptr, true);
        const len = dv.getUint32(ptr + 4, true);
        const cap = dv.getUint32(ptr + 8, true);
        return [vptr, len, cap];
    });
}

function readNodeVecAndDrop<T>(dom: Dom, ptr: number): Array<Node> {
    const [vptr, len] = readVecVTable(ptr);
    const nodes = Array<Node>(len);

    withMemory((dv) => {
        for (let i = 0; i < len; i++) {
            const nodeId = dv.getUint32(vptr + i * 4, true);
            nodes[i] = new Node(dom, nodeId);
        }
    });

    _wasm.drop_collection(ptr);

    return nodes;
}

abstract class Resource {
    protected freed: boolean = false;
    protected ptr: number;
    constructor(ptr: number) {
        this.ptr = ptr;
    }

    getPointer() {
        return this.ptr;
    }

    throwIfResourceFreed() {
        if (this.freed) throw new Error('Attempted to use resource after it has been freed');
    }

    free() {
        this.throwIfResourceFreed();
        this.freed = true;
    }
}

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
                return _wasm.tl_node_is_tag(this.dom.getPointer(), this.id);
            case DowncastTarget.RAW:
                return _wasm.tl_node_is_raw(this.dom.getPointer(), this.id);
            case DowncastTarget.COMMENT:
                return _wasm.tl_node_is_comment(this.dom.getPointer(), this.id);
        }
    }

    /**
     * Returns the inner text of this node.
     */
    innerText() {
        this.dom.throwIfResourceFreed();
        const sptr = _wasm.tl_node_inner_text(this.dom.getPointer(), this.id);
        return readCString(sptr);
    }

    /**
     * Returns the inner HTML of this node.
     */
    innerHTML() {
        this.dom.throwIfResourceFreed();
        const sptr = _wasm.tl_node_inner_html(this.dom.getPointer(), this.id);
        return readCString(sptr);
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
        const sptr = _wasm.tl_node_tag_name(this.dom.getPointer(), this.id);
        return readCString(sptr);
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

/**
 * The main DOM
 */
export class Dom extends Resource {
    constructor(ptr: number) {
        super(ptr);
    }

    /**
     * Looks up an element by its ID
     * 
     * If ID tracking was previously enabled, this operation is ~O(1), otherwise it is O(n)
     */
    getElementById(id: string) {
        this.throwIfResourceFreed();
        const sptr = writeCStringChecked(id);
        const maybeNodeIdPtr = _wasm.tl_dom_get_element_by_id(this.ptr, sptr);
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
        const sptr = writeCStringChecked(className);
        const vptr = _wasm.tl_dom_get_elements_by_class_name(this.ptr, sptr);

        return readNodeVecAndDrop(this, vptr);
    }

    /**
     * Returns a handle to the HTML node that matches the given CSS selector
     */
    querySelector(selector: string) {
        this.throwIfResourceFreed();
        const sptr = writeCStringChecked(selector);
        const maybeNodeIdPtr = _wasm.tl_dom_query_selector_single(this.ptr, sptr);
        const [isSome, nodeId] = tryUnwrapPointerOption(maybeNodeIdPtr);
        _wasm.drop_node_handle_option(maybeNodeIdPtr);

        return isSome ? new Node(this, nodeId) : null;
    }

    /**
     * Returns an array of handles to the HTML nodes that match the given CSS selector
     */
    querySelectorAll(selector: string) {
        this.throwIfResourceFreed();
        const sptr = writeCStringChecked(selector);
        const vptr = _wasm.tl_dom_query_selector_all(this.ptr, sptr);
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
     * You must call this function explicitly when you are done with the DOM.
     */
    free() {
        super.free();
        _wasm.drop_dom(this.ptr);
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

/**
 * A base class for collections
 */
export abstract class Collection<T> {
    protected dom: Dom;
    protected ptr: number;
    protected len: number;
    constructor(dom: Dom, ptr: number, len: number) {
        this.dom = dom;
        this.ptr = ptr;
        this.len = len;
    }

    abstract at(index: number): T | null;
    abstract length(): number;
}

/**
 * A collection of subnodes of a particular node, or the DOM.
 */
export class ChildrenCollection extends Collection<Node> {
    constructor(dom: Dom, ptr: number, len: number) {
        super(dom, ptr, len);
    }

    /**
     * Returns the node at the given index.
     */
    at(index: number) {
        if (index < 0 || index >= this.len) return null;
        const nodeId = _wasm.tl_dom_children_index(this.ptr, this.len, index);
        return new Node(this.dom, nodeId);
    }

    /**
     * Returns the number of nodes in the collection.
     */
    length() {
        return this.len;
    }
}

/**
 * A collection of global nodes
 */
export class GlobalNodeCollection extends Collection<Node> {
    constructor(dom: Dom, ptr: number, len: number) {
        super(dom, ptr, len);
    }

    /**
     * Returns the node at the given index
     */
    at(index: number) {
        if (index < 0 || index >= this.len) return null;
        return new Node(this.dom, index);
    }

    /**
     * Returns the number of nodes in the collection
     */
    length() {
        return this.len;
    }
}

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
        return _wasm.tl_node_tag_attributes_count(this.dom.getPointer(), this.nodeId);
    }

    /**
     * Looks up an attribute by key
     */
    get(key: string) {
        this.dom.throwIfResourceFreed();
        const sptr = writeCStringChecked(key);
        const maybeValuePtr = _wasm.tl_node_tag_attributes_get(this.dom.getPointer(), this.nodeId, sptr);
        const [isSome, value] = tryUnwrapPointerOption(maybeValuePtr);
        _wasm.drop_c_string_option(maybeValuePtr);
        if (!isSome) return null;
        if (value === 0) return '';
        return readCString(value);
    }
}

/**
 * Options to use for the HTML parser.
 * The default options are optimized for raw parsing speed.
 */
export interface ParserOptions {
    /**
     * Enables tracking of HTML Tag IDs.
     * 
     * The parser will cache tags during parsing on the fly.
     * Enabling this makes `getElementById()` lookups ~O(1).
     * Default: false
     */
    trackIds?: boolean,
    /**
     * Enables tracking of HTML Tag class names.
     * 
     * The parser will cache tags during parsing on the fly.
     * Enabling this makes `getElementsByClassName()` lookups ~O(1),
     * at the cost of a lot of hashing.
     * Default: false
     */
    trackClasses?: boolean
}

enum RawParserOptions {
    NONE = 0,
    TRACK_IDS = 1 << 0,
    TRACK_CLASSES = 1 << 1
}

function optionsToNumber(options: ParserOptions) {
    let flags = 0;
    if (options.trackIds) flags |= RawParserOptions.TRACK_IDS;
    if (options.trackClasses) flags |= RawParserOptions.TRACK_CLASSES;
    return flags;
}

/**
 * Parses a string into a DOM tree.
 * 
 * The first call to this function instantiates the WebAssembly module, which is quite expensive.
 * Subsequent calls reuse the WebAssembly module.
 * You can initialize the WebAssembly module beforehand by calling `initializeWasm()`
 */
export async function parse(input: string, options: ParserOptions = {}): Promise<Dom> {
    options.trackClasses = options.trackClasses ?? false;
    options.trackIds = options.trackIds ?? false;

    const wasm = await getWasm();
    const ptr = writeCStringChecked(input);
    const dom = wasm.tl_parse(ptr, optionsToNumber(options));
    return new Dom(dom);
}