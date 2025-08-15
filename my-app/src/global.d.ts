// Allow .jsx imports in TypeScript
declare module "*.jsx" {
  import { ReactElement } from "react";
  const content: ReactElement;
  export default content;
}