use std::alloc;

#[no_mangle]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    unsafe { alloc::alloc(alloc::Layout::from_size_align(len, 1).unwrap()) }
}

#[no_mangle]
pub extern "C" fn dealloc(ptr: *mut u8, len: usize) {
    unsafe { alloc::dealloc(ptr, alloc::Layout::from_size_align(len, 1).unwrap()) };
}
