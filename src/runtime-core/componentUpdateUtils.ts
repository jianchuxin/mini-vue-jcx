export function shouldUpdateComponent(prevVNode, nextVNode) {
    const { props: prevProps } = prevVNode;
    const { props: nextProps } = nextVNode;

    for (let key in prevProps) {
        if (prevProps[key] !== nextProps[key]) {
            return true;
        }
    }

    return false;
}
