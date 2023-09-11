import { shallowReadonly } from "../reactivity/reactive";
import { initProps } from "./componentProps";
import { PublicInstancProxyeHandlers } from "./componentPublicInstance";

export function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {}, // state 对象
        props: {}, // 组件的props
    };
    return component;
}

export function setupComponent(instance) {
    // TODO
    initProps(instance, shallowReadonly(instance.vnode.props));
    // initSlots()
    setupStatefulComponent(instance);
}

function setupStatefulComponent(instance: any) {
    const Component = instance.type;

    // ctx
    // 设置一个代理对象
    instance.proxy = new Proxy({ _: instance }, PublicInstancProxyeHandlers);
    const { setup } = Component;
    if (setup) {
        // setup 返回 Object or Render function+
        const setupResult = setup(instance.props);
        handleSetupResult(instance, setupResult);
    }
}

function handleSetupResult(instance, setupResult: any) {
    // function Object
    // TODO function
    if (typeof setupResult === "object") {
        instance.setupState = setupResult;
    }
    finishComponentSetup(instance);
}

function finishComponentSetup(instance: any) {
    const Component = instance.type;
    instance.render = Component.render;
    // if (Component.render) {
    // instance.render = Component.render;
    // }
}
