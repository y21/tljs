interface WasmExports {
    memory: WebAssembly.Memory;
    alloc: (size: number) => number;
    dealloc: (ptr: number, size: number) => void;
    tl_parse: (ptr: number) => number;
    tl_dom_version: (ptr: number) => number;
    tl_dom_nodes_count: (ptr: number) => number;
    tl_dom_get_element_by_id: (ptr: number, id: number) => number;
    tl_node_inner_text: (ptr: number, id: number) => number;
    tl_node_inner_html: (ptr: number, id: number) => number;
    tl_node_is_tag: (ptr: number, id: number) => boolean;
    tl_node_is_raw: (ptr: number, id: number) => boolean;
    tl_node_is_comment: (ptr: number, id: number) => boolean;
    tl_node_tag_name: (ptr: number, id: number) => number;
    tl_node_tag_attributes_count: (ptr: number, id: number) => number;
    tl_node_tag_attributes_get: (ptr: number, id: number, str: number) => number;
    tl_dom_subnodes: (ptr: number) => number;
    tl_dom_children: (ptr: number) => number;
    tl_dom_children_index: (slice_ptr: number, slice_len: number, at: number) => number;
    drop_collection_vtable: (ptr: number) => void;
    drop_c_string: (ptr: number) => void;
    drop_node_handle_option: (ptr: number) => void;
    drop_c_string_option: (ptr: number) => void;
    drop_dom: (ptr: number) => void;
}

export type WasmBinaryCallback = () => Promise<ArrayBuffer>;
function defaultCallback() {
    // @ts-ignore
    const fs = require('fs/promises');
    // @ts-ignore
    return fs.readFile(`${__dirname}/bindings.wasm`);
}

let _wasm: WasmExports;
let initializerCallback: WasmBinaryCallback = defaultCallback;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function setInitializerCallback(cb: WasmBinaryCallback) {
    initializerCallback = cb;
}

export function setWasmExports(wasm: WasmExports) {
    _wasm = wasm;
}

async function getWasm(): Promise<WasmExports> {
    if (_wasm) return _wasm;
    const binary = await initializerCallback();
    const module = await WebAssembly.instantiate(binary);
    return _wasm = module.instance.exports as any;
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

class Node {
    protected dom: Dom;
    protected id: number;
    constructor(dom: Dom, id: number) {
        this.dom = dom;
        this.id = id;
    }

    downcastable(kind: DowncastTarget) {
        switch (kind) {
            case DowncastTarget.TAG:
                return _wasm.tl_node_is_tag(this.dom.getPointer(), this.id);
            case DowncastTarget.RAW:
                return _wasm.tl_node_is_raw(this.dom.getPointer(), this.id);
            case DowncastTarget.COMMENT:
                return _wasm.tl_node_is_comment(this.dom.getPointer(), this.id);
        }
    }

    innerText() {
        this.dom.throwIfResourceFreed();
        const sptr = _wasm.tl_node_inner_text(this.dom.getPointer(), this.id);
        return readCString(sptr);
    }

    innerHTML() {
        this.dom.throwIfResourceFreed();
        const sptr = _wasm.tl_node_inner_html(this.dom.getPointer(), this.id);
        return readCString(sptr);
    }

    asTag() {
        return this.downcastable(DowncastTarget.TAG) ? new Tag(this.dom, this.id) : null;
    }

    asRaw() {
        return this.downcastable(DowncastTarget.RAW) ? new RawTag(this.dom, this.id) : null;
    }

    asComment() {
        return this.downcastable(DowncastTarget.COMMENT) ? new Comment(this.dom, this.id) : null;
    }
}

class Tag extends Node {
    constructor(dom: Dom, id: number) {
        super(dom, id);
    }

    name() {
        this.dom.throwIfResourceFreed();
        const sptr = _wasm.tl_node_tag_name(this.dom.getPointer(), this.id);
        return readCString(sptr);
    }

    attributes() {
        this.dom.throwIfResourceFreed();
        return new Attributes(this.dom, this.id);
    }
}

class RawTag extends Node { }
class Comment extends Node { }

class Dom extends Resource {
    constructor(ptr: number) {
        super(ptr);
    }

    getElementById(id: string) {
        this.throwIfResourceFreed();
        const sptr = writeCStringChecked(id);
        const maybeNodeIdPtr = _wasm.tl_dom_get_element_by_id(this.ptr, sptr);
        const [isSome, nodeId] = tryUnwrapPointerOption(maybeNodeIdPtr);
        _wasm.drop_node_handle_option(maybeNodeIdPtr);

        return isSome ? new Node(this, nodeId) : null;
    }

    nodes() {
        this.throwIfResourceFreed();
        const tuplePtr = _wasm.tl_dom_subnodes(this.ptr);
        const [slicePtr, sliceLen] = readSliceVTable(tuplePtr);
        return new GlobalNodeCollection(this, slicePtr, sliceLen);
    }

    children() {
        this.throwIfResourceFreed();
        const tuplePtr = _wasm.tl_dom_children(this.ptr);
        const [slicePtr, sliceLen] = readSliceVTable(tuplePtr);
        return new ChildrenCollection(this, slicePtr, sliceLen);
    }

    nodeCount() {
        this.throwIfResourceFreed();
        return _wasm.tl_dom_nodes_count(this.ptr);
    }

    version() {
        this.throwIfResourceFreed();
        const ord = _wasm.tl_dom_version(this.ptr);
        return numberToHTMLVersion(ord);
    }

    free() {
        super.free();
        _wasm.drop_dom(this.ptr);
    }
}

export enum HTMLVersion {
    HTML5,
    StrictHTML401,
    TransitionalHTML401,
    FramesetHTML401
}

// https://github.com/y21/tl/blob/b125f9de78f4247c65c42804040f2e7cb0810504/src/parser/base.rs#L15
function numberToHTMLVersion(ord: number) {
    switch (ord) {
        case 0: return HTMLVersion.HTML5;
        case 1: return HTMLVersion.StrictHTML401;
        case 2: return HTMLVersion.TransitionalHTML401;
        case 3: return HTMLVersion.FramesetHTML401;
    }
}

abstract class Collection<T> {
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

class ChildrenCollection extends Collection<Node> {
    constructor(dom: Dom, ptr: number, len: number) {
        super(dom, ptr, len);
    }

    at(index: number) {
        if (index < 0 || index >= this.len) return null;
        const nodeId = _wasm.tl_dom_children_index(this.ptr, this.len, index);
        return new Node(this.dom, nodeId);
    }

    length() {
        return this.len;
    }
}

class GlobalNodeCollection extends Collection<Node> {
    constructor(dom: Dom, ptr: number, len: number) {
        super(dom, ptr, len);
    }

    at(index: number) {
        if (index < 0 || index >= this.len) return null;
        return new Node(this.dom, index);
    }

    length() {
        return this.len;
    }
}

class Attributes {
    protected dom: Dom;
    protected nodeId: number;
    constructor(dom: Dom, nodeId: number) {
        this.dom = dom;
        this.nodeId = nodeId;
    }

    count() {
        this.dom.throwIfResourceFreed();
        return _wasm.tl_node_tag_attributes_count(this.dom.getPointer(), this.nodeId);
    }

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

export async function parse(input: string): Promise<Dom> {
    const wasm = await getWasm();
    const ptr = writeCStringChecked(input);
    const dom = wasm.tl_parse(ptr);
    return new Dom(dom);
}