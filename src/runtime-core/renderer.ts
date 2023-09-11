import { createComponentInstance, setupComponent } from "./components";
import { ShapeFlags } from "./shapeFlags";
export function render(vnode, container) {
    // 调用 patch 方法， 方便后续递归处理
    patch(vnode, container);
}

function patch(vnode, container) {
    // TODO 判断 vnode 是不是一个 element
    const { shapeFlags } = vnode;
    if (shapeFlags & ShapeFlags.ELEMENT) {
        processElement(vnode, container);
    } else if (shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
        // 处理组件
        processComponent(vnode, container);
    }
}

function processComponent(vnode, container) {
    mountComponent(vnode, container);
}

function mountComponent(vnode, container) {
    const instance = createComponentInstance(vnode);
    setupComponent(instance);
    setupRenderEffect(instance, container);
}

function processElement(vnode, container) {
    mountElement(vnode, container);
}

function mountElement(vnode, container) {
    // 创建元素，如div
    const el = (vnode.el = document.createElement(vnode.type));

    // 处理元素的props
    const { props } = vnode;
    const isOn = (key) => /^on[A-Z]/.test(key);
    for (const key in props) {
        if (isOn(key)) {
            const event = key.slice(2).toLowerCase();
            el.addEventListener(event, props[key]);
        } else {
            el.setAttribute(key, props[key]);
        }
    }

    // 处理children
    mountChildren(vnode, el);

    container.append(el);
}

function mountChildren(vnode, container) {
    const { children, shapeFlags } = vnode;
    if (shapeFlags & ShapeFlags.TEXT_CHILDREN) {
        container.textContent = children;
    } else if (shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
        children.forEach((v) => {
            patch(v, container);
        });
    }
}

function setupRenderEffect(instance: any, container: any) {
    const proxy = instance.proxy;
    const subTree = instance.render.call(proxy);
    // mount 完所有元素后
    patch(subTree, container);
    instance.vnode.el = subTree.el;
}
