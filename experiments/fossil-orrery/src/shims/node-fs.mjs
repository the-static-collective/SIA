// @ts-nocheck
const deny = () => {
  throw new Error("The browser vault does not touch a filesystem. Import and export stay in your hands.");
};
export const readFile = deny;
export const writeFile = deny;
export const mkdir = deny;
export const readdir = deny;
export const stat = deny;
