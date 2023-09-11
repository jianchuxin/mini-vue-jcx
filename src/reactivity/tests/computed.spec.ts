import { computed } from "../computed";
import { reactive } from "../reactive";
describe("computed", () => {
    it("happy path", () => {
        // .value
        // 懒执行，缓存
        const user = reactive({
            age: 10,
        });
        const age = computed(() => {
            return user.age;
        });
        expect(age.value).toBe(10);
    });

    it("should computed lazily", () => {
        const foo = reactive({
            value: 1,
        });

        const getter = jest.fn(() => {
            return foo.value;
        });

        const target = computed(getter);
        expect(getter).not.toHaveBeenCalled();
        target.value;
        expect(getter).toHaveBeenCalledTimes(1);

        // don’t exec repeatedly
        target.value;
        expect(getter).toHaveBeenCalledTimes(1);

        // dirty changes with reactive data
        foo.value = 99;
        expect(getter).toHaveBeenCalledTimes(1);

        expect(target.value).toBe(99);
        expect(getter).toHaveBeenCalledTimes(2);
    });
});
