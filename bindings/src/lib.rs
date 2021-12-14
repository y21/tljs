use std::{ffi::CString, mem::ManuallyDrop};

use mem::ExternalString;
use option::FFIOption;
use tl::NodeHandle;

mod mem;
mod option;
#[cfg(test)]
mod tests;

type Dom = tl::VDom<'static>;

#[no_mangle]
pub unsafe extern "C" fn tl_parse(ptr: *const u8, len: usize, opts: u8) -> *mut Dom {
    let options = tl::ParserOptions::from_raw_checked(opts)
        .unwrap()
        .set_max_depth(256);

    let slice = std::slice::from_raw_parts(ptr, len);
    let input = std::str::from_utf8_unchecked(slice);
    let dom = tl::parse(input, options);

    Box::into_raw(Box::new(dom))
}

#[no_mangle]
pub unsafe extern "C" fn tl_dom_nodes_count(ptr: *mut Dom) -> usize {
    (*ptr).nodes().len()
}

#[no_mangle]
pub unsafe extern "C" fn tl_dom_version(ptr: *mut Dom) -> tl::HTMLVersion {
    (*ptr)
        .version()
        .unwrap_or(tl::HTMLVersion::TransitionalHTML401)
}

#[no_mangle]
pub unsafe extern "C" fn tl_dom_get_element_by_id(
    dom_ptr: *mut Dom,
    str_ptr: *mut u8,
    str_len: usize,
) -> *mut FFIOption<tl::NodeHandle> {
    let id = ExternalString::new(str_ptr, str_len);
    let element = (*dom_ptr).get_element_by_id(id.as_str());
    Box::into_raw(Box::new(element.into()))
}

// todo: optimise
#[no_mangle]
pub unsafe extern "C" fn tl_dom_get_elements_by_class_name(
    dom_ptr: *mut Dom,
    str_ptr: *mut u8,
    str_len: usize,
) -> *mut [usize; 3] {
    let class_name = ExternalString::new(str_ptr, str_len);
    let mut elements = ManuallyDrop::new(
        (*dom_ptr)
            .get_elements_by_class_name(class_name.as_str())
            .collect::<Vec<NodeHandle>>(),
    );

    let (ptr, len, cap) = (
        elements.as_mut_ptr() as usize,
        elements.len() as usize,
        elements.capacity() as usize,
    );

    Box::into_raw(Box::new([ptr, len, cap]))
}

#[no_mangle]
pub unsafe extern "C" fn tl_node_inner_text(
    dom_ptr: *mut Dom,
    id: tl::NodeHandle,
) -> *mut [usize; 2] {
    let dom = &*dom_ptr;
    let parser = dom.parser();
    let node = if let Some(node) = dom.parser().resolve_node_id(id.get_inner()) {
        node
    } else {
        return std::ptr::null_mut();
    };
    let inner_text = node.inner_text(parser);
    ExternalString::from_str_cloned(&inner_text).into_leaked_raw_parts()
}

#[no_mangle]
pub unsafe extern "C" fn tl_node_inner_html(
    dom_ptr: *mut Dom,
    id: tl::NodeHandle,
) -> *mut [usize; 2] {
    let dom = &*dom_ptr;
    let node = if let Some(node) = dom.parser().resolve_node_id(id.get_inner()) {
        node
    } else {
        return std::ptr::null_mut();
    };
    let inner_html = node.inner_html().as_utf8_str();
    ExternalString::from_str_cloned(&inner_html).into_leaked_raw_parts()
}

#[no_mangle]
pub unsafe extern "C" fn tl_node_is_tag(dom_ptr: *mut Dom, id: tl::NodeHandle) -> bool {
    let node = (*dom_ptr).parser().resolve_node_id(id.get_inner()).unwrap();
    node.as_tag().is_some()
}

#[no_mangle]
pub unsafe extern "C" fn tl_node_is_raw(dom_ptr: *mut Dom, id: tl::NodeHandle) -> bool {
    let node = (*dom_ptr).parser().resolve_node_id(id.get_inner()).unwrap();
    node.as_raw().is_some()
}

#[no_mangle]
pub unsafe extern "C" fn tl_node_is_comment(dom_ptr: *mut Dom, id: tl::NodeHandle) -> bool {
    let node = (*dom_ptr).parser().resolve_node_id(id.get_inner()).unwrap();
    node.as_comment().is_some()
}

#[no_mangle]
pub unsafe extern "C" fn tl_node_tag_name(
    dom_ptr: *mut Dom,
    id: tl::NodeHandle,
) -> *mut [usize; 2] {
    let dom = &*dom_ptr;
    let node = if let Some(node) = dom.parser().resolve_node_id(id.get_inner()) {
        node
    } else {
        return std::ptr::null_mut();
    };
    let name = node.as_tag().unwrap().name().as_utf8_str();
    ExternalString::from_str_cloned(&name).into_leaked_raw_parts()
}

