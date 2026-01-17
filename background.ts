// @ts-ignore
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error: any) => console.error(error));

// Optional: Listener for installation or update
// @ts-ignore
chrome.runtime.onInstalled.addListener(() => {
  console.log('ATS Resume Optimizer Extension installed');
});
