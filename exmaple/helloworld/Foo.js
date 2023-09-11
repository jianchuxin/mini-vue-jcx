import { getCurrentInstance, h, renderSlots } from "../../lib/mini-vue.esm.js";
export const Foo = {
    name: "Foo",
    render() {
        const para = h("p", { class: "" });
        const btn = h("button", { onClick: this.btnClick }, "click");

        // 插槽传入的元素，使用 this.$slots 来获取
        console.log(this.$slots);
        const age = 21;
        return h("div", { class: "foo" }, [
            renderSlots(this.$slots, "header", { age }),
            para,
            btn,
            renderSlots(this.$slots, "footer", { age }),
        ]);
    },
    setup(props, { emit }) {
        // 获取当前组件实例
        const instance = getCurrentInstance();
        console.log(instance);
        // const { count } = props;
        // props.count = 888;

        return {
            msg: "jianchuxin",
            btnClick: () => {
                console.log("onClick");
                emit("add-one", 1, 2); // 传入事件名
            },
        };
    },
};
