import { Fragment, createVNode } from "./vnode";

export function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (!slot) {
        return;
    }
    if (typeof slot === "function") {
        return createVNode(Fragment, {}, slot(props));
    }
}
