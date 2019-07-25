// Platform detection method
export function isBrowser() {
  if (
    typeof process !== "undefined" &&
    process.execPath &&
    process.execPath.match(/node|iojs/)
  ) {
    return false;
  }
  return true;
}

export function deprecated(message: any) {
  //TODO:need refactor
  //   if (exports.isBrowser()) {
  //     if (window.NOFLO_FATAL_DEPRECATED) {
  //       throw new Error(message);
  //     }
  //     console.warn(message);
  //     return;
  //   }
  if (process.env.NOFLO_FATAL_DEPRECATED) {
    throw new Error(message);
  }
  return console.warn(message);
}
