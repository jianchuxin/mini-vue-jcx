import { createComponentInstance, setupComponent } from "./components";
import { ShapeFlags } from "../shared";
import { Fragment, Text } from "./vnode";
import { createAppAPI } from "./createApp";
import { effect } from "../reactivity/effect";
import { EMPTY_OBJ } from "../shared";
import { shouldUpdateComponent } from "./componentUpdateUtils";
import { queueJobs } from "./schduler";

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
                    processComponent(n1, n2, container, parentComponent, anchor);
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
        if (!n1) {
            mountComponent(n2, container, parentComponent, anchor);
        } else {
            // TODO updateComponent
            updateComponent(n1, n2);
        }
    }

    function updateComponent(n1, n2) {
        const instance = (n2.component = n1.component);
        if (shouldUpdateComponent(n1, n2)) {
            instance.next = n2;
            instance.update();
        } else {
            n2.el = n1.el;
            instance.vnode = n2;
            console.log("不需要更新");
        }
    }

    function mountComponent(initialVNode, container, parentComponent, anchor) {
        const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent));
        setupComponent(instance);
        setupRenderEffect(instance, initialVNode, container, anchor);
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
        console.log("n1", n1);
        console.log("n2", n2);
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
        } else if (i > e2) {
            // 老的比新的多
            // e2 < i < e1
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        } else {
            // 处理中间节点
            // 通过 key 来复用 Dom节点，并进行节点的更新
            let s1 = i;
            let s2 = i;

            const toBePatched = e2 - s2 + 1;
            let patched = 0;

            let moved = false;
            let lastMaxIndex = 0;

            const newIndexToOldIndex = new Array(toBePatched).fill(-1);

            const keysMap = new Map();
            // 建立新节点 key 和 index 的 map
            for (let i = s2; i <= e2; i++) {
                const key = c2[i].key;
                keysMap.set(key, i);
            }
            // 复用更新DOM，建立source数组
            for (let i = s1; i <= e1; i++) {
                if (patched >= toBePatched) {
                    hostRemove(c1[i].el);
                    continue;
                }
                let newIndex;
                const prevChild = c1[i];
                if (prevChild.key != null) {
                    newIndex = keysMap.get(prevChild.key);
                } else {
                    for (let j = s2; j <= e2; j++) {
                        if (isSameNode(prevChild, c2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                if (newIndex !== undefined) {
                    if (newIndex > lastMaxIndex) {
                        lastMaxIndex = newIndex;
                    } else {
                        moved = true;
                    }
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    patched++;
                    newIndexToOldIndex[newIndex - s2] = i;
                } else {
                    hostRemove(prevChild.el);
                }
            }

            // 移动元素，从后到前遍历
            // 只用到了新的节点，结合前面构造的source数组，
            // 如果节点在 sequence 中说明不需要移动
            // 如果不在， 需要获取那个目标节点和锚点（即后一个节点）
            const sequence = moved ? getSequence(newIndexToOldIndex) : [];
            let j = sequence.length - 1;
            for (let i = newIndexToOldIndex.length - 1; i >= 0; i--) {
                const nextIndex = i + s2;
                const nextChild = c2[nextIndex];
                const anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null;
                if (newIndexToOldIndex[i] === -1) {
                    patch(null, nextChild, container, parentComponent, anchor);
                } else if (moved) {
                    if (j < 0 || i !== sequence[j]) {
                        hostInsert(nextChild.el, container, anchor);
                    } else {
                        j--;
                    }
                }
            }
        }
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

    function setupRenderEffect(instance: any, initialVNode, container: any, anchor) {
        instance.update = effect(
            () => {
                // 判断是 初始化 还是 更新
                if (!instance.isMounted) {
                    console.log("init");
                    const proxy = instance.proxy;
                    const subTree = (instance.subTree = instance.render.call(proxy, proxy));
                    // 初始化
                    patch(null, subTree, container, instance, anchor);

                    initialVNode.el = subTree.el;

                    instance.isMounted = true;
                } else {
                    console.log("update!");
                    // 更新组件 instance 的props 和 el, 来自新的vnode（next）
                    const { next, vnode } = instance;
                    if (next) {
                        next.el = vnode.el;
                        updateComponentPreRender(instance, next);
                    }
                    // 更新组件的 vnode
                    const proxy = instance.proxy;
                    const subTree = instance.render.call(proxy, proxy);
                    const prevSubTree = instance.subTree;
                    instance.subTree = subTree;
                    patch(prevSubTree, subTree, container, instance, anchor);
                }
            },
            {
                scheduler() {
                    console.log("update-schedular");
                    queueJobs(instance.update);
                },
            }
        );
    }

    // 返回createApp函数
    return {
        createApp: createAppAPI(render),
    };
}

function updateComponentPreRender(instance, next) {
    instance.props = next.props;
    instance.next = null;
}

function getSequence(arr) {
    const p: any = [];
    const result = [0]; //  存储最长增长子序列的索引数组
    let i, j, start, end, mid;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                //  如果arr[i] > arr[j], 当前值比最后一项还大，可以直接push到索引数组(result)中去
                p[i] = j; //  p记录的当前位置下，前一项的索引值
                result.push(i);
                continue;
            }
            // 二分法查找和arrI值接近的数
            start = 0;
            end = result.length - 1;
            while (start < end) {
                mid = ((start + end) / 2) | 0;
                if (arr[result[mid]] < arrI) {
                    start = mid + 1;
                } else {
                    end = mid;
                }
            }
            if (arrI < arr[result[start]]) {
                if (start > 0) {
                    p[i] = result[start - 1]; // 记录当前位置下，替换位置的前一项的索引值
                }
                // 替换该值
                result[start] = i;
            }
        }
    }
    // 通过数组p，修正最长递增子序列对应的值
    start = result.length;
    end = result[start - 1];
    while (start-- > 0) {
        result[start] = end;
        end = p[end];
    }
    return result;
}
