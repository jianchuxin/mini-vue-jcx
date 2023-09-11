import { getCurrentInstance } from "./components";

export function provide(key, value) {
    // 存
    const currentInstance: any = getCurrentInstance();

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
export function inject(key, defaultValue?) {
    // 取， 从父节点那里取
    const currentInstance: any = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        } else if (defaultValue) {
            if (typeof defaultValue === "function") {
                return defaultValue();
            }
            return defaultValue;
        }
    }
}
