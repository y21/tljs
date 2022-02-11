import { Dom } from "./dom";
import { wasm } from "./wasm";
import { Node } from "./node";

const SOME_DISCRIMINANT = 0;


/**
 * Calls the provided callback function with a view into the WebAssembly memory.
 * Requires the global WebAssembly module to be initialized.
 */
export function withMemory<T>(callback: (dv: DataView) => T): T {
    const memory = wasm.memory.buffer;
    const dv = new DataView(memory);
    return callback(dv);
}

/**
 * Asserts a pointer to be valid, i.e. not NULL and in the positive range.
 */
export function assertPointer(ptr: number, note: string) {
    if (ptr === 0) throw new Error(`Null pointer: \`${note}\``);
    else if (ptr < 0) throw new Error(`Negative pointer: \`${note}\``);
}

/**
 * Unwraps a pointed-to Option<{i32,u32}>
 */
export function unwrapPointerOption(optionPointer: number): [boolean, number] {
    return withMemory((dv) => {
        const some = dv.getUint8(optionPointer) === SOME_DISCRIMINANT;
        const value = dv.getUint32(optionPointer + 4, true);
        return [some, value];
    });
}

/**
 * Reads a slice VTable [ptr, len] at address `ptr` and drops it
 */
export function readSliceVTable(ptr: number): [number, number] {
    const [slicePtr, sliceLen] = withMemory((dv) => {
        return [dv.getUint32(ptr, true), dv.getUint32(ptr + 4, true)];
    });
    wasm.drop_slice_vtable(ptr);
    return [slicePtr, sliceLen];
}

/**
 * Reads a Vec VTable [ptr, len, capacity] at address `ptr` **without** dropping it!
 */
export function readVecVTable(ptr: number): [number, number, number] {
    return withMemory((dv) => {
        const vptr = dv.getUint32(ptr, true);
        const len = dv.getUint32(ptr + 4, true);
        const cap = dv.getUint32(ptr + 8, true);
        return [vptr, len, cap];
    });
}

/**
 * Reads a vector of node handles into an array and drops the vector at a given address
 */
export function nodeVecIntoArray(dom: Dom, ptr: number): Array<Node> {
    const [vptr, len] = readVecVTable(ptr);
    const nodes = Array<Node>(len);

    withMemory((dv) => {
        for (let i = 0; i < len; i++) {
            const nodeId = dv.getUint32(vptr + i * 4, true);
            nodes[i] = new Node(dom, nodeId);
        }
    });

    wasm.drop_collection(ptr);

    return nodes;
}
