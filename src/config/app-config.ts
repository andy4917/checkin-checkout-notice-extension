export const EXTENSION_CONFIG = Object.freeze({
  sidePanelPath: "sidepanel.html",
  allowedPmsOrigins: ["https://pms.sanhait.com"],
  allowedOtaOrigins: [
    "https://partner.booking.naver.com",
    "https://admin.admin-stationbyuhc.com",
    "https://api.admin-stationbyuhc.com",
  ],
  installLogMessage: "PMS 어시스턴트가 설치되었습니다.",
  sidePanelSetupErrorMessage: "SidePanel 설정 에러:",
});

export const UI_CONFIG = Object.freeze({
  defaultTab: "ARRIVAL",
  noAssignedRoomLabel: "배정전",
  supportedLanguages: ["KO", "EN", "JP", "CN"],
  fallbackLanguage: "EN",
} as const);

export const HOTEL_CONFIG = Object.freeze({
  brandName: "UH Suite The COEX",
  roomTowerCutover: 1301,
  roomTowerOffset: 1000,
});

export const PMS_CONFIG = Object.freeze({
  endpointPath: "/pms/biz/ir04_0100X/searchListGlobalRsvn_v03.do",
  requestDefaults: {
    take: "300",
    skip: "0",
    page: "1",
    pageSize: "300",
    pageId: "IR04_0100X_V03",
    authPassYn: "N",
  },
  status: {
    reservationStatusCode: "RR,RN,RC,RW,CI,CO,CH,",
    reservationStatusGroups: ["RR,RN,RC,RW", "CI", "CO,CH"],
    typeCode: "RR",
    typeCodeGroups: ["RR"],
    individualGroupCode: "F,G,",
    individualGroupGroups: ["F", "G"],
    displayOption: "TTL",
  },
});
