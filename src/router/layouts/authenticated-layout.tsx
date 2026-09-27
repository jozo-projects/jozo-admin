import { Suspense } from "react";
import { Outlet } from "@tanstack/react-router";
import Layout from "@/components/Layout/Layout";
import { RouterLoading } from "../router-boundaries";

export default function AuthenticatedLayout() {
  return (
    <Layout>
      <Suspense fallback={<RouterLoading />}>
        <Outlet />
      </Suspense>
    </Layout>
  );
}
