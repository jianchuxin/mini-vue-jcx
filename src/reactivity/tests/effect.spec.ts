import { reactive } from "../reactive";
import { effect, stop } from "../effect";
describe("effect", () => {
    it("happy path", () => {
        // 测试effect
        const user = reactive({
            count: 1,
        });
        let a = 0;
        effect(() => {
            a = user.count;
        });
        // effect调用后执行fn
        expect(a).toBe(1);

        // 收集依赖和触发依赖
        user.count++;
        expect(a).toBe(2);
    });

    it("should return runner when exec effect ", () => {
        let age = 10;
        const runner = effect(() => {
            age += 10;
            return "age";
        });

        expect(age).toBe(20);
        let str = runner();
        expect(age).toBe(30);
        expect(str).toBe("age");
    });

    it("scheduler", () => {
        let dummy;
        let run: any;
        const scheduler = jest.fn(() => {
            run = runner;
        });
        const obj = reactive({ foo: 1 });
        const runner = effect(
            () => {
                dummy = obj.foo;
            },
            {
                scheduler,
            }
        );
        // 第一次调用时执行fn，不执行sceduler
        expect(scheduler).not.toHaveBeenCalled();
        expect(dummy).toBe(1);
        obj.foo++;
        // trigger时执行scheduler，不执行fn
        expect(scheduler).toHaveBeenCalledTimes(1);
        expect(dummy).toBe(1);
        // 调用run时执行fn
        run();
        expect(dummy).toBe(2);
    });

    it("stop", () => {
        let dummy;
        const obj = reactive({ prop: 1 });
        const runner = effect(() => {
            dummy = obj.prop;
        });
        obj.prop = 2;
        expect(dummy).toBe(2);
        stop(runner);
        obj.prop++;
        expect(dummy).toBe(2);
        runner();
        obj.prop = 10;
        expect(dummy).toBe(3);
    });

    it("onStop", () => {
        const obj = reactive({
            foo: 1,
        });
        const onStop = jest.fn();
        let dummy;
        const runner = effect(
            () => {
                dummy = obj.foo;
            },
            {
                onStop,
            }
        );
        stop(runner);
        expect(onStop).toBeCalledTimes(1);
    });
});
