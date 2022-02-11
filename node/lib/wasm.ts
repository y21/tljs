import { WasmExports } from "./bindings";

export type WasmBinaryCallback = (sync: boolean) => ArrayBuffer | Promise<ArrayBuffer>;

/**
 * The (possibly uninitialized) global WebAssembly module.
 * You might want `getOrInitWasm()` if the initialized state is not known
 */
export let wasm: WasmExports;

/**
 * The default initialization callback function, which tries to load the blob from the filesystem.
 * Users will want to override this if running in the browser
 */
function defaultCallback(sync: boolean) {
    // @ts-ignore
    const fs = require('fs');
    const path = `${__dirname}/bindings.wasm`;

    if (sync) {
        return fs.readFileSync(path);
    } else {
        return fs.promises.readFile(path);
    }
}

/**
 * The initializer callback function that is invoked when parsing for the first time
 */
let initializerCallback: WasmBinaryCallback = defaultCallback;

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
    const binary = await initializerCallback(false);
    const module = await WebAssembly.instantiate(binary);
    wasm = module.instance.exports as any;
}

/**
 * Attempts to initialize the WebAssembly module using the registered callback synchronously
 */
export function initializeWasmSync() {
    const binary = initializerCallback(true) as ArrayBuffer;
    const module = new WebAssembly.Instance(new WebAssembly.Module(binary));
    wasm = module.exports as any;
}

/**
 * Sets the WebAssembly module.
 * 
 * This sets the underlying module that is used to interact with the HTML parser written in Rust.
 * You might want to use this if you want to use a different WebAssembly module than the one shipped with this library,
 * or if you want to instantiate the module beforehand.
 * 
 * Users of this generally should not use this function and instead prefer `initializeWasm`/`setInitializerCallback`.
 * 
 * **Note:** after calling this function, you must not interact with any of the handles obtained from the previous module.
 * 
 * To give an example of what's bad, consider this example:
 * ```ts
 * const dom = tljs.parse('<p>test</p>');
 * const node = dom.nodes().at(0);
 * tljs.setWasm(module);
 * console.log(node.innerText()); // 💥
 * ```
 */
export function setWasmExports(w: WasmExports) {
    wasm = w;
}

/**
 * Initializes the global WebAssembly module if it's not yet initialized and returns it
 */
export async function getOrInitWasm() {
    if (!wasm) await initializeWasm();
    return wasm;
}
