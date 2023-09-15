export function getSequence(arr) {
    const p = [];
    const result = [0]; //  存储最长增长子序列的索引数组
    let i, j, start, end, mid;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                //  如果arr[i] > arr[j], 当前值比最后一项还大，可以直接push到索引数组(result)中去
                p[i] = j; //  p记录的当前位置下，前一项的索引值
                result.push(i);
                continue;
            }
            // 二分法查找和arrI值接近的数
            start = 0;
            end = result.length - 1;
            while (start < end) {
                mid = ((start + end) / 2) | 0;
                if (arr[result[mid]] < arrI) {
                    start = mid + 1;
                } else {
                    end = mid;
                }
            }
            if (arrI < arr[result[start]]) {
                if (start > 0) {
                    p[i] = result[start - 1]; // 记录当前位置下，替换位置的前一项的索引值
                }
                // 替换该值
                result[start] = i;
            }
        }
    }
    // 通过数组p，修正最长递增子序列对应的值
    start = result.length;
    end = result[start - 1];
    while (start-- > 0) {
        result[start] = end;
        end = p[end];
    }
    return result;
}
