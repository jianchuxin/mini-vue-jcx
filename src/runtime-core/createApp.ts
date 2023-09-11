// import { render } from "./renderer";
import { createVNode } from "./vnode";

export function createAppAPI(render) {
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
