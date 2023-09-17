import { ShapeFlags } from "../shared";

export function initSlots(instance, children) {
    if (instance.vnode.shapeFlags & ShapeFlags.SLOT_CHILDREN) {
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