#[no_mangle]
pub unsafe extern "C" fn tl_node_tag_attributes_count(
    dom_ptr: *mut Dom,
    id: tl::NodeHandle,
) -> usize {
    let node = (*dom_ptr)
        .parser()
        .resolve_node_id(id.get_inner())
        .unwrap()
        .as_tag()
        .unwrap();
    node.attributes().len()
}

#[no_mangle]
pub unsafe extern "C" fn tl_node_tag_attributes_get(
    dom_ptr: *mut Dom,
    id: tl::NodeHandle,
    str_ptr: *mut u8,
    str_len: usize,
) -> *mut FFIOption<*mut [usize; 2]> {
    let tag = (*dom_ptr)
        .parser()
        .resolve_node_id(id.get_inner())
        .unwrap()
        .as_tag()
        .unwrap();

    let attributes = tag.attributes();
    let name = ExternalString::new(str_ptr, str_len);
    let value = match name.as_str() {
        "id" => attributes.id.as_ref().map(|id| id.as_utf8_str()),
        "class" => attributes.class.as_ref().map(|class| class.as_utf8_str()),
        _ => attributes
            .raw
            .get(&name.as_str().into())
            .and_then(|x| x.as_ref().map(|x| x.as_utf8_str())),
    };

    let value = value.map(|x| ExternalString::from_str_cloned(&x).into_leaked_raw_parts());
    Box::into_raw(Box::new(value.into()))
}

#[no_mangle]
pub unsafe extern "C" fn tl_dom_subnodes(dom_ptr: *mut Dom) -> *mut [usize; 2] {
    let nodes = (*dom_ptr).nodes();
    let len = nodes.len();
    let ptr = nodes.as_ptr();
    Box::into_raw(Box::new([ptr as usize, len]))
}

#[no_mangle]
pub unsafe extern "C" fn tl_dom_children(dom_ptr: *mut Dom) -> *mut [usize; 2] {
    let nodes = (*dom_ptr).children();
    let len = nodes.len();
    let ptr = nodes.as_ptr();
    Box::into_raw(Box::new([ptr as usize, len]))
}

#[no_mangle]
pub unsafe extern "C" fn tl_dom_children_index(
    slice: *const tl::NodeHandle,
    len: usize,
    at: usize,
) -> tl::NodeHandle {
    let slice = std::slice::from_raw_parts(slice, len);
    let node = slice[at].get_inner();
    tl::NodeHandle::new(node)
}

#[no_mangle]
pub unsafe extern "C" fn tl_dom_query_selector_single(
    dom_ptr: *mut Dom,
    selector_ptr: *mut u8,
    selector_len: usize,
) -> *mut FFIOption<tl::NodeHandle> {
    let selector = ExternalString::new(selector_ptr, selector_len);
    let node: FFIOption<_> = (*dom_ptr)
        .query_selector(selector.as_str())
        .and_then(|mut selector| selector.next())
        .into();

    Box::into_raw(Box::new(node))
}

#[no_mangle]
pub unsafe extern "C" fn tl_dom_query_selector_all(
    dom_ptr: *mut Dom,
    selector_ptr: *mut u8,
    selector_len: usize,
) -> *mut [usize; 3] {
    let selector = ExternalString::new(selector_ptr, selector_len);
    let handles = (*dom_ptr)
        .query_selector(selector.as_str())
        .map(|selector| selector.collect::<Vec<_>>())
        .map(ManuallyDrop::new);

    if let Some(mut handles) = handles {
        Box::into_raw(Box::new([
            handles.as_mut_ptr() as usize,
            handles.len() as usize,
            handles.capacity() as usize,
        ]))
    } else {
        std::ptr::null_mut()
    }
}

macro_rules! define_generic_destructors {
    ($(($name:ident => $type:ty)),+) => {
        $(
            #[no_mangle]
            pub unsafe extern "C" fn $name(ptr: *mut $type) {
                drop(Box::from_raw(ptr));
            }
        )+
    };
}

define_generic_destructors! {
    (drop_collection_vtable => *mut [usize; 2]),
    (drop_node_handle_option => *mut FFIOption<tl::NodeHandle>),
    (drop_string_option => *mut FFIOption<*mut [usize; 2]>),
    (drop_dom => Dom)
}

#[no_mangle]
pub unsafe extern "C" fn drop_c_string(ptr: *mut i8) {
    drop(CString::from_raw(ptr));
}

#[no_mangle]
pub unsafe extern "C" fn drop_collection(ptr: *mut [usize; 3]) {
    let parts = Box::from_raw(ptr);
    let vptr = parts[0] as *mut NodeHandle;
    let len = parts[1];
    let cap = parts[2];
    drop(Vec::from_raw_parts(vptr, len, cap));
}
