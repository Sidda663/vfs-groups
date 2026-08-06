export const sendData = (response, data, status = 200, meta) => response.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });
