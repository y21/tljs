abstract class Resource {
    protected freed: boolean = false;
    protected ptr: number;
    constructor(ptr: number) {
        this.ptr = ptr;
    }

    getPointer() {
        return this.ptr;
    }

    throwIfResourceFreed() {
        if (this.freed) throw new Error('Attempted to use resource after it has been freed');
    }

    isFreed() {
        return this.freed;
    }

    free() {
        this.throwIfResourceFreed();
        this.freed = true;
    }
}
