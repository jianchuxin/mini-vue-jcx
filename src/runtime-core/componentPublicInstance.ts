// instance.vnode 上可能有多个 $属性，
// 为了方便拓展，可以建立起 $key 和 instance.vnode.key 的映射
const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
    $props: (i) => i.props,
};
import { hasOwn } from "../shared/index";

export const PublicInstancProxyeHandlers = {
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
