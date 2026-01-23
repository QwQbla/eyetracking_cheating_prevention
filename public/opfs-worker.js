// public/opfs-worker.js

let fileHandle = null;
let writable = null;

self.onmessage = async (e) => {
    const { type, payload } = e.data;

    try {
        if (type === 'INIT') {
            // 1. 获取 OPFS 根目录
            const root = await navigator.storage.getDirectory();
            // 2. 创建/打开文件 (以房间号命名)
            const fileName = `interview_rec_${payload.roomId}.webm`;
            fileHandle = await root.getFileHandle(fileName, { create: true });
            // 3. 创建写入流
            writable = await fileHandle.createWritable();
            self.postMessage({ type: 'READY' });

        } else if (type === 'WRITE') {
            // 写入视频切片
            if (writable && payload.chunk) {
                await writable.write(payload.chunk);
            }

        } else if (type === 'STOP') {
            // 关闭文件
            if (writable) {
                await writable.close();
                writable = null;
                fileHandle = null;
                self.postMessage({ type: 'FINISHED' });
            }
        }
    } catch (err) {
        console.error('OPFS Worker Error:', err);
        self.postMessage({ type: 'ERROR', payload: err.message });
    }
};