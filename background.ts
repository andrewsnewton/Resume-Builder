// @ts-ignore
chrome.runtime.onInstalled.addListener(() => {
  // @ts-ignore
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error: any) => console.error('SidePanel Error:', error));
  
  console.log('ATS Resume Optimizer Extension initialized');
});