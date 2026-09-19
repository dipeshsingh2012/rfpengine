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
    let p = (typeof window !== "undefined" && window.location.pathname) || "/";
    if (p === "/admin" || p === "/admin/") {
      if (typeof window !== "undefined" && window.history?.replaceState) {
        window.history.replaceState({}, "", "/settings");
      }
      return "/settings";
    }
    if (isInvalidPath(p)) {
      if (typeof window !== "undefined" && window.history?.replaceState) {
        window.history.replaceState({}, "", "/");
      }
      return "/";
    }
    return p;
  });

  function navigate(path: string) {
    let target = path;
    if (target === "/admin" || target === "/admin/") {
      target = "/settings";
    }
    target = isInvalidPath(target) ? "/" : target;
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
      let p = (typeof window !== "undefined" && window.location.pathname) || "/";
      if (p === "/admin" || p === "/admin/") {
        p = "/settings";
        if (typeof window !== "undefined" && window.history?.replaceState) {
          window.history.replaceState({}, "", "/settings");
        }
      }
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
  const isSettingsRoute = route === "/settings" || route === "/admin";
  const isAdminRoute = isSettingsRoute;
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
    isSettingsRoute,
    isAdminRoute,
    activeResponseId,
  };
}
