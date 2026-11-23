import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/producto.tsx"),
  route("asesor", "routes/demo.tsx"),
  route("scan", "routes/scan.tsx"),
  route("producto", "routes/producto-redirect.tsx"),
] satisfies RouteConfig;
