import React from "react";
import { useAppController } from "./hooks/useAppController";
import { ReviewImportPage } from "./components/workspace/ReviewImportPage";
import { AppShell } from "./components/layout/AppShell";
import { AppMainView } from "./components/workspace/AppMainView";
import { AppModals } from "./components/modals/AppModals";

export function App() {
  const c = useAppController();

  if (c.isReviewRoute) {
    return <ReviewImportPage {...c.reviewImportProps} />;
  }

  return (
    <AppShell {...c.shellProps}>
      <AppMainView {...c.mainViewProps} />
      <AppModals {...c.modalsProps} />
    </AppShell>
  );
}

export default App;
