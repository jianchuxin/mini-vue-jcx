import { createComponentInstance, setupComponent } from "./components";
import { ShapeFlags } from "./shapeFlags";
import { Fragment, Text } from "./vnode";
import { createAppAPI } from "./createApp";
import { effect } from "../reactivity/effect";

// 创建自定义渲染器，传入创建元素、绑定属性和插入元素等API
export function createRenderer(options) {
    const {
        createElement: hostCreateElement,
        patchProp: hostPatchProp,
        insert: hostInsert,
    } = options;

    function render(vnode, container) {
        // 调用 patch 方法， 方便后续递归处理
        patch(null, vnode, container, null);
    }

    function patch(n1, n2, container, parentComponent) {
        const { type, shapeFlags } = n2;
        switch (type) {
            case Fragment: // Fragment 类型，只渲染children
                processFragment(n1, n2, container, parentComponent);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
                    // 处理组件
                    processComponent(n1, n2, container, parentComponent);
                } else if (shapeFlags & ShapeFlags.ELEMENT) {
                    // 处理元素
                    processElement(n1, n2, container, parentComponent);
                }
        }
    }

    function processText(n1, n2, container) {
        const { children } = n2;
        const el = (n2.el = document.createTextNode(children));
        container.append(el);
    }

    function processFragment(n1, n2, container, parentComponent) {
        mountChildren(n2, container, parentComponent);
    }

    function processComponent(n1, n2, container, parentComponent) {
        mountComponent(n2, container, parentComponent);
    }

    function mountComponent(vnode, container, parentComponent) {
        const instance = createComponentInstance(vnode, parentComponent);
        setupComponent(instance);
        setupRenderEffect(instance, container);
    }

    function processElement(n1, n2, container, parentComponent) {
        if (!n1) {
            mountElement(n2, container, parentComponent);
        } else {
            patchElement(n1, n2, container);
        }
    }

    function patchElement(n1, n2, container) {
        console.log("patchElement");
        console.log("n1", n1);
        console.log("n2", n2);

        //props

        //children
    }

    function mountElement(vnode, container, parentComponent) {
        // 创建元素，如div
        const el = (vnode.el = hostCreateElement(vnode.type));

        // 处理元素的props
        const { props } = vnode;
        for (const key in props) {
            hostPatchProp(el, key, props[key]);
        }

        // 处理children
        mountChildren(vnode, el, parentComponent);

        // container.append(el);
        hostInsert(el, container);
    }

    function mountChildren(vnode, container, parentComponent) {
        const { children, shapeFlags } = vnode;
        if (shapeFlags & ShapeFlags.TEXT_CHILDREN) {
            container.textContent = children;
        } else if (shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
            children.forEach((v) => {
                patch(null, v, container, parentComponent);
            });
        }
    }

    function setupRenderEffect(instance: any, container: any) {
        effect(() => {
            // 判断是 初始化 还是 更新
            if (!instance.isMounted) {
                console.log("init");
                const proxy = instance.proxy;
                const subTree = instance.render.call(proxy);
                instance.subTree = subTree;
                // 初始化
                patch(null, subTree, container, instance);
                instance.isMounted = true;
                instance.vnode.el = subTree.el;
            } else {
                console.log("update!");
                // 获取新的 vnode
                const proxy = instance.proxy;
                const subTree = instance.render.call(proxy);
                // 获取旧的 vnode
                const prevSubTree = instance.subTree;
                instance.subTree = subTree; // 以新代旧
                console.log(prevSubTree, subTree);
                // 更新
                patch(prevSubTree, subTree, container, instance);
            }
        });
    }

    // 返回createApp函数
    return {
        createApp: createAppAPI(render),
    };
}
