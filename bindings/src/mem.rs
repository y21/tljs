use std::alloc;

#[no_mangle]
pub unsafe extern "C" fn alloc(len: usize) -> *mut u8 {
    alloc::alloc(alloc::Layout::from_size_align(len, 1).unwrap())
}

#[no_mangle]
pub unsafe extern "C" fn dealloc(ptr: *mut u8, len: usize) {
    alloc::dealloc(ptr, alloc::Layout::from_size_align(len, 1).unwrap())
}

pub struct ExternalString(*mut u8, usize);
impl ExternalString {
    pub unsafe fn new(ptr: *mut u8, len: usize) -> Self {
        ExternalString(ptr, len)
    }
    pub fn to_string(&self) -> String {
        self.as_str().to_owned()
    }
    pub fn from_str_cloned(s: &str) -> Self {
        let len = s.len();
        let ptr = unsafe { alloc(len) };
        assert!(!ptr.is_null());
        unsafe {
            std::ptr::copy_nonoverlapping(s.as_ptr(), ptr, len);
            ExternalString::new(ptr, len)
        }
    }
    pub fn into_leaked_raw_parts(self) -> *mut [usize; 2] {
        let (ptr, len) = (self.0, self.1);
        let parts = Box::into_raw(Box::new([ptr as usize, len]));
        std::mem::forget(self);
        parts
    }
    pub fn as_str(&self) -> &str {
        unsafe {
            let slice = std::slice::from_raw_parts(self.0, self.1);
            std::str::from_utf8_unchecked(slice)
        }
    }
}
impl Drop for ExternalString {
    fn drop(&mut self) {
        // The external string was allocated using mem::alloc(len)
        unsafe { dealloc(self.0 as *mut _, self.1) }
    }
}
