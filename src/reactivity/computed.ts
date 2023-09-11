import { ReactiveEffect } from "./effect";
class ComputedRefImpl {
    // private _getter: Function = () => {};
    private _value: any;
    private _dirty = true;
    private _effect: any;
    constructor(getter) {
        // 创建一个 effect 实例，value 改变时 执行schedular， 改变dirty为true
        this._effect = new ReactiveEffect(getter, () => {
            if (!this._dirty) {
                this._dirty = true;
            }
        });
        // this._getter = getter;
    }

    get value() {
        if (this._dirty) {
            this._dirty = false;
            this._value = this._effect.run(); // 收集依赖并返回fn返回值
        }
        return this._value;
    }
}

export function computed(getter) {
    return new ComputedRefImpl(getter);
}
