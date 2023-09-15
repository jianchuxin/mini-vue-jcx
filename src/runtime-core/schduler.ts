const jobQueue: any[] = [];
let isFlushPending = false;

export function queueJobs(fn) {
    if (!jobQueue.includes(fn)) {
        jobQueue.push(fn);
    }

    queueFlush();
}

export function nextTick(fn) {
    return fn ? Promise.resolve().then(fn) : Promise.resolve();
}
function queueFlush() {
    if (isFlushPending) return;
    isFlushPending = true;
    nextTick(flushJobs);
}
function flushJobs() {
    isFlushPending = false;
    let job: any;
    while ((job = jobQueue.shift())) {
        job && job();
    }
}
