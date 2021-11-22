export interface WasmExports {
    memory: WebAssembly.Memory;
    alloc: (size: number) => number;
    dealloc: (ptr: number, size: number) => void;
    tl_parse: (ptr: number, opts: number) => number;
    tl_dom_version: (ptr: number) => number;
    tl_dom_nodes_count: (ptr: number) => number;
    tl_dom_get_element_by_id: (ptr: number, id: number) => number;
    tl_dom_get_elements_by_class_name: (ptr: number, class_name: number) => number;
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
    drop_collection: (ptr: number) => void;
    drop_c_string: (ptr: number) => void;
    drop_node_handle_option: (ptr: number) => void;
    drop_c_string_option: (ptr: number) => void;
    drop_dom: (ptr: number) => void;
}