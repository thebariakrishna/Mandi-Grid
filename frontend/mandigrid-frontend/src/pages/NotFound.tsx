import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/AppShell";

export default function NotFound() {
  return (
    <div>
      <PageHeader title="Page not found" subtitle="This route doesn't exist in MandiGrid." />
      <Link to="/" className="text-sm font-medium text-grain-green underline">
        Back to Overview
      </Link>
    </div>
  );
}
