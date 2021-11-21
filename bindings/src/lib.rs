use std::ffi::CString;

use option::FFIOption;

mod mem;
mod option;
#[cfg(test)]
mod tests;

type Dom = tl::VDomGuard<'static>;

#[no_mangle]
pub unsafe extern "C" fn tl_parse(ptr: *mut i8) -> *mut Dom {
    let input = CString::from_raw(ptr).into_string().unwrap();
    let dom = tl::parse_owned(input);
    Box::into_raw(Box::new(dom))
}

#[no_mangle]
pub unsafe extern "C" fn tl_dom_nodes_count(ptr: *mut Dom) -> usize {
    (*ptr).get_ref().nodes().len()
}

#[no_mangle]
pub unsafe extern "C" fn tl_dom_version(ptr: *mut Dom) -> tl::HTMLVersion {
    (*ptr)
        .get_ref()
        .version()
        .unwrap_or(tl::HTMLVersion::TransitionalHTML401)
}

#[no_mangle]
pub unsafe extern "C" fn tl_dom_get_element_by_id(
    dom_ptr: *mut Dom,
    str_ptr: *mut i8,
) -> *mut FFIOption<tl::NodeHandle> {
    let dom = (*dom_ptr).get_ref();
    let id = CString::from_raw(str_ptr).into_string().unwrap();
    let element = dom.get_element_by_id(id.as_str().into());
    Box::into_raw(Box::new(element.into()))
}

#[no_mangle]
pub unsafe extern "C" fn tl_node_inner_text(dom_ptr: *mut Dom, id: tl::NodeHandle) -> *mut i8 {
    let dom = (*dom_ptr).get_ref();
    let parser = dom.parser();
    let node = if let Some(node) = dom.parser().resolve_node_id(id.get_inner()) {
        node
    } else {
        return std::ptr::null_mut();
    };
    let inner_text = node.inner_text(parser).into_owned();
    CString::new(inner_text).unwrap().into_raw()
}

#[no_mangle]
pub unsafe extern "C" fn tl_node_inner_html(dom_ptr: *mut Dom, id: tl::NodeHandle) -> *mut i8 {
    let dom = (*dom_ptr).get_ref();
    let node = if let Some(node) = dom.parser().resolve_node_id(id.get_inner()) {
        node
    } else {
        return std::ptr::null_mut();
    };
    let inner_html = node.inner_html().as_utf8_str().into_owned();
    CString::new(inner_html).unwrap().into_raw()
}

#[no_mangle]
pub unsafe extern "C" fn tl_node_is_tag(dom_ptr: *mut Dom, id: tl::NodeHandle) -> bool {
    let dom = (*dom_ptr).get_ref();
    let node = dom.parser().resolve_node_id(id.get_inner()).unwrap();
    node.as_tag().is_some()
}

#[no_mangle]
pub unsafe extern "C" fn tl_node_is_raw(dom_ptr: *mut Dom, id: tl::NodeHandle) -> bool {
    let dom = (*dom_ptr).get_ref();
    let node = dom.parser().resolve_node_id(id.get_inner()).unwrap();
    node.as_raw().is_some()
}

#[no_mangle]
pub unsafe extern "C" fn tl_node_is_comment(dom_ptr: *mut Dom, id: tl::NodeHandle) -> bool {
    let dom = (*dom_ptr).get_ref();
    let node = dom.parser().resolve_node_id(id.get_inner()).unwrap();
    node.as_comment().is_some()
}

#[no_mangle]
pub unsafe extern "C" fn tl_node_tag_name(dom_ptr: *mut Dom, id: tl::NodeHandle) -> *mut i8 {
    let dom = (*dom_ptr).get_ref();
    let node = if let Some(node) = dom.parser().resolve_node_id(id.get_inner()) {
        node
    } else {
        return std::ptr::null_mut();
    };
    let name = node.as_tag().unwrap().name().as_utf8_str().into_owned();
    CString::new(name).unwrap().into_raw()
}

#[no_mangle]
pub unsafe extern "C" fn tl_node_tag_attributes_count(
    dom_ptr: *mut Dom,
    id: tl::NodeHandle,
) -> usize {
    let dom = (*dom_ptr).get_ref();
    let node = dom
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
    str_ptr: *mut i8,
) -> *mut FFIOption<*mut i8> {
    let dom = (*dom_ptr).get_ref();
    let tag = dom
        .parser()
        .resolve_node_id(id.get_inner())
        .unwrap()
        .as_tag()
        .unwrap();

    let attributes = tag.attributes();
    let name = CString::from_raw(str_ptr).into_string().unwrap();
    let value = match name.as_str() {
        "id" => attributes
            .id
            .as_ref()
            .map(|id| id.as_utf8_str().into_owned()),
        "class" => attributes
            .class
            .as_ref()
            .map(|class| class.as_utf8_str().into_owned()),
        _ => attributes
            .raw
            .get(&name.as_str().into())
            .and_then(|x| x.as_ref().map(|x| x.as_utf8_str().into_owned())),
    };

    let value = value.map(|x| CString::new(x).unwrap().into_raw());
    Box::into_raw(Box::new(value.into()))
}

#[no_mangle]
pub unsafe extern "C" fn tl_dom_subnodes(dom_ptr: *mut Dom) -> *mut [usize; 2] {
    let dom = (*dom_ptr).get_ref();
    let nodes = dom.nodes();
    let len = nodes.len();
    let ptr = nodes.as_ptr();
    Box::into_raw(Box::new([ptr as usize, len]))
}

#[no_mangle]
pub unsafe extern "C" fn tl_dom_children(dom_ptr: *mut Dom) -> *mut [usize; 2] {
    let dom = (*dom_ptr).get_ref();
    let nodes = dom.children();
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
    (drop_c_string_option => *mut FFIOption<*mut i8>),
    (drop_dom => Dom)
}

#[no_mangle]
pub unsafe extern "C" fn drop_c_string(ptr: *mut i8) {
    drop(CString::from_raw(ptr));
}
