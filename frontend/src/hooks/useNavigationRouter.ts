import { useEffect, useState } from "react";
import { responseIdFromPath, reviewIdFromPath } from "../utils/helpers";

function isInvalidPath(p: string): boolean {
  return (
    p === "/review" ||
    p === "/review/" ||
    p === "/response" ||
    p === "/response/" ||
    p === "/response/workspace" ||
    p === "/response/workspace/"
  );
}

export function useNavigationRouter(currentResponseId?: string | null) {
  const [route, setRoute] = useState<string>(() => {
    const p = (typeof window !== "undefined" && window.location.pathname) || "/";
    if (isInvalidPath(p)) {
      if (typeof window !== "undefined" && window.history?.replaceState) {
        window.history.replaceState({}, "", "/");
      }
      return "/";
    }
    return p;
  });

  function navigate(path: string) {
    const target = isInvalidPath(path) ? "/" : path;
    if (target === "/") {
      if (typeof window !== "undefined" && window.history?.replaceState) {
        window.history.replaceState({}, "", "/");
      }
    } else {
      window.history.pushState({}, "", target);
    }
    setRoute(target);
  }

  useEffect(() => {
    const handlePopState = () => {
      const p = (typeof window !== "undefined" && window.location.pathname) || "/";
      if (isInvalidPath(p)) {
        if (typeof window !== "undefined" && window.history?.replaceState) {
          window.history.replaceState({}, "", "/");
        }
        setRoute("/");
      } else {
        setRoute(p);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const reviewId = reviewIdFromPath(route);
  const isReviewRoute = (route.startsWith("/review/") && Boolean(reviewId)) || route === "/import";
  const activeResponseId =
    responseIdFromPath(route) ||
    reviewId ||
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
