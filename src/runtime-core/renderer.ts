import { createComponentInstance, setupComponent } from "./components";
import { ShapeFlags } from "./shapeFlags";
import { Fragment, Text } from "./vnode";
export function render(vnode, container) {
    // 调用 patch 方法， 方便后续递归处理
    patch(vnode, container, null);
}

function patch(vnode, container, parentComponent) {
    switch (vnode.type) {
        case Fragment: // Fragment 类型，只渲染children
            processFragment(vnode, container, parentComponent);
            break;
        case Text:
            processText(vnode, container);
            break;
        default:
            const { shapeFlags } = vnode;
            if (shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
                // 处理组件
                processComponent(vnode, container, parentComponent);
            } else if (shapeFlags & ShapeFlags.ELEMENT) {
                // 处理元素
                processElement(vnode, container, parentComponent);
            }
    }
}

function processText(vnode, container) {
    const el = (vnode.el = document.createTextNode(vnode.children));
    container.append(el);
}

function processFragment(vnode, container, parentComponent) {
    mountChildren(vnode, container, parentComponent);
}

function processComponent(vnode, container, parentComponent) {
    mountComponent(vnode, container, parentComponent);
}

function mountComponent(vnode, container, parentComponent) {
    const instance = createComponentInstance(vnode, parentComponent);
    setupComponent(instance);
    setupRenderEffect(instance, container);
}

function processElement(vnode, container, parentComponent) {
    mountElement(vnode, container, parentComponent);
}

function mountElement(vnode, container, parentComponent) {
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
    mountChildren(vnode, el, parentComponent);

    container.append(el);
}

function mountChildren(vnode, container, parentComponent) {
    const { children, shapeFlags } = vnode;
    if (shapeFlags & ShapeFlags.TEXT_CHILDREN) {
        container.textContent = children;
    } else if (shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
        children.forEach((v) => {
            patch(v, container, parentComponent);
        });
    }
}

function setupRenderEffect(instance: any, container: any) {
    const proxy = instance.proxy;
    const subTree = instance.render.call(proxy);
    // mount 完所有元素后
    patch(subTree, container, instance);
    instance.vnode.el = subTree.el;
}
