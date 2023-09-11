import { toHandlerKey, camelize } from "../shared/index";
export function emit(instance, event, ...args) {
    // on + event
    // 查找props 中是否有 处理 emit 事件的函数
    const { props } = instance;
    const handler = props[toHandlerKey(camelize(event))];
    handler && handler(...args);
}
