import { shallowReadonly } from "../reactivity/reactive";
import { initProps } from "./componentProps";
import { initSlots } from "./componentSlots";
import { PublicInstancProxyeHandlers } from "./componentPublicInstance";
import { emit } from "./componentEmit";
import { proxyRefs } from "../reactivity";

let currentInstance = null;

export function createComponentInstance(vnode, parent) {
    // console.log("createComponentInstance", parent);
    const component = {
        vnode,
        type: vnode.type,
        next: null,
        setupState: {}, // state 对象
        props: {}, // 组件的props
        emit: () => {}, // emit 函数, 用来创建 event
        slots: {},
        parent,
        provides: parent ? parent.provides : {},
        isMounted: false,
        subTree: {},
    };
    component.emit = emit.bind(null, component) as any;
    return component;
}

export function setupComponent(instance) {
    // TODO
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}

function setupStatefulComponent(instance: any) {
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

function handleSetupResult(instance, setupResult: any) {
    // function Object
    // TODO function
    if (typeof setupResult === "object") {
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}

function finishComponentSetup(instance: any) {
    const Component = instance.type;
    // TODO compile template to render
    if (Component.render) {
        instance.render = Component.render;
    } else if (compiler && Component.template) {
        instance.render = compiler(Component.template);
    }
}

export function getCurrentInstance() {
    return currentInstance;
}

function setCurrentInstance(value) {
    currentInstance = value;
}

let compiler;
export function registerCompiler(_complier) {
    compiler = _complier;
}
