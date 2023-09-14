import { createRenderer } from "../runtime-core/renderer";

function createElement(type) {
    return document.createElement(type);
}

function patchProp(el, key, prevValue, nextValue) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextValue);
    } else {
        if (nextValue === null || nextValue === undefined) {
            el.removeAttribute(key);
        } else {
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

export const renderer: any = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText,
});

export function createApp(...args) {
    return renderer.createApp(...args);
}

export * from "../runtime-core";
