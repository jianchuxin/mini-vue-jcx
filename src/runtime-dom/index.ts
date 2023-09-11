import { createRenderer } from "../runtime-core/renderer";

function createElement(type) {
    return document.createElement(type);
}

function patchProp(el, key, value) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, value);
    } else {
        el.setAttribute(key, value);
    }
}

function insert(el, container) {
    container.append(el);
}

export const renderer: any = createRenderer({
    createElement,
    patchProp,
    insert,
});

export function createApp(...args) {
    return renderer.createApp(...args);
}

export * from "../runtime-core";
