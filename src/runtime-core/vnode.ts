import { ShapeFlags } from "../shared";
export const Fragment = Symbol("Fragment");
export const Text = Symbol("Text");

export { createVNode as createElementVNode };

export function createVNode(type, props?, children?) {
    // type 为组件 或者 element
    const vnode = {
        type,
        props,
        key: props && props.key,
        children,
        component: null,
        shapeFlags: getShapeFlags(type),
        el: null,
    };

    // 元素的 children 类型为 文本类型 或 数组类型
    if (typeof children === "string") {
        vnode.shapeFlags |= ShapeFlags.TEXT_CHILDREN;
    } else if (Array.isArray(children)) {
        vnode.shapeFlags |= ShapeFlags.ARRAY_CHILDREN;
    }

    // 组件的 children 类型为插槽类型
    if (vnode.shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
        if (typeof children === "object") {
            vnode.shapeFlags |= ShapeFlags.SLOT_CHILDREN;
        }
    }

    return vnode;
}

export function createTextVNode(str: string) {
    return createVNode(Text, {}, str);
}

function getShapeFlags(type) {
    return typeof type === "string" ? ShapeFlags.ELEMENT : ShapeFlags.STATEFUL_COMPONENT;
}
