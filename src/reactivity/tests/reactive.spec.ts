import { reactive, isReactive, isProxy } from "../reactive";
describe("reactive", () => {
    it("happy path", () => {
        // 分两步走
        // 测试reactive
        const obj = { foo: 1 };
        const pro = reactive(obj); // 返回proxy对象，而不是原对象
        expect(pro).not.toBe(obj);
        expect(pro.foo).toBe(1);
        // 测试isReadonly
        expect(isReactive(pro)).toBe(true);
        expect(isReactive(obj)).toBe(false);
        expect(isProxy(pro)).toBe(true);
    });

    it("nest reactive", () => {
        const obj = {
            foo: 1,
            bar: {
                baz: 1,
            },
        };

        const target = reactive(obj);
        expect(isReactive(target)).toBe(true);
        expect(isReactive(obj)).toBe(false);
        expect(isReactive(target.bar)).toBe(true);
        expect(isReactive(obj.bar)).toBe(false);
        expect(isReactive(target.foo)).toBe(false);
    });
});
