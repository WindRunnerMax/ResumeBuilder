export const IS_DEV = process.env.NODE_ENV === "development";
export const IS_PROD = process.env.NODE_ENV === "production";

const CHARTS = "QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm0123456789";

export const getUniqueId = (len = 10) => {
  const chars = new Array(len - 1).fill("");
  return (
    CHARTS[Math.floor(Math.random() * 52)] +
    chars.map(() => CHARTS[Math.floor(Math.random() * CHARTS.length)]).join("")
  );
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export const promisify = <T>(fn: (...args: any[]) => T) => {
  return (...args: any[]) =>
    new Promise<unknown>((resolve, reject) => {
      (fn as any)(...args, (err: Error | null, res: unknown) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
};
