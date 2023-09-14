import { createComponentInstance, setupComponent } from "./components";
import { ShapeFlags } from "./shapeFlags";
import { Fragment, Text } from "./vnode";
import { createAppAPI } from "./createApp";
import { effect } from "../reactivity/effect";
import { EMPTY_OBJ } from "../shared";

// 创建自定义渲染器，传入创建元素、绑定属性和插入元素等API
export function createRenderer(options) {
    const {
        createElement: hostCreateElement,
        patchProp: hostPatchProp,
        insert: hostInsert,
        remove: hostRemove,
        setElementText: hostSetElementText,
    } = options;

    function render(vnode, container) {
        // 调用 patch 方法， 方便后续递归处理
        patch(null, vnode, container, null, null);
    }

    function patch(n1, n2, container, parentComponent, anchor) {
        const { type, shapeFlags } = n2;
        switch (type) {
            case Fragment: // Fragment 类型，只渲染children
                processFragment(n1, n2, container, parentComponent, anchor);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
                    // 处理组件
                    processComponent(
                        n1,
                        n2,
                        container,
                        parentComponent,
                        anchor
                    );
                } else if (shapeFlags & ShapeFlags.ELEMENT) {
                    // 处理元素
                    processElement(n1, n2, container, parentComponent, anchor);
                }
        }
    }

    function processText(n1, n2, container) {
        const { children } = n2;
        const el = (n2.el = document.createTextNode(children));
        // console.log(el);
        container.append(el);
    }

    function processFragment(n1, n2, container, parentComponent, anchor) {
        mountChildren(n2.children, container, parentComponent, anchor);
    }

    function processComponent(n1, n2, container, parentComponent, anchor) {
        mountComponent(n2, container, parentComponent, anchor);
    }

    function mountComponent(vnode, container, parentComponent, anchor) {
        const instance = createComponentInstance(vnode, parentComponent);
        setupComponent(instance);
        setupRenderEffect(instance, container, anchor);
    }

    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountElement(n2, container, parentComponent, anchor);
        } else {
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }

    function patchElement(n1, n2, container, parentComponent, anchor) {
        console.log("patchElement");
        // console.log("n1", n1);
        // console.log("n2", n2);
        //props
        const prevProps = n1.props || EMPTY_OBJ;
        const nextProps = n2.props || EMPTY_OBJ;
        const el = (n2.el = n1.el);
        patchProps(el, prevProps, nextProps);
        //children
        patchChildren(n1, n2, el, parentComponent, anchor);
    }

    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const shapeFlagsN1 = n1.shapeFlags;
        const c1 = n1.children;
        const shapeFlagsN2 = n2.shapeFlags;
        const c2 = n2.children;
        if (shapeFlagsN2 & ShapeFlags.TEXT_CHILDREN) {
            // text->text array -> text
            if (shapeFlagsN1 & ShapeFlags.ARRAY_CHILDREN) {
                unMountChildren(n1.children);
            }
            if (c1 !== c2) {
                hostSetElementText(container, n2.children);
            }
        } else {
            if (shapeFlagsN1 & ShapeFlags.TEXT_CHILDREN) {
                // text->array
                hostSetElementText(container, "");
                mountChildren(c2, container, parentComponent, anchor);
            } else {
                //array -> array
                patchKeyedChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }

    function patchKeyedChildren(c1, c2, container, parentComponent, anchor) {
        let i = 0;
        let e1 = c1.length - 1;
        let e2 = c2.length - 1;

        function isSameNode(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key;
        }
        // 左侧对比
        while (i <= e1 && i <= e2) {
            if (isSameNode(c1[i], c2[i])) {
                patch(c1[i], c2[i], container, parentComponent, anchor);
            } else {
                break;
            }
            i++;
        }
        // 右侧对比
        while (i <= e1 && i <= e2) {
            if (isSameNode(c1[e1], c2[e2])) {
                patch(c1[e1], c2[e2], container, parentComponent, anchor);
            } else {
                break;
            }
            e1--;
            e2--;
        }
        // 新的比老的多
        // e1 < i <= e2
        if (i > e1) {
            const nextPos = e2 + 1;
            const anchor = nextPos < c2.length ? c2[nextPos].el : null;
            while (i <= e2) {
                patch(null, c2[i], container, parentComponent, anchor);
                i++;
            }
        }
        // 老的比新的多
        // e2 < i < e1
        if (i > e2) {
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }

        // i < e1 && i < e2
    }

    function unMountChildren(children) {
        children.forEach((v) => {
            const el = v.el;
            // remove
            hostRemove(el);
        });
    }

    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach((v) => {
            patch(null, v, container, parentComponent, anchor);
        });
    }

    function patchProps(el, prevProps, nextProps) {
        if (prevProps !== nextProps) {
            // 比较 新 旧 props
            // 更改有的，增加新的，删除无的
            for (let key in nextProps) {
                const prevValue = prevProps[key];
                const nextValue = nextProps[key];
                if (prevValue !== nextValue) {
                    hostPatchProp(el, key, prevValue, nextValue);
                }
            }
            if (prevProps !== EMPTY_OBJ) {
                for (let key in prevProps) {
                    if (!(key in nextProps)) {
                        const prevValue = prevProps[key];
                        hostPatchProp(el, key, prevValue, null);
                    }
                }
            }
        }
    }

    function mountElement(vnode, container, parentComponent, anchor) {
        // 创建元素，如div
        const el = (vnode.el = hostCreateElement(vnode.type));

        // 处理元素的props
        const { props, shapeFlags } = vnode;
        for (const key in props) {
            hostPatchProp(el, key, null, props[key]);
        }

        // 处理children
        const { children } = vnode;
        if (shapeFlags & ShapeFlags.TEXT_CHILDREN) {
            el.textContent = children;
        } else if (shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
            mountChildren(children, el, parentComponent, anchor);
        }

        // container.append(el);
        hostInsert(el, container, anchor);
    }

    function setupRenderEffect(instance: any, container: any, anchor) {
        effect(() => {
            // 判断是 初始化 还是 更新
            if (!instance.isMounted) {
                console.log("init");
                const proxy = instance.proxy;
                const subTree = instance.render.call(proxy);
                instance.subTree = subTree;
                // 初始化
                patch(null, subTree, container, instance, anchor);
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
                // 更新
                patch(prevSubTree, subTree, container, instance, anchor);
            }
        });
    }

    // 返回createApp函数
    return {
        createApp: createAppAPI(render),
    };
}
