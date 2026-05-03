import { formatToday } from "./display-helpers.js";
import type { BranchId, PmsGuestRecord } from "../types.js";
import type { TemplateDefinition } from "../catalog/template-types.js";

export type TemplateDraftValues = Record<string, Record<string, string>>;

export type TemplateValueContext = {
  branchOptions: Array<{ id: BranchId; label: string }>;
  selectedBranchId: BranchId | "";
  selectedPmsRecord: PmsGuestRecord | null;
  templateDraftValues: TemplateDraftValues;
};

export function createDefaultTemplateValues({
  branchOptions,
  selectedBranchId,
  selectedPmsRecord,
}: TemplateValueContext): Record<string, string> {
  const branchLabel =
    branchOptions.find((branch) => branch.id === selectedBranchId)?.label || "";
  return {
    ...(selectedPmsRecord?.templateValues || {}),
    reportDate: formatToday(),
    branchName: branchLabel,
    hotelName: branchLabel,
    guestName: selectedPmsRecord?.guestName || "",
    roomNo: selectedPmsRecord?.displayRoom || selectedPmsRecord?.roomNo || "",
    roomType: selectedPmsRecord?.templateValues.roomType || "",
    roomTypeName: selectedPmsRecord?.templateValues.roomTypeName || "",
    checkInTime: "",
    checkOutTime: "",
    frontDeskLocation: "",
    hotelAddress: "",
    representativePhone: "",
    emergencyContact: "",
    rentalItemName: "",
    lostItemName: "",
    visitTime: "",
    expectedArrivalTime: "",
    selfCheckinTime: "",
    entranceLockTime: "",
    entrancePassword: "",
    keyStorageLocation: "",
    roomNumberCheckMethod: "",
    parkingAvailability: "",
    parkingAppName: "",
    walkingDistance: "",
    replyDeadlineCondition: "",
    staffName: "",
    count: "",
    items: "",
    direction: "",
    useDateTime: "",
    dispatchNo: "",
    courseName: "",
    status: "",
  };
}

export function createTemplateValues(
  template: TemplateDefinition,
  context: TemplateValueContext,
): Record<string, string> {
  return {
    ...createDefaultTemplateValues(context),
    ...(context.templateDraftValues[template.id] || {}),
  };
}

export function getTemplateDraftValue(
  templateDraftValues: TemplateDraftValues,
  templateId: string,
  variableName: string,
): string {
  return templateDraftValues[templateId]?.[variableName] || "";
}

export function getTemplateInputValue(
  template: TemplateDefinition,
  variableName: string,
  context: TemplateValueContext,
): string {
  return (
    context.templateDraftValues[template.id]?.[variableName] ||
    createDefaultTemplateValues(context)[variableName] ||
    ""
  );
}

export function updateTemplateDraftValue(
  templateDraftValues: TemplateDraftValues,
  templateId: string,
  variableName: string,
  value: string,
): TemplateDraftValues {
  return {
    ...templateDraftValues,
    [templateId]: {
      ...(templateDraftValues[templateId] || {}),
      [variableName]: value,
    },
  };
}
