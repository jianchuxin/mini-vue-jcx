'use strict';

const extend = Object.assign;
const EMPTY_OBJ = {};
function isObject(value) {
    return value !== null && typeof value === "object";
}
function hasChanged(newValue, value) {
    return !Object.is(newValue, value);
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

let activeEffect;
let shouldTrack = true;
let targetsMap = new Map();
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.active = true;
        this.deps = [];
        this.onStop = () => { };
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        if (!this.active) {
            return this._fn();
        }
        // 应该收集
        shouldTrack = true;
        activeEffect = this;
        const result = this._fn(); // 函数执行，会触发get收集依赖
        // reset
        shouldTrack = false;
        return result; // runner 返回fn的返回值
    }
    stop() {
        // 删除dep set 中的effect实例
        if (this.active) {
            cleanupEffect(this);
            this.active = false;
            if (this.onStop) {
                this.onStop();
            }
        }
    }
}
function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler);
    // _effect.onStop = options.onStop;
    extend(_effect, options);
    _effect.run();
    const runner = _effect.run.bind(_effect); // 返回runner
    runner.effect = _effect;
    return runner;
}
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    effect.deps = [];
}
function isTracking() {
    // 在effect之前直接get会导致activeEffect为undefined
    // 在stop之后get会导致shouldTrack为false
    return shouldTrack && activeEffect !== undefined;
}
function track(target, key) {
    if (!isTracking())
        return;
    let depsMap = targetsMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetsMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffect(dep);
}
function trackEffect(dep) {
    // 已经在dep中不必收集
    if (dep.has(activeEffect))
        return;
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
}
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

class RefImpl {
    constructor(value) {
        this.__v_isRef = true;
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
        if (!hasChanged(newValue, this._rawValue))
            return;
        this._rawValue = newValue;
        this._value = convertValue(newValue);
        triggerEffect(this.dep);
    }
}
function convertValue(value) {
    return isObject(value) ? reactive(value) : value;
}
function ref(value) {
    return new RefImpl(value);
}
function isRef(value) {
    return !!value.__v_isRef;
}
function unRef(val) {
    return isRef(val) ? val.value : val;
}
function proxyRefs(target) {
    return new Proxy(target, {
        get(target, key) {
            return unRef(target[key]);
        },
        set(target, key, value) {
            // target[key] = value
            // 1. target[key] 为 ref，value 不为 ref 2. 其他情况直接赋值
            if (isRef(target[key]) && !isRef(value)) {
                return (target[key].value = value);
            }
            else {
                return Reflect.set(target, key, value);
            }
        },
    });
}

let currentInstance = null;
function createComponentInstance(vnode, parent) {
    // console.log("createComponentInstance", parent);
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        emit: () => { },
        slots: {},
        parent,
        provides: parent ? parent.provides : {},
        isMounted: false,
        subTree: {},
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
        instance.setupState = proxyRefs(setupResult);
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
        key: props && props.key,
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

// 创建自定义渲染器，传入创建元素、绑定属性和插入元素等API
function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText, } = options;
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
                if (shapeFlags & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                    // 处理组件
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlags & 1 /* ShapeFlags.ELEMENT */) {
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
        }
        else {
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
        if (shapeFlagsN2 & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            // text->text array -> text
            if (shapeFlagsN1 & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                unMountChildren(n1.children);
            }
            if (c1 !== c2) {
                hostSetElementText(container, n2.children);
            }
        }
        else {
            if (shapeFlagsN1 & 4 /* ShapeFlags.TEXT_CHILDREN */) {
                // text->array
                hostSetElementText(container, "");
                mountChildren(c2, container, parentComponent, anchor);
            }
            else {
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
            }
            else {
                break;
            }
            i++;
        }
        // 右侧对比
        while (i <= e1 && i <= e2) {
            if (isSameNode(c1[e1], c2[e2])) {
                patch(c1[e1], c2[e2], container, parentComponent, anchor);
            }
            else {
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
        if (shapeFlags & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlags & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(children, el, parentComponent, anchor);
        }
        // container.append(el);
        hostInsert(el, container, anchor);
    }
    function setupRenderEffect(instance, container, anchor) {
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
            }
            else {
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
function patchProp(el, key, prevValue, nextValue) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextValue);
    }
    else {
        if (nextValue === null || nextValue === undefined) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextValue);
        }
    }
}
function insert(el, container, anchor) {
    container.insertBefore(el, anchor);
}
function remove(el) {
    const parent = el.parentNode;
    if (parent) {
        parent.removeChild(el);
    }
}
function setElementText(el, text) {
    el.textContent = text;
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText,
});
function createApp(...args) {
    return renderer.createApp(...args);
}

exports.createApp = createApp;
exports.createTextVNode = createTextVNode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.ref = ref;
exports.renderSlots = renderSlots;
exports.renderer = renderer;
