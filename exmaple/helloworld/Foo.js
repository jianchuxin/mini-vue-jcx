import { h } from "../../lib/mini-vue.esm.js";
export const Foo = {
    render() {
        const para = h("p", { class: "" });
        const btn = h("button", { onClick: this.btnClick }, "click");
        return h("div", { class: "foo" }, [para, btn]);
    },
    setup(props, { emit }) {
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
