import { track, trigger } from "./effect";
import { ReactiveFlags, reactive, readonly } from "./reactive";
import { isObject, extend } from "../shared/index";
const reactiveGet = createGetter();
const reactiveSet = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key) {
        // isReactive / isReadonly
        if (key === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly;
        } else if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly;
        }

        const res = Reflect.get(target, key);
        // shallow readonly 嵌套对象非响应
        if (shallow) return res;
        // reactive 收集依赖
        if (!isReadonly) {
            track(target, key);
        }
        // deep 嵌套对象响应式
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}

function createSetter() {
    return function set(target, key, value) {
        const result = Reflect.set(target, key, value);
        trigger(target, key);
        return result;
    };
}

export const mutableHandlers = {
    get: reactiveGet,
    set: reactiveSet,
};

export const readonlyHandlers = {
    get: readonlyGet,
    set(target, key, value) {
        console.warn("警告，无法set，因为对象属于readonly");
        return true;
    },
};

export const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet,
});
