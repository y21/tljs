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

// we are relying on this in JavaScript land
const _ASSERT_SOME_DISCRIMINANT_ZERO: () = {
    const SOME: FFIOption<()> = FFIOption::Some(());
    const NUM: u32 = unsafe { std::mem::transmute::<_, u32>(SOME) };
    if NUM != 0 {
        panic!("FFIOption::Some has non-zero discriminant");
    }
};
