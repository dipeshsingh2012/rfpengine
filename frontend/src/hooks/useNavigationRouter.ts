import { useEffect, useState } from "react";
import { responseIdFromPath, reviewIdFromPath } from "../utils/helpers";

export function useNavigationRouter(currentResponseId?: string | null) {
  const [route, setRoute] = useState<string>(() => window.location.pathname || "/");

  function navigate(path: string) {
    window.history.pushState({}, "", path);
    setRoute(path);
  }

  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname || "/");
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const isReviewRoute = route.startsWith("/review/") || route === "/import";
  const activeResponseId =
    responseIdFromPath(route) ||
    reviewIdFromPath(route) ||
    currentResponseId ||
    "";

  return {
    route,
    setRoute,
    navigate,
    isReviewRoute,
    activeResponseId,
  };
}
