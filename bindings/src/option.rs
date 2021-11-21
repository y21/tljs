use Option as StdOption;

/// Same as std's Option but repr(C)
#[repr(C)]
pub enum FFIOption<T> {
    Some(T),
    None,
}

impl<T> From<StdOption<T>> for FFIOption<T> {
    fn from(opt: StdOption<T>) -> Self {
        opt.map(FFIOption::Some).unwrap_or(FFIOption::None)
    }
}
