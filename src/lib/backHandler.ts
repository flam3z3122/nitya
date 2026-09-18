type BackIntercept = () => boolean;

const intercepts: BackIntercept[] = [];

export function registerBackIntercept(fn: BackIntercept): () => void {
  intercepts.push(fn);
  return () => {
    const index = intercepts.indexOf(fn);
    if (index >= 0) intercepts.splice(index, 1);
  };
}

export function consumeNativeBack(): boolean {
  for (let index = intercepts.length - 1; index >= 0; index -= 1) {
    const handled = intercepts[index]();
    if (handled) return true;
  }
  return false;
}