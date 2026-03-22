import { Navigate, useLocation } from "react-router-dom";
import { hasPiBackendConfigured } from "../../lib/api";

export default function PiConfiguredRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  if (!hasPiBackendConfigured()) {
    return <Navigate to="/setup" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
