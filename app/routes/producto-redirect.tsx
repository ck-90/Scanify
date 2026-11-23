import { redirect } from "react-router";

/** La PDP ahora vive en `/`; se mantiene `/producto` para enlaces ya compartidos. */
export const loader = () => redirect("/", 301);
