import { isTracking, trackEffect, triggerEffect } from "./effect";
import { reactive } from "./reactive";
import { isObject, hasChanged } from "../shared/index";
class RefImpl {
    private _value: any;
    private _rawValue: any;
    public dep;
    public __v_isRef = true;
    constructor(value) {
        this._rawValue = value;
        this._value = convertValue(value);
        this.dep = new Set();
    }

    get value() {
        if (isTracking()) {
            trackEffect(this.dep);
        }
        return this._value;
    }

    set value(newValue) {
        if (!hasChanged(newValue, this._rawValue)) return;
        this._rawValue = newValue;
        this._value = convertValue(newValue);
        triggerEffect(this.dep);
    }
}

function convertValue(value) {
    return isObject(value) ? reactive(value) : value;
}

export function ref(value) {
    return new RefImpl(value);
}

export function isRef(value) {
    return !!value.__v_isRef;
}

export function unRef(val) {
    return isRef(val) ? val.value : val;
}

export function proxyRefs(target) {
    return new Proxy(target, {
        get(target, key) {
            return unRef(target[key]);
        },
        set(target, key, value) {
            // target[key] = value
            // 1. target[key] 为 ref，value 不为 ref 2. 其他情况直接赋值
            if (isRef(target[key]) && !isRef(value)) {
                return (target[key].value = value);
            } else {
                return Reflect.set(target, key, value);
            }
        },
    });
}
