export const extend = Object.assign;
export function isObject(value) {
    return value !== null && typeof value === "object";
}
export function hasChanged(newValue, value) {
    return !Object.is(newValue, value);
}

export const hasOwn = (obj, key) =>
    Object.prototype.hasOwnProperty.call(obj, key);

export function camelize(str: string) {
    // 转为驼峰表示 add-one -> addOne
    return str.replace(/-(\w)/g, (_, c: string) => {
        return c ? c.toUpperCase() : "";
    });
}
function capitalize(str: string) {
    // 首字母大写
    return str.charAt(0).toUpperCase() + str.slice(1);
}
export function toHandlerKey(str: string) {
    // on +
    return str ? "on" + capitalize(str) : "";
}
