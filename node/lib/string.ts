const registry = new FinalizationRegistry();

export class RustString {
    constructor(data: string) {

    }
}
function readRustString(ptr: number, drop: boolean): string {
    const [dptr, len] = readSliceVTable(ptr);
    const buffer = new Uint8Array(_wasm.memory.buffer);
    const slice = buffer.slice(dptr, dptr + len);
    if (drop) {
        _wasm.dealloc(dptr, len)
    }
    return decoder.decode(slice);
}

function writeRustString(input: string): [number, number] /* ptr, len */ {
    const buffer = encoder.encode(input);
    const len = buffer.length;
    const ptr = _wasm.alloc(buffer.length);
    assertPointer(ptr, 'wasm.alloc(len)');
    new Uint8Array(_wasm.memory.buffer).set(buffer, ptr);
    return [ptr, len];
}
