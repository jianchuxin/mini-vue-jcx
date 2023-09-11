const extend = Object.assign;
function isObject(value) {
    return value !== null && typeof value === "object";
}
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
function camelize(str) {
    // 转为驼峰表示 add-one -> addOne
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : "";
    });
}
function capitalize(str) {
    // 首字母大写
    return str.charAt(0).toUpperCase() + str.slice(1);
}
function toHandlerKey(str) {
    // on +
    return str ? "on" + capitalize(str) : "";
}

let targetsMap = new Map();
function trigger(target, key) {
    let depsMap = targetsMap.get(target);
    let dep = depsMap.get(key);
    triggerEffect(dep);
}
function triggerEffect(dep) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}

const reactiveGet = createGetter();
const reactiveSet = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key) {
        // isReactive / isReadonly
        if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
            return isReadonly;
        }
        const res = Reflect.get(target, key);
        // shallow readonly 嵌套对象非响应
        if (shallow)
            return res;
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
const mutableHandlers = {
    get: reactiveGet,
    set: reactiveSet,
};
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key, value) {
        console.warn("警告，无法set，因为对象属于readonly");
        return true;
    },
};
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet,
});

function reactive(raw) {
    return createActiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    return createActiveObject(raw, readonlyHandlers);
}
function shallowReadonly(raw) {
    return createActiveObject(raw, shallowReadonlyHandlers);
}
function createActiveObject(raw, baseHandlers) {
    if (!isObject(raw)) {
        console.warn(`target ${raw} 必须是一个对象类型!`);
        return;
    }
    return new Proxy(raw, baseHandlers);
}

function initProps(instance, props) {
    instance.props = props || {};
}

function initSlots(instance, children) {
    if (instance.vnode.shapeFlags & 16 /* ShapeFlags.SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}
function normalizeObjectSlots(children, slots) {
    for (let key in children) {
        const value = children[key]; // func (age) => h(...age)
        slots[key] = (props) => normalizeSlotValue(value(props)); // (age) => [h(...age)]
    }
}

// instance.vnode 上可能有多个 $属性，
// 为了方便拓展，可以建立起 $key 和 instance.vnode.key 的映射
const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
};
const PublicInstancProxyeHandlers = {
    get({ _: instance }, key) {
        if (hasOwn(instance.setupState, key)) {
            return instance.setupState[key];
        }
        if (hasOwn(instance.props, key)) {
            return instance.props[key];
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
        return undefined;
    },
};

function emit(instance, event, ...args) {
    // on + event
    // 查找props 中是否有 处理 emit 事件的函数
    const { props } = instance;
    const handler = props[toHandlerKey(camelize(event))];
    handler && handler(...args);
}

let currentInstance = null;
function createComponentInstance(vnode, parent) {
    console.log("createComponentInstance", parent);
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        emit: () => { },
        slots: {},
        parent,
        provides: parent ? parent.provides : {},
    };
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    // TODO
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const Component = instance.type;
    // ctx
    // 设置一个代理对象
    instance.proxy = new Proxy({ _: instance }, PublicInstancProxyeHandlers);
    const { setup } = Component;
    if (setup) {
        setCurrentInstance(instance);
        // setup 返回 Object or Render function+
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    // function Object
    // TODO function
    if (typeof setupResult === "object") {
        instance.setupState = setupResult;
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    instance.render = Component.render;
    // if (Component.render) {
    // instance.render = Component.render;
    // }
}
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(value) {
    currentInstance = value;
}

const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode(type, props, children) {
    // type 为组件 或者 element
    const vnode = {
        type,
        props,
        children,
        shapeFlags: getShapeFlags(type),
        el: null,
    };
    // 元素的 children 类型为 文本类型 或 数组类型
    if (typeof children === "string") {
        vnode.shapeFlags |= 4 /* ShapeFlags.TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlags |= 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    // 组件的 children 类型为插槽类型
    if (vnode.shapeFlags & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        if (typeof children === "object") {
            vnode.shapeFlags |= 16 /* ShapeFlags.SLOT_CHILDREN */;
        }
    }
    return vnode;
}
function createTextVNode(str) {
    return createVNode(Text, {}, str);
}
function getShapeFlags(type) {
    return typeof type === "string"
        ? 1 /* ShapeFlags.ELEMENT */
        : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}

// import { render } from "./renderer";
function createAppAPI(render) {
    return function createApp(rootComponent) {
        // 根组件
        return {
            mount(rootContainer) {
                // 根容器
                // 将所有的东西 转化为 虚拟节点 vnode
                // component -> vnode
                // 基于 vnode 再做处理
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer);
            },
        };
    };
}

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, } = options;
    function render(vnode, container) {
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
                if (shapeFlags & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                    // 处理组件
                    processComponent(vnode, container, parentComponent);
                }
                else if (shapeFlags & 1 /* ShapeFlags.ELEMENT */) {
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
        if (shapeFlags & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            container.textContent = children;
        }
        else if (shapeFlags & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            children.forEach((v) => {
                patch(v, container, parentComponent);
            });
        }
    }
    function setupRenderEffect(instance, container) {
        const proxy = instance.proxy;
        const subTree = instance.render.call(proxy);
        // mount 完所有元素后
        patch(subTree, container, instance);
        instance.vnode.el = subTree.el;
    }
    return {
        createApp: createAppAPI(render),
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (!slot) {
        return;
    }
    if (typeof slot === "function") {
        return createVNode(Fragment, {}, slot(props));
    }
}

function provide(key, value) {
    // 存
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        const parentProvides = currentInstance.parent.provides;
        if (provides === parentProvides) {
            // 组件中第一次调用provide时初始化
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    // 取， 从父节点那里取
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else if (defaultValue) {
            if (typeof defaultValue === "function") {
                return defaultValue();
            }
            return defaultValue;
        }
    }
}

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, value) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, value);
    }
    else {
        el.setAttribute(key, value);
    }
}
function insert(el, container) {
    container.append(el);
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
});
function createApp(...args) {
    return renderer.createApp(...args);
}

export { createApp, createTextVNode, getCurrentInstance, h, inject, provide, renderSlots, renderer };
